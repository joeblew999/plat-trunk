#!/usr/bin/env bun
/**
 * Generate and query versions.json for the GUI version picker.
 *
 * Subcommands:
 *   (none)        — Generate web/gui/versions.json from wrangler + git metadata
 *   --latest      — Print latest version info as JSON
 *   --latest-env  — Print latest version as shell variables (eval-able by deploy:promote)
 *
 * Env (set by Taskfile):
 *   WORKER_DIR  — path to systems/truck/worker (for wrangler)
 *   ROOT_DIR    — repo root
 *   CAD_VERSION — current version from cad-schema.json
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// --- Types (shared contract for versions.json) ---

export interface Release {
  version: string;
  tag: string;
  date: string;
  versionId: string;
  url: string;
  commitSha?: string;
  commitMessage?: string;
  commandCount?: number;
}

export interface Preview {
  label: string;
  tag: string;
  date: string;
  versionId: string;
  url: string;
}

export interface VersionsJson {
  production: string;
  versions: Release[];
  previews: Preview[];
}

// --- Paths ---

const ROOT_DIR =
  process.env.ROOT_DIR || execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const WORKER_DIR = process.env.WORKER_DIR || join(ROOT_DIR, "systems/truck/worker");
const schemaPath = join(ROOT_DIR, "web/cad-schema.json");
const outPath = join(ROOT_DIR, "web/gui/versions.json");

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
  console.log(`COMMIT_SHA="${latest.commitSha || "?"}"`);
  console.log(`COMMIT_MSG="${(latest.commitMessage || "").replace(/"/g, '\\"')}"`);
  console.log(`COMMAND_COUNT="${latest.commandCount || 0}"`);
  console.log(`PREVIEW_URL="${latest.url}"`);
  process.exit(0);
}

// --- Generate versions.json ---

const commitSha = execSync("git rev-parse --short HEAD", { cwd: ROOT_DIR, encoding: "utf8" }).trim();
const commitMessage = execSync("git log -1 --format=%s", { cwd: ROOT_DIR, encoding: "utf8" }).trim();
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const CAD_VERSION: string = process.env.CAD_VERSION || schema.version;
const commandCount = Object.keys(schema.commands).length;

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
    previews.push({
      label: `PR #${v.tag.replace("pr-", "")}`,
      tag: v.tag,
      date: v.created,
      versionId: v.versionId,
      url: `https://${v.tag}-truck-cad.gedw99.workers.dev`,
    });
  } else if (/^v\d/.test(v.tag)) {
    const ver = v.tag.replace("v", "");
    const slug = ver.replaceAll(".", "-");
    const entry: Release = {
      version: ver,
      tag: v.tag,
      date: v.created,
      versionId: v.versionId,
      url: `https://v${slug}-truck-cad.gedw99.workers.dev`,
    };
    if (ver === CAD_VERSION) {
      entry.commitSha = commitSha;
      entry.commitMessage = commitMessage;
      entry.commandCount = commandCount;
    }
    releases.push(entry);
  }
}

// Dedupe by version (keep latest), sort descending
const deduped = [...new Map(releases.map((r) => [r.version, r])).values()];
deduped.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

// Ensure current version is present
if (!deduped.find((v) => v.version === CAD_VERSION)) {
  const slug = CAD_VERSION.replaceAll(".", "-");
  deduped.unshift({
    version: CAD_VERSION,
    tag: `v${CAD_VERSION}`,
    date: new Date().toISOString(),
    versionId: "",
    url: `https://v${slug}-truck-cad.gedw99.workers.dev`,
    commitSha,
    commitMessage,
    commandCount,
  });
}

const out: VersionsJson = { production: "https://cad.ubuntusoftware.net", versions: deduped, previews };
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`versions.json: ${deduped.length} versions, ${previews.length} PR previews`);
