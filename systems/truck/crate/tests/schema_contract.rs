//! Schema contract test — verifies that the committed cad-schema.json exactly
//! matches what build_schema() generates from the Rust param types.
//!
//! This closes the codegen loop:
//!   src/commands/{domain}.rs  ← typed param structs (source of truth)
//!       ↓ build_schema()
//!   serde_json::Value         ← compared here
//!       ↓ assert_eq
//!   systems/truck/cad-schema.json (committed artifact)
//!       ↓ consumed by
//!   Worker Zod · MCP tools · OpenAPI · browser cadCommand()
//!
//! Failure means: run `bun run build:truck` to regenerate cad-schema.json.
//!
//! Run: cargo test -p truck-webgpu-gui --no-default-features --features native

#![cfg(feature = "native")]

#[test]
fn committed_cad_schema_json_matches_build_schema() {
    let generated = truck_webgpu_gui::commands::build_schema();

    // CARGO_MANIFEST_DIR = systems/truck/crate
    // cad-schema.json    = systems/truck/cad-schema.json
    let schema_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../cad-schema.json");
    let committed_str = std::fs::read_to_string(schema_path)
        .expect("cad-schema.json not found — run `bun run build:truck` to regenerate it");
    let committed: serde_json::Value = serde_json::from_str(&committed_str)
        .expect("cad-schema.json is not valid JSON");

    assert_eq!(
        generated, committed,
        "\ncad-schema.json is out of date.\nRun: bun run build:truck\n\
         (the committed file must equal what build_schema() produces from the Rust types)"
    );
}
