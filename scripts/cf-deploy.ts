#!/usr/bin/env bun
/**
 * cf-deploy — Cloudflare Workers deploy lifecycle CLI.
 *
 * Single-file CLI that reads cf-deploy.json for all config.
 * Manages: truck-cad Worker (versioned) + docs-worker (static assets).
 *
 * Usage:
 *   bun scripts/cf-deploy.ts versions                  # Generate cf-versions.json (both workers)
 *   bun scripts/cf-deploy.ts upload [--target docs]    # Upload new Worker version
 *   bun scripts/cf-deploy.ts promote [--target docs]   # Promote latest to 100% traffic
 *   bun scripts/cf-deploy.ts rollback [--target docs]  # Roll back to previous version
 *   bun scripts/cf-deploy.ts smoke [URL] [--target docs] # Smoke test a deployed URL
 *   bun scripts/cf-deploy.ts release-notes              # Markdown for GitHub releases
 *   bun scripts/cf-deploy.ts readme-urls                # URL table for README
 *   bun scripts/cf-deploy.ts status [--env]             # Current deployment info
 *   bun scripts/cf-deploy.ts list                       # All versions + previews
 *   bun scripts/cf-deploy.ts config [path]              # Read config value
 *   bun scripts/cf-deploy.ts verify                     # Audit for stale hardcodes
 *   bun scripts/cf-deploy.ts whoami [--target docs]     # Cloudflare auth info
 *
 * See ADR-0022 (v2) for design rationale.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

// ============================================================================
// Config
// ============================================================================

const CURRENT_CONFIG_VERSION = 1;

interface Config {
  worker: { name: string; domain: string; dir: string; production: string };
  docs?: { name: string; domain: string; dir: string; production: string };
  local: { worker: string; docs?: string };
  account: string;
  github: string;
  version: { source: string };
  output: string;
  endpoints: Record<string, string>;
  r2?: { pages?: string; documents?: string };
  smoke?: { extra?: string };
  configVersion?: number;
}

/** Required top-level keys — fail fast if config is missing fields */
const REQUIRED_KEYS: (keyof Config)[] = [
  "worker", "local", "account", "github", "version", "output", "endpoints",
];

function loadConfig(rootDir: string): Config {
  const configPath = join(rootDir, "cf-deploy.json");
  if (!existsSync(configPath)) {
    console.error(`ERROR: cf-deploy.json not found at ${configPath}`);
    process.exit(1);
  }
  const cfg: Config = JSON.parse(readFileSync(configPath, "utf8"));

  // Validate required keys
  const missing = REQUIRED_KEYS.filter((k) => !(k in cfg));
  if (missing.length) {
    console.error(`ERROR: cf-deploy.json missing required keys: ${missing.join(", ")}`);
    console.error(`  Expected configVersion: ${CURRENT_CONFIG_VERSION}`);
    process.exit(1);
  }

  // Warn on version mismatch (non-fatal — lets old configs still work)
  if (cfg.configVersion && cfg.configVersion > CURRENT_CONFIG_VERSION) {
    console.error(`WARN: cf-deploy.json configVersion ${cfg.configVersion} > expected ${CURRENT_CONFIG_VERSION}`);
    console.error(`  Update scripts/cf-deploy.ts to match.`);
  }

  return cfg;
}

function getRootDir(): string {
  return process.env.ROOT_DIR || execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}

// ============================================================================
// Target Resolution — maps --target flag to config section
// ============================================================================

type TargetName = "worker" | "docs";
type TargetConfig = { name: string; domain: string; dir: string; production: string };

