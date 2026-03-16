# ADR-0013: Factory Hardware Integration — Howick + OPC UA

**Status:** Proposed  
**Date:** March 2026  
**Author:** Gerard Webb  
**Customer:** Prin, Si Racha Steel Framing Factory, Thailand

---

## Context

The first concrete factory customer (Prin, Si Racha, Thailand) has two
roll-forming machines:

- **Howick FRAMA** — open CSV format, made by Howick Ltd, Auckland NZ
- **FRAMECAD machine** — proprietary RFY/XML format, gateway via Nexa API

Currently Prin uses **SketchUp + FrameBuilderMRD** to generate CSV files,
which are manually transferred to the Howick machine (USB stick or network
share). This is the pain point plat-trunk can eliminate.

A sample CSV from a real job (T1 roof truss + W1 wall panel) has been
analysed and is captured in the `howick-rs` crate.

---

## The CSV Format (Howick)

```
UNIT,MILLIMETRE
PROFILE,S8908,Standard Profile
FRAMESET,W1
COMPONENT,W1-1,LABEL_NRM,1,4740.0,DIMPLE,20.65,...,NOTCH,1149.35,...
```

Each COMPONENT row: `id, orientation, qty, length_mm, [operation, position_mm, ...]`

**Seven operation types confirmed from real factory files:**

| Operation | Meaning |
|-----------|---------|
| `DIMPLE` | Raised bump for screw location — pairs at each connection |
| `LIP_CUT` | Cuts C-section lip at connection notch — pairs ~0.16mm apart |
| `SWAGE` | Crimp at chord-to-web joints (trusses) |
| `WEB` | Hole through web for structural bolts |
| `END_TRUSS` | Truss end cut angle — pair (length, 0.0) |
| `NOTCH` | Flange cutout at door/window openings |
| `SERVICE_HOLE` | Large hole for electrical/plumbing/HVAC services |

**Profile:** S8908 = C-section, 89mm web, 0.8mm gauge (to be confirmed)  
**Label orientation:** LABEL_NRM / LABEL_INV — mirrored pairs for C-section direction  
**Upstream software:** FrameBuilderMRD (confirmed by Prin, March 2026)

---

## Decision

### 1. `howick-rs` — open source Rust crate

A standalone public crate that parses and generates Howick CSV files.
Deliberately kept separate from plat-trunk so any CAD tool can use it.

- Repo: https://github.com/joeblew999/howick-rs
- Crates.io: planned
- Tests: 14 tests against real factory files (T1 truss + W1 wall)
- License: MIT OR Apache-2.0

plat-trunk adds it as a dependency:
```toml
howick-rs = { git = "https://github.com/joeblew999/howick-rs" }
```

### 2. `opcua-howick` — edge agent

A Rust binary that runs on a small compute module on the factory LAN
(Raspberry Pi, NUC, or the same desktop running Tauri).

- Repo: https://github.com/joeblew999/opcua-howick
- Exposes an OPC UA server (port 4840) with the Howick machine address space
- Watches a job input folder for new CSV files from plat-trunk
- Drops CSV to the machine's input directory
- Pushes machine status back to plat-trunk via HTTP

**OPC UA address space:**
```
/Howick/Machine/Status           (Offline | Idle | Running | Error)
/Howick/Machine/CurrentJob       (frameset name)
/Howick/Machine/PiecesProduced   (u32)
/Howick/Machine/CoilRemaining    (f64, metres)
/Howick/Machine/LastError        (string)
/Howick/Jobs/QueueDepth          (u32)
/Howick/Jobs/CompletedCount      (u32)
```

### 3. Protocol: OPC UA (IEC 62541)

OPC UA is the industry standard for heterogeneous industrial hardware.
Chosen because:
- Hardware vendor-neutral — any machine can expose an OPC UA server
- Manufacturer independence — we talk one protocol to everything
- Future-proof — if Howick or FRAMECAD add OPC UA support, we're ready
- The Rust crate (`async-opcua`) is pure Rust, tokio-native, MPL-2.0

Current Howick interface is CSV file drop (not OPC UA). OPC UA is used
for the edge agent's own server, exposing machine state to plat-trunk.

### 4. Topology-agnostic design

opcua-howick is configured with a `plat_trunk_url` pointing to either:
- `https://your-worker.workers.dev` (Topology A — Cloud)
- `http://localhost:3000` (Topology B/C — Tauri on factory LAN)

It never knows or cares which. Same HTTP API either way.

---

## The Full Pipeline

```
Architect/Designer
        │
        ▼
plat-trunk browser (B-Rep CAD, Truck kernel)
        │
        │ geometry → frame extraction → howick-rs → CSV bytes
        ▼
CF Worker / Tauri local server
        │
        │ CSV file → R2 or local FS job queue
        ▼
opcua-howick (edge agent on factory LAN)
        │
        ├── OPC UA server (machine state visible to network)
        └── file drop → machine input directory
                │
                ▼
        Howick FRAMA Machine
                │
                ▼
        Physical steel members (cut, punched, labelled)
                │
                ▼
        Assembly on site
```

---

## What plat-trunk Must Build

### Frame geometry extractor

A Rust module that queries the Truck B-Rep model and extracts:
- Wall panels (dimensions, stud spacing, door/window openings)
- Roof trusses (span, pitch, web pattern)
- Floor panels (joist spacing, bearer positions)

Outputs: `howick_rs::Frameset` structs (not CSV — `howick-rs` handles serialisation).

### Member calculator

Given a panel/truss geometry, calculate:
- Individual member lengths
- Dimple positions (from stud spacing)
- Lip cut positions (from connection notch geometry)
- Notch positions (from door/window opening edges)
- Service hole positions (from services routing, or default pattern)

This is the domain logic that bridges B-Rep geometry → Howick operations.

### Job submission API

Hono endpoint: `POST /api/jobs/howick`  
Accepts: frameset name + CSV bytes (or generates from model ID)  
Stores: CSV to R2 / local FS job queue  
Triggers: opcua-howick picks up via file watcher

---

## Open Questions (for Prin)

1. What model is the Howick machine? (size → model number)
2. Is S8908 always the same profile or varies per job?
3. How are files currently transferred — USB or network share?
4. What is the exact network path the machine watches?
5. Does the FRAMECAD machine also use FrameBuilderMRD or different software?
6. Would Prin trial plat-trunk generating CSV directly for one job?

---

## Future: FRAMECAD Integration

The FRAMECAD machine uses proprietary RFY/XML format. Options:
1. Reverse-engineer from exported samples (XML is readable)
2. Use FRAMECAD Nexa API (Builder tier) — HTTP API exists
3. CSV path — Nexa also accepts CSV, which bridges both machines

CSV → both machines is the MVP path. Nexa API is phase 2.

---

## Related

- ADR-0012: Deployment topologies (Cloud, LAN, Hybrid)
- ADR-0005: Scene graph with assembly hierarchy
- ADR-0008: Sync architecture
- howick-rs: https://github.com/joeblew999/howick-rs
- opcua-howick: https://github.com/joeblew999/opcua-howick
- async-opcua: https://github.com/FreeOpcUa/async-opcua
- Howick Ltd: https://www.howickltd.com
- FrameBuilderMRD: https://www.framebuilder.com.au (to be confirmed)
