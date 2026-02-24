#!/usr/bin/env bun
/**
 * Generate and query versions.json for the GUI version picker.
 *
 * Reusable across Cloudflare Worker projects — all project-specific
 * values come from env vars with sensible defaults.
 *
 * Subcommands:
 *   (none)        — Generate versions.json from wrangler + git metadata
 *   --latest      — Print latest version info as JSON
 *   --latest-env  — Print latest version as shell variables (eval-able by deploy:promote)
 *
 * Env (set by Taskfile):
 *   WORKER_DIR      — path to worker directory (for wrangler)
 *   ROOT_DIR        — repo root
 *   APP_VERSION     — current app version (falls back to SCHEMA_FILE .version)
 *   SCHEMA_FILE     — path to JSON file with .version + optional .commands (default: web/cad-schema.json)
 *   OUTPUT_FILE     — output path for versions.json (default: web/gui/versions.json)
 *   WORKER_NAME     — Cloudflare Worker name (default: truck-cad)
 *   WORKER_DOMAIN   — workers.dev subdomain (default: gedw99.workers.dev)
 *   PRODUCTION_URL  — production URL (default: https://cad.ubuntusoftware.net)
 *   GITHUB_REPO     — owner/repo for GitHub Releases link (default: joeblew999/plat-trunk)
 *   HEALTH_CHECK    — set to "1" to health-check preview URLs (default: off)
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// --- Types (shared contract for versions.json) ---

export interface GitInfo {
  commitSha: string;
  commitFull: string;
  commitMessage: string;
  branch: string;
  commitUrl: string;
}

export interface Release {
  version: string;
  tag: string;
  date: string;
  versionId: string;
  url: string;        // alias URL (e.g. v0-7-0-myapp...) — latest upload for this tag
  previewUrl: string;  // immutable URL (e.g. cf3bdf37-myapp...) — this exact upload
  healthy?: boolean;   // true if previewUrl responded to health check
  git?: GitInfo;
  commandCount?: number;
}

export interface Preview {
  label: string;
  tag: string;
  date: string;
  versionId: string;
  url: string;
  healthy?: boolean;
}

export interface VersionsJson {
  production: string;
  github: string;
  generated: string;
  versions: Release[];
  previews: Preview[];
}

// --- Config (all project-specific values come from env, with defaults) ---

const WORKER_NAME = process.env.WORKER_NAME || "truck-cad";
const WORKER_DOMAIN = process.env.WORKER_DOMAIN || "gedw99.workers.dev";
const PRODUCTION_URL = process.env.PRODUCTION_URL || "https://cad.ubuntusoftware.net";
const GITHUB_REPO = process.env.GITHUB_REPO || "joeblew999/plat-trunk";
const HEALTH_CHECK = process.env.HEALTH_CHECK === "1";

/** Build a Workers preview/alias URL: https://{prefix}-{workerName}.{domain} */
const workerUrl = (prefix: string) => `https://${prefix}-${WORKER_NAME}.${WORKER_DOMAIN}`;

// --- Paths ---

const ROOT_DIR =
  process.env.ROOT_DIR || execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const WORKER_DIR = process.env.WORKER_DIR || join(ROOT_DIR, "systems/truck/worker");
const schemaPath = process.env.SCHEMA_FILE || join(ROOT_DIR, "web/cad-schema.json");
const outPath = process.env.OUTPUT_FILE || join(ROOT_DIR, "web/gui/versions.json");

// --- Health check (from remy-sport) ---

async function checkHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Subcommand: --latest (JSON) ---

if (process.argv.includes("--latest")) {
  const data: VersionsJson = JSON.parse(readFileSync(outPath, "utf8"));
  const latest = data.versions[0];
  if (!latest) {
    console.error("No versions found in versions.json");
    process.exit(1);
  }
  console.log(JSON.stringify(latest));
  process.exit(0);
}

// --- Subcommand: --latest-env (shell-eval-able) ---