function resolveTarget(cfg: Config, args: string[]): { targetName: TargetName; target: TargetConfig } {
  const targetIdx = args.indexOf("--target");
  let targetName: TargetName = "worker";

  if (targetIdx !== -1 && args[targetIdx + 1]) {
    const raw = args[targetIdx + 1];
    if (raw === "worker" || raw === "truck" || raw === "truck-cad") {
      targetName = "worker";
    } else if (raw === "docs" || raw === "docs-worker") {
      targetName = "docs";
    } else {
      console.error(`ERROR: Unknown target '${raw}'. Valid: worker, docs`);
      process.exit(1);
    }
  }

  const target = targetName === "worker" ? cfg.worker : cfg.docs;
  if (!target) {
    console.error(`ERROR: Target '${targetName}' not configured in cf-deploy.json`);
    process.exit(1);
  }

  return { targetName, target: target as TargetConfig };
}

/** Strip --target and its value from args so they don't interfere with positional args */
function stripTargetFlag(args: string[]): string[] {
  const idx = args.indexOf("--target");
  if (idx === -1) return args;
  return [...args.slice(0, idx), ...args.slice(idx + 2)];
}

// ============================================================================
// Version + Git Metadata
// ============================================================================

interface GitInfo {
  commitSha: string;
  commitFull: string;
  commitMessage: string;
  branch: string;
  commitUrl: string;
}

function getGitInfo(rootDir: string, githubRepo: string): GitInfo {
  const run = (cmd: string) => execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
  const commitFull = run("git rev-parse HEAD");
  return {
    commitSha: run("git rev-parse --short HEAD"),
    commitFull,
    commitMessage: run("git log -1 --format=%s"),
    branch: run("git branch --show-current"),
    commitUrl: `https://github.com/${githubRepo}/commit/${commitFull}`,
  };
}

function readAppVersion(rootDir: string, source: string): { version: string; commandCount?: number } {
  const schemaPath = resolve(rootDir, source);
  if (!existsSync(schemaPath)) return { version: "0.0.0" };
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  return {
    version: schema.version || "0.0.0",
    commandCount: schema.commands ? Object.keys(schema.commands).length : undefined,
  };
}

// ============================================================================
// Manifest Types
// ============================================================================

interface VersionEntry {
  version: string;
  tag: string;
  date: string;
  worker?: { id: string; url: string; immutableUrl: string };
  docs?: { id: string; url: string; immutableUrl: string };
  git?: GitInfo;
  commandCount?: number;
}

interface PreviewEntry {
  label: string;
  platform: "worker" | "docs";
  tag: string;
  date: string;
  id: string;
  url: string;
}

interface Manifest {
  production: { worker: string; docs: string };
  github: string;
  endpoints: Record<string, string>;
  generated: string;
  versions: VersionEntry[];
  previews: PreviewEntry[];
}

// ============================================================================
// Parse wrangler versions list (works for any worker target)
// ============================================================================

function parseVersionsList(raw: string, target: TargetConfig, platform: "worker" | "docs") {
  const releases: { version: string; tag: string; date: string; id: string; url: string; immutableUrl: string }[] = [];
  const previews: PreviewEntry[] = [];

  let cur: { id?: string; created?: string; tag?: string } = {};
  for (const line of raw.split("\n")) {
    const idMatch = line.match(/^Version ID:\s+(.+)/);
    const createdMatch = line.match(/^Created:\s+(.+)/);
    const tagMatch = line.match(/^Tag:\s+(.+)/);

    if (idMatch) cur = { id: idMatch[1].trim() };
    else if (createdMatch && cur.id) cur.created = createdMatch[1].trim();
    else if (tagMatch && cur.id) {
      cur.tag = tagMatch[1].trim();
      if (cur.tag !== "-" && cur.created) {
        const makeUrl = (prefix: string) => `https://${prefix}-${target.name}.${target.domain}`;

        if (cur.tag.startsWith("pr-")) {
          previews.push({
            label: `PR #${cur.tag.replace("pr-", "")}`,
            platform,
            tag: cur.tag,
            date: cur.created,
            id: cur.id,
            url: makeUrl(cur.tag),
          });
        } else if (/^v\d/.test(cur.tag)) {
          const ver = cur.tag.replace("v", "");
          const slug = ver.replaceAll(".", "-");
          releases.push({
            version: ver,
            tag: cur.tag,
            date: cur.created,
            id: cur.id,
            url: makeUrl(`v${slug}`),
            immutableUrl: makeUrl(cur.id),
          });
        }
      }
      cur = {};
    }
  }

  return { releases, previews };
}

