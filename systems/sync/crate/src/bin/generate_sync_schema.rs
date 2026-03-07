fn main() {
    let schema = schemars::schema_for!(truck_sync::Op);
    println!("{}", serde_json::to_string_pretty(&schema).unwrap());
}
