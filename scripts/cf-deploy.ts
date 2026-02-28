#!/usr/bin/env bun
// cf-deploy — Cloudflare Workers deploy lifecycle.
// Config: cf-deploy.json. Adding a worker = one entry there.

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

interface WorkerConfig { name: string; domain: string; dir: string; production: string }
interface Config {
  workers: Record<string, WorkerConfig>;
  account: string; github: string;
  version: { source: string }; output: string;
  endpoints: Record<string, string>;
  smoke?: { extra?: string };
  r2?: Record<string, string>;
}
interface PlatformInfo { id: string; url: string; immutableUrl: string }
interface VersionEntry { version: string; tag: string; date: string; platforms: Record<string, PlatformInfo>; git?: any; commandCount?: number }
interface Manifest { production: Record<string, string>; github: string; endpoints: Record<string, string>; generated: string; versions: VersionEntry[]; previews: any[] }

const rootDir = process.env.ROOT_DIR || execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const cfg: Config = JSON.parse(readFileSync(join(rootDir, "cf-deploy.json"), "utf8"));
if (!cfg.workers) { console.error("ERROR: cf-deploy.json missing 'workers' map"); process.exit(1); }

function wr(dir: string, args: string, inherit = false): string {
  const cwd = resolve(rootDir, dir);
  if (inherit) { execSync(`bunx wrangler ${args}`, { cwd, stdio: "inherit" }); return ""; }
  return execSync(`bunx wrangler ${args}`, { cwd, encoding: "utf8" });
}

function target(): { name: string; w: WorkerConfig } {
  const args = process.argv.slice(3);
  const i = args.indexOf("--target");
  const name = i !== -1 && args[i + 1] ? args[i + 1] : Object.keys(cfg.workers)[0];
  const w = cfg.workers[name];
  if (!w) { console.error(`Unknown target '${name}'. Valid: ${Object.keys(cfg.workers).join(", ")}`); process.exit(1); }
  return { name, w };
}

function ver(): { version: string; commandCount?: number } {
  const p = resolve(rootDir, cfg.version.source);
  if (!existsSync(p)) return { version: "0.0.0" };
  const s = JSON.parse(readFileSync(p, "utf8"));
  return { version: s.version || "0.0.0", commandCount: s.commands ? Object.keys(s.commands).length : undefined };
}

function manifest(): Manifest {
  const p = resolve(rootDir, cfg.output);
  if (!existsSync(p)) { console.error(`${cfg.output} not found — run 'versions' first`); process.exit(1); }
  return JSON.parse(readFileSync(p, "utf8"));
}

// --- Commands ---

function upload() {
  const { name, w } = target();
  const { version } = ver();
  console.log(`Uploading ${name} v${version}...`);
  execSync("bun install", { cwd: resolve(rootDir, w.dir), encoding: "utf8" });
  try {
    process.stdout.write(wr(w.dir, `versions upload --message "v${version}"`));
  } catch (e: any) {
    if (e.stderr?.includes("10007") || e.stderr?.includes("does not exist")) {
      console.log("  Bootstrapping new worker...");
      wr(w.dir, "deploy", true);
      process.stdout.write(wr(w.dir, `versions upload --message "v${version}"`));
    } else throw e;
  }
}

function promote() {
  const { name, w } = target();
  const m = manifest(), latest = m.versions[0];
  if (!latest) { console.error("No versions"); process.exit(1); }
  const vid = latest.platforms[name]?.id;
  if (!vid) { console.error(`No ${name} version ID`); process.exit(1); }
  console.log(`Promoting ${name} v${latest.version}...`);
  wr(w.dir, `versions deploy "${vid}@100%" --yes`, true);
}

function release() {
  const { name, w } = target();
  const { version } = ver();
  const slug = version.replaceAll(".", "-");
  console.log(`Release ${name} v${slug}...`);
  wr(w.dir, `versions upload --tag "v${version}" --message "v${version}" --preview-alias "v${slug}"`, true);
  console.log(`  → https://v${slug}-${w.name}.${w.domain}`);
}

function rollback() {
  const { name, w } = target();
  console.log(`Rolling back ${name}...`);
  wr(w.dir, "rollback", true);
}