// ============================================================================
// Subcommand: versions — Generate cf-versions.json
// ============================================================================

async function cmdVersions(rootDir: string, cfg: Config) {
  const gitInfo = getGitInfo(rootDir, cfg.github);
  const { version: appVersion, commandCount } = readAppVersion(rootDir, cfg.version.source);

  // Query truck Worker versions
  let workerData = { releases: [] as any[], previews: [] as PreviewEntry[] };
  try {
    const workerDir = resolve(rootDir, cfg.worker.dir);
    const raw = execSync("bun x wrangler versions list 2>&1", { cwd: workerDir, encoding: "utf8" });
    workerData = parseVersionsList(raw, cfg.worker, "worker");
    console.log(`  worker: ${workerData.releases.length} versions, ${workerData.previews.length} previews`);
  } catch (e) {
    console.log("  worker: skipped (wrangler failed)");
  }

  // Query docs Worker versions
  let docsData = { releases: [] as any[], previews: [] as PreviewEntry[] };
  if (cfg.docs) {
    try {
      const docsDir = resolve(rootDir, cfg.docs.dir);
      const raw = execSync("bun x wrangler versions list 2>&1", { cwd: docsDir, encoding: "utf8" });
      docsData = parseVersionsList(raw, cfg.docs, "docs");
      console.log(`  docs:   ${docsData.releases.length} versions, ${docsData.previews.length} previews`);
    } catch (e) {
      console.log("  docs:   skipped (wrangler failed)");
    }
  }

  // Build version map — merge worker + docs
  const versionMap = new Map<string, VersionEntry>();

  for (const r of workerData.releases) {
    const existing: VersionEntry = versionMap.get(r.version) || { version: r.version, tag: r.tag, date: r.date };
    existing.worker = { id: r.id, url: r.url, immutableUrl: r.immutableUrl };
    if (!existing.date || r.date > existing.date) existing.date = r.date;
    versionMap.set(r.version, existing);
  }

  for (const r of docsData.releases) {
    const existing: VersionEntry = versionMap.get(r.version) || { version: r.version, tag: r.tag, date: r.date };
    existing.docs = { id: r.id, url: r.url, immutableUrl: r.immutableUrl };
    if (!existing.date || r.date > existing.date) existing.date = r.date;
    versionMap.set(r.version, existing);
  }

  // Ensure current version is present
  if (!versionMap.has(appVersion)) {
    const slug = appVersion.replaceAll(".", "-");
    versionMap.set(appVersion, {
      version: appVersion,
      tag: `v${appVersion}`,
      date: new Date().toISOString(),
      worker: {
        id: "",
        url: `https://v${slug}-${cfg.worker.name}.${cfg.worker.domain}`,
        immutableUrl: "",
      },
    });
  }

  // Enrich current version with git info
  const current = versionMap.get(appVersion);
  if (current) {
    current.git = gitInfo;
    if (commandCount !== undefined) current.commandCount = commandCount;
  }

  // Sort by version descending
  const versions = [...versionMap.values()].sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true })
  );

  // Merge previews from both workers
  const allPreviews = [...workerData.previews, ...docsData.previews];

  // Build manifest
  const manifest: Manifest = {
    production: {
      worker: cfg.worker.production,
      docs: cfg.docs?.production || "",
    },
    github: `https://github.com/${cfg.github}`,
    endpoints: cfg.endpoints,
    generated: new Date().toISOString(),
    versions,
    previews: allPreviews,
  };

  const outPath = resolve(rootDir, cfg.output);
  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nWrote ${outPath}: ${versions.length} versions, ${allPreviews.length} previews (${gitInfo.commitSha})`);
}

// ============================================================================
// Subcommand: upload — Upload new Worker version
// ============================================================================

function cmdUpload(rootDir: string, cfg: Config, target: TargetConfig, targetName: TargetName) {
  const { version } = readAppVersion(rootDir, cfg.version.source);
  const slug = version.replaceAll(".", "-");
  const workerDir = resolve(rootDir, target.dir);

  console.log(`Uploading ${targetName} version v${version}...`);
  execSync(
    `bun install && bunx wrangler versions upload --tag "v${version}" --message "v${version}" --preview-alias "v${slug}"`,
    { cwd: workerDir, stdio: "inherit" }
  );
  console.log(`\nUploaded v${version} (${targetName})`);
  console.log(`  Preview: https://v${slug}-${target.name}.${target.domain}`);
}