if (process.argv.includes("--latest-env")) {
  const data: VersionsJson = JSON.parse(readFileSync(outPath, "utf8"));
  const latest = data.versions[0];
  if (!latest) {
    console.error("No versions found in versions.json");
    process.exit(1);
  }
  console.log(`VERSION_ID="${latest.versionId}"`);
  console.log(`VERSION="${latest.version}"`);
  console.log(`COMMIT_SHA="${latest.git?.commitSha || "?"}"`);
  console.log(`COMMIT_MSG="${(latest.git?.commitMessage || "").replace(/"/g, '\\"')}"`);
  console.log(`COMMAND_COUNT="${latest.commandCount || 0}"`);
  console.log(`PREVIEW_URL="${latest.previewUrl || latest.url}"`);
  console.log(`ALIAS_URL="${latest.url}"`);
  process.exit(0);
}

// --- Generate versions.json ---

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

// App version + optional command count (from schema file or package.json)
let appVersion: string = process.env.APP_VERSION || "";
let commandCount: number | undefined;

if (!appVersion && existsSync(schemaPath)) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  appVersion = schema.version || "0.0.0";
  if (schema.commands) {
    commandCount = Object.keys(schema.commands).length;
  }
}
if (!appVersion) appVersion = "0.0.0";

// Parse wrangler versions list
interface WranglerVersion {
  versionId: string;
  created: string;
  tag: string;
}

const raw = execSync("bun x wrangler versions list 2>&1", { cwd: WORKER_DIR, encoding: "utf8" });
const wranglerVersions: WranglerVersion[] = [];
let cur: Partial<WranglerVersion> = {};

for (const line of raw.split("\n")) {
  const idMatch = line.match(/^Version ID:\s+(.+)/);
  const createdMatch = line.match(/^Created:\s+(.+)/);
  const tagMatch = line.match(/^Tag:\s+(.+)/);

  if (idMatch) {
    cur = { versionId: idMatch[1].trim() };
  } else if (createdMatch && cur.versionId) {
    cur.created = createdMatch[1].trim();
  } else if (tagMatch && cur.versionId) {
    cur.tag = tagMatch[1].trim();
    if (cur.tag !== "-" && cur.created) {
      wranglerVersions.push(cur as WranglerVersion);
    }
    cur = {};
  }
}

// Build releases + previews
const releases: Release[] = [];
const previews: Preview[] = [];

for (const v of wranglerVersions) {
  if (v.tag.startsWith("pr-")) {
    const preview: Preview = {
      label: `PR #${v.tag.replace("pr-", "")}`,
      tag: v.tag,
      date: v.created,
      versionId: v.versionId,
      url: workerUrl(v.tag),
    };
    previews.push(preview);
  } else if (/^v\d/.test(v.tag)) {
    const ver = v.tag.replace("v", "");
    const slug = ver.replaceAll(".", "-");
    const entry: Release = {
      version: ver,
      tag: v.tag,
      date: v.created,
      versionId: v.versionId,
      url: workerUrl(`v${slug}`),
      previewUrl: workerUrl(v.versionId),
    };
    if (ver === appVersion) {
      entry.git = gitInfo;
      entry.commandCount = commandCount;
    }
    releases.push(entry);
  }
}

// Dedupe by version (keep latest), sort descending
const deduped = [...new Map(releases.map((r) => [r.version, r])).values()];
deduped.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

// Ensure current version is present
if (!deduped.find((v) => v.version === appVersion)) {
  const slug = appVersion.replaceAll(".", "-");
  deduped.unshift({
    version: appVersion,
    tag: `v${appVersion}`,
    date: new Date().toISOString(),
    versionId: "",
    url: workerUrl(`v${slug}`),
    previewUrl: "",
    git: gitInfo,
    commandCount,
  });
}

// Optional: health-check preview URLs
if (HEALTH_CHECK) {
  console.log("Health-checking preview URLs...");
  await Promise.all([
    ...deduped.map(async (r) => {
      if (r.previewUrl) r.healthy = await checkHealth(r.previewUrl);
    }),
    ...previews.map(async (p) => {
      p.healthy = await checkHealth(p.url);
    }),
  ]);
  const healthyCount = deduped.filter((r) => r.healthy).length + previews.filter((p) => p.healthy).length;
  console.log(`  ${healthyCount}/${deduped.length + previews.length} URLs healthy`);
}

const out: VersionsJson = {
  production: PRODUCTION_URL,
  github: `https://github.com/${GITHUB_REPO}`,
  generated: new Date().toISOString(),
  versions: deduped,
  previews,
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`versions.json: ${deduped.length} versions, ${previews.length} PR previews · ${commitSha} · ${branch}`);
