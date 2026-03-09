//! Boundary dispatch contract test (ADR-0004) — verifies that every command
//! declared in cad-schema.json boundaries is handled by HeadlessController::execute().
//!
//! "Handled" means execute() returns something other than {"error":"Unknown command: ..."}.
//! Commands that require rendering (select_at, pick_at, etc.) return a "requires rendering"
//! error, which is still a handled response.
//!
//! This test catches missing dispatch arms — e.g. a new command added to schema_entries()
//! but not wired into headless.rs dispatch_* methods.
//!
//! Run: cargo test -p truck-cad --no-default-features --features native --test boundary

#![cfg(feature = "native")]

#[test]
fn all_schema_commands_handled_by_headless() {
    let schema = truck_cad::commands::build_schema();
    let commands = schema["commands"].as_object()
        .expect("cad-schema.json should have a commands object");
    let boundaries = schema["boundaries"]["modules"]["truck-geometry"]["exports"]
        .as_array()
        .expect("boundaries.modules.truck-geometry.exports should be an array");

    // Verify boundary exports match command keys
    let cmd_names: std::collections::HashSet<&str> = commands.keys().map(|s| s.as_str()).collect();
    for export in boundaries {
        let name = export.as_str().unwrap();
        assert!(cmd_names.contains(name),
            "Boundary export '{}' is not in commands — boundaries and commands are out of sync", name);
    }

    // Create a HeadlessController and verify every command is dispatched (not "Unknown command")
    let mut controller = truck_cad::headless::HeadlessController::new();
    let mut unhandled = Vec::new();

    for cmd_name in commands.keys() {
        // Send with empty params — we don't care about the result, just that it's dispatched
        let result_json = controller.execute(cmd_name, "{}");
        let result: serde_json::Value = serde_json::from_str(&result_json)
            .unwrap_or_else(|_| panic!("execute({}) returned invalid JSON: {}", cmd_name, result_json));

        if let Some(err) = result.get("error").and_then(|e| e.as_str()) {
            if err.starts_with("Unknown command:") {
                unhandled.push(cmd_name.clone());
            }
        }
    }

    assert!(unhandled.is_empty(),
        "\nThese commands are in cad-schema.json but not handled by HeadlessController::execute():\n  {}\n\
         Add dispatch arms in headless.rs for each missing command.",
        unhandled.join(", "));
}

#[test]
fn generated_command_list_matches_schema() {
    use truck_cad::commands_generated::{COMMAND_NAMES, command_domain};

    let schema = truck_cad::commands::build_schema();
    let commands = schema["commands"].as_object().unwrap();

    // Every schema command should be in the generated COMMAND_NAMES
    for cmd_name in commands.keys() {
        assert!(COMMAND_NAMES.contains(&cmd_name.as_str()),
            "Schema command '{}' missing from generated COMMAND_NAMES", cmd_name);
    }

    // Every generated name should be in the schema
    for &name in COMMAND_NAMES {
        assert!(commands.contains_key(name),
            "Generated COMMAND_NAMES has '{}' but it's not in schema commands", name);
    }

    // Every command should have a domain
    for &name in COMMAND_NAMES {
        assert!(command_domain(name).is_some(),
            "Generated command_domain('{}') returned None", name);
    }
}

#[test]
fn sync_boundary_exports_match_wasm_module() {
    let schema = truck_cad::commands::build_schema();
    let sync_exports = schema["boundaries"]["modules"]["truck-sync"]["exports"]
        .as_array()
        .expect("boundaries.modules.truck-sync.exports should be an array");

    // These are the WASM exports from the sync crate — verify they're all listed
    let expected = vec![
        "create_doc", "apply_op", "merge_docs", "get_ops",
        "set_op_enabled", "set_group_enabled", "rollback_to",
        "export_ops_since", "validate_op", "get_replay_ops",
        "get_name", "set_name",
    ];

    let actual: Vec<&str> = sync_exports.iter().map(|v| v.as_str().unwrap()).collect();
    for exp in &expected {
        assert!(actual.contains(exp),
            "Expected sync export '{}' not found in boundaries", exp);
    }
}