// ============================================================================
// Subcommand: promote — Promote latest to 100% traffic
// ============================================================================

function cmdPromote(rootDir: string, cfg: Config, target: TargetConfig, targetName: TargetName) {
  const manifest = readManifest(rootDir, cfg);
  const latest = manifest.versions[0];
  if (!latest) {
    console.error("ERROR: No versions found — upload first");
    process.exit(1);
  }

  const platformData = targetName === "worker" ? latest.worker : latest.docs;
  const versionId = platformData?.id;
  if (!versionId) {
    console.error(`ERROR: No ${targetName} version ID — upload first`);
    process.exit(1);
  }

  console.log(`Promoting ${versionId} (v${latest.version}) to 100% traffic (${targetName})...`);
  const workerDir = resolve(rootDir, target.dir);
  execSync(`bunx wrangler versions deploy "${versionId}@100%" --yes`, {
    cwd: workerDir,
    stdio: "inherit",
  });
  console.log(`\nPromoted v${latest.version} to production (${targetName})`);
}

// ============================================================================
// Subcommand: rollback
// ============================================================================

function cmdRollback(rootDir: string, cfg: Config, target: TargetConfig, targetName: TargetName) {
  const workerDir = resolve(rootDir, target.dir);
  console.log(`Rolling back ${targetName}...`);
  execSync("bunx wrangler rollback", { cwd: workerDir, stdio: "inherit" });
}

// ============================================================================
// Subcommand: smoke — Smoke test a deployed URL
// ============================================================================

function cmdSmoke(rootDir: string, cfg: Config, target: TargetConfig, targetName: TargetName, targetUrl?: string) {
  const manifest = readManifest(rootDir, cfg);
  const latest = manifest.versions[0];

  if (targetName === "docs") {
    // Docs worker: static site smoke test
    const platformData = latest?.docs;
    const url = targetUrl || platformData?.immutableUrl || platformData?.url || target.production;
    console.log(`Smoke testing docs: ${url}\n`);

    // 1. Index page
    try {
      const status = execSync(`curl -sf -o /dev/null -w "%{http_code}" "${url}/"`, { encoding: "utf8" }).trim();
      console.log(`  index:   OK (HTTP ${status})`);
    } catch {
      console.error("  FAIL:    Index page unreachable");
      process.exit(1);
    }

    // 2. llms.txt (docs-specific)
    try {
      const status = execSync(`curl -sf -o /dev/null -w "%{http_code}" "${url}/llms.txt"`, { encoding: "utf8" }).trim();
      console.log(`  llms:    OK (HTTP ${status})`);
    } catch {
      console.log(`  llms:    SKIP (not found)`);
    }

    console.log(`\nPASS: Docs smoke checks passed`);
    return;
  }

  // Worker (truck): full smoke test
  const url = targetUrl || latest?.worker?.immutableUrl || latest?.worker?.url || target.production;
  console.log(`Smoke testing worker: ${url}\n`);

  // 1. Health check
  try {
    const healthJson = execSync(`curl -sf "${url}/api/health"`, { encoding: "utf8" });
    const health = JSON.parse(healthJson);
    console.log(`  health:  OK (v${health.version})`);

    // Version match
    if (latest && health.version !== latest.version) {
      console.log(`  WARN:    Version mismatch — expected v${latest.version}, got v${health.version}`);
    }
  } catch {
    console.error("  FAIL:    /api/health unreachable");
    process.exit(1);
  }

  // 2. Index page
  try {
    const status = execSync(`curl -sf -o /dev/null -w "%{http_code}" "${url}/"`, { encoding: "utf8" }).trim();
    const size = execSync(`curl -sf -o /dev/null -w "%{size_download}" "${url}/"`, { encoding: "utf8" }).trim();
    console.log(`  index:   OK (HTTP ${status}, ${size} bytes)`);
  } catch {
    console.error("  FAIL:    Index page unreachable");
    process.exit(1);
  }

  // 3. Project-specific checks
  if (cfg.smoke?.extra) {
    try {
      execSync(`SMOKE_URL="${url}" ${cfg.smoke.extra}`, { cwd: rootDir, stdio: "inherit" });
    } catch {
      console.error("  FAIL:    Extra smoke checks failed");
      process.exit(1);
    }
  }

  console.log(`\nPASS: All checks passed`);
}

