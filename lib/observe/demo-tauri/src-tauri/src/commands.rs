//! Tauri commands — typed via tauri-specta.
//!
//! These are the native-side capabilities that the webview cannot do itself:
//!   - Spawn / stop bun demo worker processes  (desktop only)
//!   - Query worker health                     (desktop only)
//!   - Run observe primitives natively (same plat-observe crate, no WASM overhead)
//!
//! TypeScript bindings are generated from these signatures — see ../src/bindings.ts.
//!
//! Platform notes:
//!   desktop — all commands available; workers are spawned as local bun processes.
//!   mobile  — process commands return errors; views point at OBSERVE_BASE_URL
//!             (a deployed Cloudflare Worker URL set at build time).

// All items here are invoked via Tauri's IPC / tauri::generate_handler! macro —
// Rust's dead-code analysis cannot see through that boundary.
#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::process::Child;
use std::sync::Mutex;
use tauri::State;

// ── State ─────────────────────────────────────────────────────────────────────

/// Active bun demo worker processes, keyed by service name. Desktop only.
pub struct Workers(pub Mutex<HashMap<String, Child>>);

// ── Shared types — exported to TypeScript via specta ─────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DemoConfig {
    pub name: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct WorkerStatus {
    pub name: String,
    pub port: u16,
    pub running: bool,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct ScrubResult {
    pub original: String,
    pub scrubbed: String,
    pub changed: bool,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct SampleResult {
    pub keep: bool,
    pub rate: f64,
    pub seed: u32,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

pub fn demos() -> [DemoConfig; 2] {
    [
        DemoConfig { name: "log-demo".to_string(),   port: 3333 },
        DemoConfig { name: "log-demo-2".to_string(), port: 3334 },
    ]
}

/// Base URL for worker endpoints.
/// Desktop: defaults to http://localhost (local bun processes).
/// Mobile:  set OBSERVE_BASE_URL to your deployed CF worker base at build time.
pub fn base_url() -> String {
    std::env::var("OBSERVE_BASE_URL")
        .unwrap_or_else(|_| "http://localhost".to_string())
}

pub fn worker_url(port: u16) -> String {
    format!("{}:{}", base_url(), port)
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// List all demo workers and whether they are currently running.
/// On mobile, running is always false — workers live on the server.
#[tauri::command]
#[specta::specta]
pub fn list_workers(workers: State<Workers>) -> Vec<WorkerStatus> {
    #[cfg(desktop)]
    {
        let map = workers.0.lock().unwrap();
        return demos().iter().map(|d| WorkerStatus {
            name:    d.name.clone(),
            port:    d.port,
            running: map.contains_key(&d.name),
            url:     worker_url(d.port),
        }).collect();
    }
    #[cfg(not(desktop))]
    {
        let _ = workers;
        demos().iter().map(|d| WorkerStatus {
            name:    d.name.clone(),
            port:    d.port,
            running: false,
            url:     worker_url(d.port),
        }).collect()
    }
}

/// Spawn a bun demo worker by name. Desktop only.
#[tauri::command]
#[specta::specta]
pub fn start_worker(name: String, workers: State<Workers>) -> Result<WorkerStatus, String> {
    #[cfg(not(desktop))]
    return Err("worker spawning not supported on mobile — use deployed CF workers via OBSERVE_BASE_URL".into());

    #[cfg(desktop)]
    {
        let demo = demos().iter().find(|d| d.name == name)
            .cloned()
            .ok_or_else(|| format!("unknown demo: {name}"))?;

        let mut map = workers.0.lock().unwrap();
        if map.contains_key(&name) {
            return Err(format!("{name} is already running"));
        }

        let entry = format!("lib/observe/demo{}/bun.ts",
            if name == "log-demo" { "1" } else { "2" });

        let child = std::process::Command::new("bun")
            .arg(&entry)
            .spawn()
            .map_err(|e| format!("failed to spawn bun: {e}"))?;

        map.insert(name.clone(), child);

        Ok(WorkerStatus {
            name:    name.clone(),
            port:    demo.port,
            running: true,
            url:     worker_url(demo.port),
        })
    }
}

/// Stop a running bun demo worker by name. Desktop only.
#[tauri::command]
#[specta::specta]
pub fn stop_worker(name: String, workers: State<Workers>) -> Result<(), String> {
    #[cfg(not(desktop))]
    return Err("not supported on mobile".into());

    #[cfg(desktop)]
    {
        let mut map = workers.0.lock().unwrap();
        if let Some(mut child) = map.remove(&name) {
            child.kill().map_err(|e| format!("failed to kill {name}: {e}"))?;
        }
        Ok(())
    }
}

/// Check whether a worker's TCP port is reachable. Desktop only.
#[tauri::command]
#[specta::specta]
pub async fn ping_worker(port: u16) -> bool {
    #[cfg(not(desktop))]
    return false;

    #[cfg(desktop)]
    std::net::TcpStream::connect(format!("127.0.0.1:{port}")).is_ok()
}

/// Scrub a JSON log entry using the native plat-observe crate (no WASM).
#[tauri::command]
#[specta::specta]
pub fn native_scrub(json: String) -> ScrubResult {
    let scrubbed = plat_observe::scrub_entry(&json);
    let changed = scrubbed != json;
    ScrubResult { original: json, scrubbed, changed }
}

/// Run a sampling decision using the native plat-observe crate.
#[tauri::command]
#[specta::specta]
pub fn native_sample(rate: f64, seed: u32) -> SampleResult {
    let keep = plat_observe::sample_keep(rate, seed);
    SampleResult { keep, rate, seed }
}

/// Return the plat-observe crate version running natively.
#[tauri::command]
#[specta::specta]
pub fn native_version() -> String {
    plat_observe::observe_version()
}