function smoke() {
  const { name, w } = target();
  const url = process.argv.find((a, i) => i > 2 && !a.startsWith("--") && process.argv[i - 1] !== "--target") || w.production;
  console.log(`Smoke ${name}: ${url}`);
  let ok = 0;
  try {
    const h = JSON.parse(execSync(`curl -sf "${url}/api/health"`, { encoding: "utf8" }));
    console.log(`  health: OK (${h.version || h.status || "ok"})`); ok++;
  } catch { console.log("  health: SKIP"); }
  try { execSync(`curl -sf "${url}/" -o /dev/null`); console.log("  index:  OK"); ok++; } catch { console.log("  index:  SKIP"); }
  if (!ok) { console.error(`FAIL: ${name}`); process.exit(1); }
  if (name === Object.keys(cfg.workers)[0] && cfg.smoke?.extra) {
    try { execSync(`SMOKE_URL="${url}" ${cfg.smoke.extra}`, { cwd: rootDir, stdio: "inherit" }); } catch { process.exit(1); }
  }
  console.log(`PASS: ${name}`);
}

function versions() {
  const git = (() => {
    const r = (cmd: string) => execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
    const full = r("git rev-parse HEAD");
    return { commitSha: r("git rev-parse --short HEAD"), commitFull: full, commitMessage: r("git log -1 --format=%s"), branch: r("git branch --show-current"), commitUrl: `https://github.com/${cfg.github}/commit/${full}` };
  })();
  const { version: appVersion, commandCount } = ver();
  const versionMap = new Map<string, VersionEntry>();
  const allPreviews: any[] = [];

  for (const [name, w] of Object.entries(cfg.workers)) {
    try {
      const items = JSON.parse(wr(w.dir, "versions list --json 2>/dev/null"));
      const makeUrl = (prefix: string) => `https://${prefix}-${w.name}.${w.domain}`;
      for (const item of items) {
        const tag = (item.annotations?.["workers/tag"] || "").trim();
        const date = item.metadata?.created_on || "";
        if (tag?.startsWith("pr-")) {
          allPreviews.push({ label: `PR #${tag.replace("pr-", "")}`, platform: name, tag, date, id: item.id, url: makeUrl(tag) });
        } else if (tag && /^v\d/.test(tag)) {
          const v = tag.replace("v", ""), slug = v.replaceAll(".", "-");
          const entry = versionMap.get(v) || { version: v, tag, date, platforms: {} as Record<string, PlatformInfo> };
          // Wrangler lists newest first — keep newest upload per platform
          if (!entry.platforms[name]) entry.platforms[name] = { id: item.id, url: makeUrl(`v${slug}`), immutableUrl: makeUrl(item.id.split("-")[0]) };
          if (!entry.tag) entry.tag = tag;
          if (!entry.date || date > entry.date) entry.date = date;
          versionMap.set(v, entry);
        } else {
          const msg = (item.annotations?.["workers/message"] || "").trim();
          const msgVer = msg.match(/^v?(\d+\.\d+\.\d+.*)$/)?.[1];
          if (msgVer) {
            const entry = versionMap.get(msgVer) || { version: msgVer, tag: "", date, platforms: {} as Record<string, PlatformInfo> };
            if (!entry.platforms[name]) entry.platforms[name] = { id: item.id, url: "", immutableUrl: makeUrl(item.id.split("-")[0]) };
            if (!entry.date || date > entry.date) entry.date = date;
            versionMap.set(msgVer, entry);
          }
        }
      }
      console.log(`  ${name}: OK`);
    } catch { console.log(`  ${name}: skipped`); }
  }

  if (!versionMap.has(appVersion)) versionMap.set(appVersion, { version: appVersion, tag: "", date: new Date().toISOString(), platforms: {} });
  const cur = versionMap.get(appVersion)!;
  cur.git = git;
  if (commandCount !== undefined) cur.commandCount = commandCount;

  const production: Record<string, string> = {};
  for (const [name, w] of Object.entries(cfg.workers)) production[name] = w.production;

  const outPath = resolve(rootDir, cfg.output);
  const data: Manifest = {
    production, github: `https://github.com/${cfg.github}`, endpoints: cfg.endpoints,
    generated: new Date().toISOString(),
    versions: [...versionMap.values()].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    previews: allPreviews,
  };
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`Wrote ${cfg.output}: ${data.versions.length} versions`);
}

function foreach() {
  const sub = process.argv[3];
  if (!sub) { console.error("foreach requires a subcommand"); process.exit(1); }
  let failed = 0;
  for (const name of Object.keys(cfg.workers)) {
    console.log(`\n=== ${name} ===`);
    try { execSync(`bun scripts/cf-deploy.ts ${sub} --target ${name}`, { cwd: rootDir, stdio: "inherit" }); }
    catch { failed++; }
  }
  if (failed) { console.error(`${failed} failed`); process.exit(1); }
}