// ============================================================================
// Subcommand: release-notes — Markdown for GitHub releases
// ============================================================================

function cmdReleaseNotes(rootDir: string, cfg: Config) {
  const manifest = readManifest(rootDir, cfg);
  const latest = manifest.versions[0];
  if (!latest) {
    console.error("ERROR: No versions found");
    process.exit(1);
  }

  const v = latest.version;
  const slug = v.replaceAll(".", "-");
  const workerPreview = `https://v${slug}-${cfg.worker.name}.${cfg.worker.domain}`;

  const lines = [
    `## Try this version`,
    ``,
    `| | URL |`,
    `|--|-----|`,
    `| **Worker preview** | [v${slug}-${cfg.worker.name}](${workerPreview}) |`,
    `| **Worker production** | [${new URL(cfg.worker.production).hostname}](${cfg.worker.production}) |`,
  ];

  if (cfg.docs) {
    const docsPreview = `https://v${slug}-${cfg.docs.name}.${cfg.docs.domain}`;
    lines.push(
      `| **Docs preview** | [v${slug}-${cfg.docs.name}](${docsPreview}) |`,
      `| **Docs production** | [${new URL(cfg.docs.production).hostname}](${cfg.docs.production}) |`,
    );
  }

  lines.push(
    ``,
    `### Endpoints`,
    ``,
    `| Endpoint | URL |`,
    `|----------|-----|`,
  );

  for (const [name, path] of Object.entries(cfg.endpoints)) {
    const url = path.startsWith("http") ? path : `${cfg.worker.production}${path}`;
    lines.push(`| ${name} | ${url} |`);
  }

  lines.push(
    ``,
    `### Verify`,
    ``,
    "```sh",
    `curl -sf ${workerPreview}/api/health`,
    `# {"version":"${v}"}`,
    "```",
  );

  console.log(lines.join("\n"));
}

// ============================================================================
// Subcommand: readme-urls — URL table for README
// ============================================================================

