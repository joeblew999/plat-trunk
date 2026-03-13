//! Observability primitives compiled to WASM.
//!
//! Runs identically in browser (via setupBrowserLog) and CF Workers (via worker routes).
//! All pure functions — no side effects, no async, no JS interop beyond wasm-bindgen.
//!
//! Test natively with `cargo test -p plat-observe`.
//! Build WASM with `wasm-pack build lib/observe/crate --out-dir ../pkg --target bundler`.

pub mod types;

use wasm_bindgen::prelude::*;

// ── Sensitive field scrubbing ─────────────────────────────────────────────────
//
// Mirrors the TS scrubbing logic in the log buffer — same list of sensitive keys,
// same [REDACTED] replacement. Keeping both in sync is verified by the demo tests.

const SENSITIVE_KEYS: &[&str] = &[
    "password", "passwd", "secret", "token", "authorization",
    "credential", "credentials", "apikey", "api_key", "private_key",
    "access_token", "refresh_token", "auth",
];

/// Scrub a JSON log entry string: redact values for any sensitive keys.
/// Returns the scrubbed JSON string. Invalid JSON is returned unchanged.
#[wasm_bindgen]
pub fn scrub_entry(json: &str) -> String {
    match serde_json::from_str::<serde_json::Value>(json) {
        Ok(mut val) => {
            scrub_value(&mut val);
            serde_json::to_string(&val).unwrap_or_else(|_| json.to_string())
        }
        Err(_) => json.to_string(),
    }
}

fn scrub_value(val: &mut serde_json::Value) {
    match val {
        serde_json::Value::Object(map) => {
            for (k, v) in map.iter_mut() {
                if SENSITIVE_KEYS.iter().any(|&s| k.eq_ignore_ascii_case(s)) {
                    *v = serde_json::Value::String("[REDACTED]".into());
                } else {
                    scrub_value(v);
                }
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                scrub_value(item);
            }
        }
        _ => {}
    }
}

// ── Sampling ──────────────────────────────────────────────────────────────────
//
// Deterministic sampling: given a rate [0.0, 1.0] and a seed (e.g. request count
// or trace ID hash), returns true if this entry should be kept.
// rate=1.0 → always keep. rate=0.0 → always drop. rate=0.1 → keep 10%.

/// Decide whether to keep a log entry based on sampling rate and a seed value.
/// Deterministic: same (rate, seed) always returns the same result.
#[wasm_bindgen]
pub fn sample_keep(rate: f64, seed: u32) -> bool {
    if rate >= 1.0 { return true; }
    if rate <= 0.0 { return false; }
    // Cheap deterministic hash: map seed → [0, 1)
    let h = lcg_hash(seed) as f64 / u32::MAX as f64;
    h < rate
}

fn lcg_hash(x: u32) -> u32 {
    // LCG constants from Knuth
    x.wrapping_mul(1664525).wrapping_add(1013904223)
}

// ── Trace context ─────────────────────────────────────────────────────────────
//
// W3C traceparent header format: 00-{trace_id}-{span_id}-{flags}
// trace_id: 32 lowercase hex chars (128-bit)
// span_id:  16 lowercase hex chars (64-bit)

/// Format a W3C traceparent header value from two u64 halves of the trace ID and a span ID.
/// Returns "00-{trace_id}-{span_id}-01"
#[wasm_bindgen]
pub fn format_traceparent(trace_hi: u64, trace_lo: u64, span_id: u64) -> String {
    format!(
        "00-{:016x}{:016x}-{:016x}-01",
        trace_hi, trace_lo, span_id
    )
}

/// Parse a W3C traceparent header and extract the trace ID (32 hex chars).
/// Returns an empty string if the header is invalid.
#[wasm_bindgen]
pub fn parse_trace_id(traceparent: &str) -> String {
    let parts: Vec<&str> = traceparent.split('-').collect();
    if parts.len() >= 4 && parts[0] == "00" && parts[1].len() == 32 {
        parts[1].to_string()
    } else {
        String::new()
    }
}

/// Returns the crate version — used by the demo to verify the WASM loaded correctly.
#[wasm_bindgen]
pub fn observe_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ── Native tests ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrub_redacts_password() {
        let input = r#"{"event":"login","password":"hunter2","userId":"u1"}"#;
        let out: serde_json::Value = serde_json::from_str(&scrub_entry(input)).unwrap();
        assert_eq!(out["password"], "[REDACTED]");
        assert_eq!(out["userId"], "u1");
    }

    #[test]
    fn scrub_redacts_token_case_insensitive() {
        let input = r#"{"Token":"abc123","level":"warn"}"#;
        let out: serde_json::Value = serde_json::from_str(&scrub_entry(input)).unwrap();
        assert_eq!(out["Token"], "[REDACTED]");
    }

    #[test]
    fn scrub_passes_through_invalid_json() {
        let bad = "not json at all";
        assert_eq!(scrub_entry(bad), bad);
    }

    #[test]
    fn scrub_nested() {
        let input = r#"{"data":{"secret":"s3cr3t","name":"alice"}}"#;
        let out: serde_json::Value = serde_json::from_str(&scrub_entry(input)).unwrap();
        assert_eq!(out["data"]["secret"], "[REDACTED]");
        assert_eq!(out["data"]["name"], "alice");
    }

    #[test]
    fn sample_keep_rate_1() {
        for seed in 0..100 { assert!(sample_keep(1.0, seed)); }
    }

    #[test]
    fn sample_keep_rate_0() {
        for seed in 0..100 { assert!(!sample_keep(0.0, seed)); }
    }

    #[test]
    fn sample_keep_rate_half_is_deterministic() {
        // Same seed → same result
        let r1 = sample_keep(0.5, 42);
        let r2 = sample_keep(0.5, 42);
        assert_eq!(r1, r2);
    }

    #[test]
    fn format_traceparent_roundtrip() {
        let tp = format_traceparent(0xdeadbeef12345678, 0xabcdef0987654321, 0x1122334455667788);
        assert!(tp.starts_with("00-"));
        assert_eq!(tp.len(), 55); // "00-" + 32 + "-" + 16 + "-01"
        let trace_id = parse_trace_id(&tp);
        assert_eq!(trace_id.len(), 32);
    }

    #[test]
    fn parse_trace_id_invalid() {
        assert_eq!(parse_trace_id("not-a-traceparent"), "");
        assert_eq!(parse_trace_id(""), "");
    }
}
