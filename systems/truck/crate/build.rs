// build.rs — sets PROJECT_VERSION from the nearest git tag (e.g. "v0.8.0" → "0.8.0").
// Falls back to Cargo.toml version if git is unavailable.

use std::process::Command;

fn main() {
    // Try git describe --tags --abbrev=0 (nearest tag, no hash suffix)
    let version = Command::new("git")
        .args(["describe", "--tags", "--abbrev=0"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.trim().trim_start_matches('v').to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| env!("CARGO_PKG_VERSION").to_string());

    println!("cargo:rustc-env=PROJECT_VERSION={version}");
    // Only re-run if tags change (not on every source edit)
    println!("cargo:rerun-if-changed=build.rs");
}