function cmdReadmeUrls(rootDir: string, cfg: Config) {
  const lines = [
    `<!-- cf-urls:start -->`,
    `| | URL |`,
    `|--|-----|`,
    `| **Production** | |`,
    `| CAD App | ${cfg.worker.production} |`,
    `| Workers (alias) | https://${cfg.worker.name}.${cfg.worker.domain} |`,
  ];

  if (cfg.docs) {
    lines.push(
      `| Docs | ${cfg.docs.production} |`,
      `| Docs (Workers) | https://${cfg.docs.name}.${cfg.docs.domain} |`,
      `| LLM Docs | ${cfg.docs.production}/llms.txt |`,
    );
  }

  lines.push(
    `| **Local Dev** | |`,
    `| CAD App | ${cfg.local.worker} |`,
    `| API Docs | ${cfg.local.worker}/api-docs |`,
    `| MCP | ${cfg.local.worker}/mcp |`,
  );

  if (cfg.local.docs) {
    lines.push(`| Docs Dev | ${cfg.local.docs} |`);
  }

  lines.push(
    `| **Project** | |`,
    `| GitHub | https://github.com/${cfg.github} |`,
    `| CF Deployments | [Dashboard](https://dash.cloudflare.com/${cfg.account}/workers/services/view/${cfg.worker.name}/production/deployments) |`,
    `<!-- cf-urls:end -->`,
  );

  const block = lines.join("\n");

  // Auto-update README.md if it has cf-urls markers
  const readmePath = join(rootDir, "README.md");
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, "utf8");
    const re = /<!-- cf-urls:start -->[\s\S]*?<!-- cf-urls:end -->/;
    if (re.test(readme)) {
      const updated = readme.replace(re, block);
      if (updated !== readme) {
        writeFileSync(readmePath, updated);
        console.log("README.md updated");
      } else {
        console.log("README.md already up to date");
      }
      return;
    }
  }

  // Fallback: print to stdout
  console.log(block);
}

// ============================================================================
// Subcommand: status — Current deployment info
// ============================================================================

function cmdStatus(rootDir: string, cfg: Config, asEnv: boolean) {
  const manifest = readManifest(rootDir, cfg);
  const latest = manifest.versions[0];

  if (!latest) {
    console.error("No versions found — run 'versions' first");
    process.exit(1);
  }

  if (asEnv) {
    // Shell-evaluable output (used by Taskfile promote/smoke)
    console.log(`VERSION="${latest.version}"`);
    console.log(`COMMIT_SHA="${latest.git?.commitSha || "?"}"`);
    if (latest.worker) {
      console.log(`VERSION_ID="${latest.worker.id}"`);
      console.log(`WORKER_URL="${latest.worker.url}"`);
      console.log(`WORKER_IMMUTABLE_URL="${latest.worker.immutableUrl}"`);
    }
    console.log(`COMMAND_COUNT="${latest.commandCount || 0}"`);
    return;
  }

  console.log(`Version:  v${latest.version}`);
  console.log(`Tag:      ${latest.tag}`);
  console.log(`Date:     ${latest.date}`);
  if (latest.git) {
    console.log(`Commit:   ${latest.git.commitSha} (${latest.git.branch})`);
    console.log(`          ${latest.git.commitMessage}`);
  }
  console.log(``);
  if (cfg.local) {
    console.log(`Local:`);
    if (cfg.local.worker) console.log(`  Worker:  ${cfg.local.worker}`);
    if (cfg.local.docs) console.log(`  Docs:    ${cfg.local.docs}`);
    console.log(``);
  }
  if (latest.worker || cfg.worker?.production) {
    console.log(`Worker:`);
    if (latest.worker?.url) console.log(`  Preview: ${latest.worker.url}`);
    console.log(`  Prod:    ${cfg.worker.production}`);
  }
  if (cfg.docs?.production) {
    console.log(`Docs:`);
    console.log(`  Workers: https://${cfg.docs.name}.${cfg.docs.domain}`);
    console.log(`  Prod:    ${cfg.docs.production}`);
  }
  if (latest.commandCount) {
    console.log(`\nCommands: ${latest.commandCount}`);
  }
}

// ============================================================================
// Subcommand: list — All versions + previews
// ============================================================================

function cmdList(rootDir: string, cfg: Config) {
  const manifest = readManifest(rootDir, cfg);

  console.log("=== Versions ===\n");
  for (const v of manifest.versions) {
    const w = v.worker?.url ? "W" : " ";
    const d = v.docs?.url ? "D" : " ";
    const date = v.date ? new Date(v.date).toLocaleDateString() : "";
    console.log(`  v${v.version}  [${w}${d}]  ${date}`);
    if (v.worker?.url) console.log(`    Worker: ${v.worker.url}`);
    if (v.docs?.url) console.log(`    Docs:   ${v.docs.url}`);
  }

  if (manifest.previews.length > 0) {
    console.log("\n=== Previews ===\n");
    for (const p of manifest.previews) {
      console.log(`  ${p.label}  (${p.platform})`);
      console.log(`    ${p.url}`);
    }
  }

  console.log(`\nProduction:`);
  console.log(`  Worker: ${cfg.worker.production}`);
  if (cfg.docs) console.log(`  Docs:   ${cfg.docs.production}`);
}

