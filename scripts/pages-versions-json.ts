#!/usr/bin/env bun
/**
 * Generate docs-versions.json for the docs version picker / audit trail.
 *
 * Parallel to versions-json.ts (Worker versions), but for Cloudflare Pages.
 * Pages uses branch-based deployments instead of Worker version IDs.
 *
 * Subcommands:
 *   (none)        — Generate docs-versions.json from wrangler + git metadata
 *   --latest      — Print latest version info as JSON
 *   --latest-env  — Print latest version as shell variables (eval-able)
 *
 * Env (set by Taskfile):
 *   ROOT_DIR         — repo root
 *   PAGES_PROJECT    — Cloudflare Pages project name (default: cad-docs)
 *   APP_VERSION      — current app version (falls back to SCHEMA_FILE .version)
 *   SCHEMA_FILE      — path to JSON file with .version (default: web/cad-schema.json)
 *   OUTPUT_FILE      — output path (default: website/docs-versions.json)
 *   PRODUCTION_URL   — production URL (default: https://docs.ubuntusoftware.net)
 *   GITHUB_REPO      — owner/repo (default: joeblew999/plat-trunk)
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// --- Types ---

interface GitInfo {
  commitSha: string;
  commitFull: string;
  commitMessage: string;
  branch: string;
  commitUrl: string;
}

interface DocsRelease {
  version: string;
  tag: string;
  date: string;
  deploymentId: string;
  url: string;          // branch alias URL (e.g. v0-7-0.cad-docs.pages.dev)
  deploymentUrl: string; // immutable URL (e.g. abc123.cad-docs.pages.dev)
  git?: GitInfo;
}

interface DocsPreview {
  label: string;
  tag: string;
  date: string;
  deploymentId: string;
  url: string;
}

interface DocsVersionsJson {
  production: string;
  github: string;
  generated: string;
  versions: DocsRelease[];
  previews: DocsPreview[];
}

// --- Config ---

const PAGES_PROJECT = process.env.PAGES_PROJECT || "cad-docs";
const PRODUCTION_URL = process.env.PRODUCTION_URL || "https://docs.ubuntusoftware.net";
const GITHUB_REPO = process.env.GITHUB_REPO || "joeblew999/plat-trunk";

const pagesUrl = (branch: string) => `https://${branch}.${PAGES_PROJECT}.pages.dev`;

// --- Paths ---

const ROOT_DIR =
  process.env.ROOT_DIR || execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const schemaPath = process.env.SCHEMA_FILE || join(ROOT_DIR, "web/cad-schema.json");
const outPath = process.env.OUTPUT_FILE || join(ROOT_DIR, "website/docs-versions.json");

// --- Subcommand: --latest ---

if (process.argv.includes("--latest")) {
  const data: DocsVersionsJson = JSON.parse(readFileSync(outPath, "utf8"));
  const latest = data.versions[0];
  if (!latest) {
    console.error("No versions found in docs-versions.json");
    process.exit(1);
  }
  console.log(JSON.stringify(latest));
  process.exit(0);
}

// --- Subcommand: --latest-env ---

if (process.argv.includes("--latest-env")) {
  const data: DocsVersionsJson = JSON.parse(readFileSync(outPath, "utf8"));
  const latest = data.versions[0];
  if (!latest) {
    console.error("No versions found in docs-versions.json");
    process.exit(1);
  }
  console.log(`VERSION="${latest.version}"`);
  console.log(`DEPLOYMENT_ID="${latest.deploymentId}"`);
  console.log(`COMMIT_SHA="${latest.git?.commitSha || "?"}"`);
  console.log(`DEPLOYMENT_URL="${latest.deploymentUrl}"`);
  console.log(`ALIAS_URL="${latest.url}"`);
  process.exit(0);
}

// --- Generate docs-versions.json ---

// Git metadata
const commitSha = execSync("git rev-parse --short HEAD", { cwd: ROOT_DIR, encoding: "utf8" }).trim();
const commitFull = execSync("git rev-parse HEAD", { cwd: ROOT_DIR, encoding: "utf8" }).trim();
const commitMessage = execSync("git log -1 --format=%s", { cwd: ROOT_DIR, encoding: "utf8" }).trim();
const branch = execSync("git branch --show-current", { cwd: ROOT_DIR, encoding: "utf8" }).trim();

const gitInfo: GitInfo = {
  commitSha,
  commitFull,
  commitMessage,
  branch,
  commitUrl: `https://github.com/${GITHUB_REPO}/commit/${commitFull}`,
};

// App version (from schema, same source as Worker)
let appVersion: string = process.env.APP_VERSION || "";
if (!appVersion && existsSync(schemaPath)) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  appVersion = schema.version || "0.0.0";
}
if (!appVersion) appVersion = "0.0.0";

// Parse wrangler pages deployment list (table format)
const raw = execSync(`bun x wrangler pages deployment list --project-name=${PAGES_PROJECT} 2>&1`, {
  cwd: ROOT_DIR,
  encoding: "utf8",
});

interface PagesDeploy {
  id: string;
  environment: string;
  branch: string;
  source: string;
  deploymentUrl: string;
}

const deploys: PagesDeploy[] = [];
for (const line of raw.split("\n")) {
  // Match table rows: │ id │ env │ branch │ source │ url │ ...
  const match = line.match(
    /│\s*([0-9a-f-]{36})\s*│\s*(\w+)\s*│\s*(\S+)\s*│\s*(\S+)\s*│\s*(https:\/\/\S+)\s*│/
  );
  if (match) {
    deploys.push({
      id: match[1],
      environment: match[2],
      branch: match[3],
      source: match[4],
      deploymentUrl: match[5],
    });
  }
}

// Build releases + previews from deployments
const releases: DocsRelease[] = [];
const previews: DocsPreview[] = [];

for (const d of deploys) {
  if (d.branch.startsWith("pr-")) {
    previews.push({
      label: `PR #${d.branch.replace("pr-", "")}`,
      tag: d.branch,
      date: new Date().toISOString(), // wrangler doesn't give exact timestamp in table
      deploymentId: d.id,
      url: pagesUrl(d.branch),
    });
  } else if (/^v\d/.test(d.branch)) {
    const ver = d.branch.replace(/^v/, "").replaceAll("-", ".");
    releases.push({
      version: ver,
      tag: `v${ver}`,
      date: new Date().toISOString(),
      deploymentId: d.id,
      url: pagesUrl(d.branch),
      deploymentUrl: d.deploymentUrl,
    });
  }
}

// Dedupe by version (keep first = latest), sort descending
const deduped = [...new Map(releases.map((r) => [r.version, r])).values()];
deduped.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

// Ensure current version is present (even if not yet deployed)
const versionSlug = appVersion.replaceAll(".", "-");
if (!deduped.find((v) => v.version === appVersion)) {
  deduped.unshift({
    version: appVersion,
    tag: `v${appVersion}`,
    date: new Date().toISOString(),
    deploymentId: "",
    url: pagesUrl(`v${versionSlug}`),
    deploymentUrl: "",
    git: gitInfo,
  });
} else {
  // Attach git info to current version
  const current = deduped.find((v) => v.version === appVersion);
  if (current) current.git = gitInfo;
}

// Dedupe previews
const dedupedPreviews = [...new Map(previews.map((p) => [p.tag, p])).values()];

const out: DocsVersionsJson = {
  production: PRODUCTION_URL,
  github: `https://github.com/${GITHUB_REPO}`,
  generated: new Date().toISOString(),
  versions: deduped,
  previews: dedupedPreviews,
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`docs-versions.json: ${deduped.length} versions, ${dedupedPreviews.length} PR previews · ${commitSha} · ${branch}`);
