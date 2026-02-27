// Native Rust binary for build-time JSON Schema generation.
// Runs on the host (no WASM, no browser, no WebGPU).
// Output: cad-schema.json to stdout.
//
// Usage: cargo run --bin generate-schema > web/cad-schema.json

fn main() {
    let schema = truck_webgpu_gui::commands::build_schema();
    println!("{}", serde_json::to_string_pretty(&schema).unwrap());
}