// ============================================================================
// Subcommand: config — Read a config value by dot path
// ============================================================================

function cmdConfig(cfg: Config, path: string) {
  if (!path) {
    // No path — dump entire config
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }
  const value = path.split(".").reduce((obj: any, key) => obj?.[key], cfg);
  if (value === undefined) {
    console.error(`ERROR: config path '${path}' not found`);
    process.exit(1);
  }
  if (typeof value === "object") {
    console.log(JSON.stringify(value, null, 2));
  } else {
    process.stdout.write(String(value));
  }
}

// ============================================================================
// Subcommand: verify — audit codebase for stale hardcoded values
// ============================================================================

function cmdVerify(rootDir: string, cfg: Config) {
  // Values from cf-deploy.json that should NOT appear hardcoded in source files
  const checks: { label: string; value: string; glob: string }[] = [
    { label: "worker.name", value: cfg.worker.name, glob: "*.{ts,js,sh,yml}" },
    { label: "worker.domain", value: cfg.worker.domain, glob: "*.{ts,js,sh,yml}" },
    { label: "worker.production", value: cfg.worker.production.replace("https://", ""), glob: "*.{ts,js,sh,yml}" },
    { label: "account", value: cfg.account, glob: "*.{ts,js,sh,yml,json}" },
    { label: "github", value: cfg.github, glob: "*.{ts,js,sh,yml}" },
    { label: "local.worker", value: cfg.local.worker, glob: "*.{ts,js,sh,yml}" },
  ];

  if (cfg.docs) {
    checks.push(
      { label: "docs.name", value: cfg.docs.name, glob: "*.{ts,js,sh,yml}" },
      { label: "docs.domain", value: cfg.docs.domain, glob: "*.{ts,js,sh,yml}" },
      { label: "docs.production", value: cfg.docs.production.replace("https://", ""), glob: "*.{ts,js,sh,yml}" },
    );
  }

  if (cfg.local.docs) {
    checks.push({ label: "local.docs", value: cfg.local.docs, glob: "*.{ts,js,sh,yml}" });
  }

  if (cfg.r2?.documents) checks.push({ label: "r2.documents", value: cfg.r2.documents, glob: "*.{ts,toml,yml}" });

  const filtered = checks.filter((c) => c.value);

  // Files that legitimately contain hardcoded values
  const ALLOWED = [
    "cf-deploy.json",
    "cf-versions.json",
    "AGENT.md",
    "CLAUDE.md",
    "README.md",
    "memory/",
    "docs/adr/",
    "node_modules/",
    ".git/",
  ];

  let issues = 0;

  for (const { label, value, glob } of filtered) {
    try {
      const result = execSync(
        `grep -rn --include='${glob}' -l '${value}' . 2>/dev/null || true`,
        { cwd: rootDir, encoding: "utf8" },
      ).trim();

      if (!result) continue;

      const files = result
        .split("\n")
        .map((f: string) => f.replace("./", ""))
        .filter((f: string) => !ALLOWED.some((a) => f.includes(a)));

      for (const file of files) {
        // Check if this file actually reads from config (dynamic)
        const content = readFileSync(join(rootDir, file), "utf8");
        const isDynamic =
          content.includes("cfDeploy") ||
          content.includes("cfConfig") ||
          content.includes("cf-deploy.ts config") ||
          content.includes("cf-deploy.json");

        // Check if it's just a fallback default (|| 'value')
        const isFallback = content.includes(`|| '${value}'`) || content.includes(`|| "${value}"`);

        if (isDynamic || isFallback) continue;

        // Check if it's in a comment
        const lines = content.split("\n");
        const matchLines = lines
          .map((l: string, i: number) => ({ line: i + 1, text: l }))
          .filter((l: { line: number; text: string }) => l.text.includes(value));

        for (const m of matchLines) {
          const trimmed = m.text.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;

          // This is a hardcoded reference that's NOT dynamic, NOT a fallback, NOT a comment
          console.log(`  HARDCODED  ${label}="${value}"  →  ${file}:${m.line}`);
          issues++;
        }
      }
    } catch {
      // grep failed — skip
    }
  }

  if (issues === 0) {
    console.log("PASS: All cf-deploy.json values are properly wired (no stale hardcodes found)");
  } else {
    console.log(`\nFOUND ${issues} hardcoded value(s) that should read from cf-deploy.json`);
    process.exit(1);
  }
}