function config() {
  const path = process.argv[3];
  if (!path) { console.log(JSON.stringify(cfg, null, 2)); return; }
  const val = path.split(".").reduce((o: any, k) => o?.[k], cfg);
  if (val === undefined) { console.error(`Config path '${path}' not found`); process.exit(1); }
  typeof val === "object" ? console.log(JSON.stringify(val, null, 2)) : process.stdout.write(String(val));
}

function nuke() {
  const sub = process.argv[3];
  if (!sub) {
    console.log("Nuke commands (granular teardown):");
    console.log("  nuke code   — Delete all worker code (domains auto-reconnect on redeploy)");
    console.log("  nuke data   — Wipe R2 buckets (worker code stays running)");
    console.log("  nuke dns    — Remove custom domain routes");
    console.log("  nuke all    — Everything: code + data + dns");
    process.exit(0);
  }

  if (sub === "code" || sub === "all") {
    console.log("Deleting all workers...");
    for (const [name, w] of Object.entries(cfg.workers)) {
      try {
        wr(w.dir, `delete --name ${w.name} --force`, true);
        console.log(`  ${name}: deleted`);
      } catch { console.log(`  ${name}: not found`); }
    }
  }

  if (sub === "data" || sub === "all") {
    console.log("Wiping R2 buckets...");
    if (cfg.r2) {
      for (const [label, bucket] of Object.entries(cfg.r2 as Record<string, string>)) {
        try {
          const objects = JSON.parse(execSync(
            `bunx wrangler r2 object list ${bucket} --json 2>/dev/null || echo "[]"`,
            { cwd: rootDir, encoding: "utf8" }
          ));
          if (Array.isArray(objects) && objects.length > 0) {
            for (const obj of objects) {
              execSync(`bunx wrangler r2 object delete ${bucket}/${obj.key}`, { cwd: rootDir, stdio: "inherit" });
            }
            console.log(`  ${label} (${bucket}): ${objects.length} objects deleted`);
          } else {
            console.log(`  ${label} (${bucket}): empty`);
          }
        } catch { console.log(`  ${label} (${bucket}): skipped (not found or empty)`); }
      }
    } else {
      console.log("  No R2 buckets configured.");
    }
  }

  if (sub === "dns" || sub === "all") {
    console.log("Removing custom domain routes...");
    for (const [name, w] of Object.entries(cfg.workers)) {
      try {
        execSync(
          `bunx wrangler deployments list --name ${w.name} --json 2>/dev/null`,
          { cwd: rootDir, encoding: "utf8" }
        );
        console.log(`  ${name}: routes will re-register on next deploy`);
      } catch { console.log(`  ${name}: no routes`); }
    }
    console.log("  Note: Custom domains re-register automatically on next deploy.");
  }

  console.log("\nDone. Redeploy with: bun run deploy");
}

function deployAll() {
  // Deploy sub-workers first (router depends on them via service bindings).
  // Uses `wrangler deploy` which uploads + activates + sets up routes in one step.
  const entries = Object.entries(cfg.workers);
  const routerEntry = entries.find(([, w]) => w.name === "plat-router");
  const subWorkers = entries.filter(([, w]) => w.name !== "plat-router");

  for (const [name, w] of subWorkers) {
    console.log(`\n=== Deploying ${name} ===`);
    try {
      execSync("bun install", { cwd: resolve(rootDir, w.dir), encoding: "utf8" });
      wr(w.dir, "deploy", true);
      console.log(`  ${name}: deployed`);
    } catch { console.error(`FAIL: ${name}`); process.exit(1); }
  }

  if (routerEntry) {
    const [name, w] = routerEntry;
    console.log(`\n=== Deploying ${name} (last — depends on sub-workers) ===`);
    try {
      execSync("bun install", { cwd: resolve(rootDir, w.dir), encoding: "utf8" });
      wr(w.dir, "deploy", true);
      console.log(`  ${name}: deployed`);
    } catch { console.error(`FAIL: ${name}`); process.exit(1); }
  }

  console.log("\nAll workers deployed.");
}

// --- Main ---

const cmd = process.argv[2];
switch (cmd) {
  case "upload": upload(); break;
  case "promote": promote(); break;
  case "release": release(); break;
  case "rollback": rollback(); break;
  case "smoke": smoke(); break;
  case "versions": versions(); break;
  case "foreach": foreach(); break;
  case "config": config(); break;
  case "nuke": nuke(); break;
  case "deploy-all": deployAll(); break;
  case "list-targets": console.log(Object.keys(cfg.workers).join("\n")); break;
  default: console.log("Commands: upload promote release rollback smoke versions foreach config nuke deploy-all list-targets\n  nuke sub-commands: code data dns all"); break;
}