// ============================================================================
// Subcommand: whoami
// ============================================================================

function cmdWhoami(rootDir: string, cfg: Config, target: TargetConfig) {
  const workerDir = resolve(rootDir, target.dir);
  execSync("bunx wrangler whoami", { cwd: workerDir, stdio: "inherit" });
}

// ============================================================================
// Helpers
// ============================================================================

function readManifest(rootDir: string, cfg: Config): Manifest {
  const outPath = resolve(rootDir, cfg.output);
  if (!existsSync(outPath)) {
    console.error(`ERROR: ${outPath} not found — run 'versions' first`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(outPath, "utf8"));
}

function printHelp() {
  console.log(`cf-deploy — Cloudflare Workers deploy lifecycle

Usage: bun scripts/cf-deploy.ts <command> [options]

Commands:
  versions          Generate cf-versions.json (queries all workers)
  upload            Upload new Worker version (does not promote)
  promote           Promote latest uploaded version to 100% traffic
  rollback          Roll back to previous Worker version
  smoke [URL]       Smoke test a deployed URL
  release-notes     Generate GitHub release markdown from manifest
  readme-urls       Generate README URL table from config
  status [--env]    Show current deployment info (--env for shell vars)
  list              List all versions and previews
  config [path]     Read config value (e.g. worker.name, docs.production)
  verify            Audit codebase for stale hardcoded values
  whoami            Show Cloudflare auth info

Options:
  --target <name>   Target worker: worker (default), docs
                    Aliases: truck, truck-cad → worker; docs-worker → docs
                    Applies to: upload, promote, rollback, smoke, whoami

Config: reads cf-deploy.json from repo root.
See ADR-0022 (v2) for design rationale.`);
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

const rootDir = getRootDir();
const cfg = loadConfig(rootDir);

// Resolve --target for commands that need it (default: worker)
const { targetName, target } = resolveTarget(cfg, args);
const cleanArgs = stripTargetFlag(args);

switch (command) {
  case "versions":
    await cmdVersions(rootDir, cfg);
    break;
  case "upload":
    cmdUpload(rootDir, cfg, target, targetName);
    break;
  case "promote":
    cmdPromote(rootDir, cfg, target, targetName);
    break;
  case "rollback":
    cmdRollback(rootDir, cfg, target, targetName);
    break;
  case "smoke":
    cmdSmoke(rootDir, cfg, target, targetName, cleanArgs[1]);
    break;
  case "release-notes":
    cmdReleaseNotes(rootDir, cfg);
    break;
  case "readme-urls":
    cmdReadmeUrls(rootDir, cfg);
    break;
  case "status":
    cmdStatus(rootDir, cfg, args.includes("--env"));
    break;
  case "list":
    cmdList(rootDir, cfg);
    break;
  case "config":
    cmdConfig(cfg, cleanArgs[1]);
    break;
  case "verify":
    cmdVerify(rootDir, cfg);
    break;
  case "whoami":
    cmdWhoami(rootDir, cfg, target);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
