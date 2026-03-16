# ADR-0014: CAD to Machine Interface — Direct Truck Query, Not STEP

**Status:** Accepted  
**Date:** March 2026  
**Author:** Gerard Webb

---

## Context

plat-trunk needs to generate Howick FRAMA CSV files from CAD geometry.
The question is: what is the interface between the CAD system (Truck B-Rep
kernel) and the manufacturing output layer (`howick-rs`)?

Two options were considered:

### Option A — STEP as interface (decoupled)

```
Truck B-Rep → STEP export → frame extractor → howick-rs → CSV
```

STEP (ISO 10303) is the standard neutral CAD exchange format. Any CAD tool
that exports STEP would work. Clean decoupling — `howick-rs` becomes
independent of plat-trunk entirely.

### Option B — Direct Truck query (semantic)

```
Truck B-Rep → frame extractor (queries Truck topology) → howick-rs → CSV
```

The frame extractor queries the Truck B-Rep model directly using Truck's
native API — querying vertices, edges, faces, and their relationships.

---

## Decision: Option B — Direct Truck query, with a clean trait boundary

**STEP is not the interface. The `Frameset` struct is.**

The interface between CAD and manufacturing is:

```rust
// In howick-rs — stable, public, versioned
pub struct Frameset { ... }
pub struct Component { ... }
pub enum Operation { ... }

// In plat-trunk — internal, Truck-specific
trait FrameExtractor {
    fn extract(&self, model: &TruckModel) -> Result<Vec<Frameset>>;
}
```

`howick-rs` knows nothing about Truck. It only knows `Frameset`.  
plat-trunk's `FrameExtractor` knows Truck, produces `Frameset`.  
That IS the decoupling point.

---

## Why Not STEP

### 1. STEP loses manufacturing semantics

STEP describes geometry — what a part *looks like* in 3D space.
It does not describe manufacturing intent:
- Which faces are the flanges of a C-section?
- Which edges are connection points requiring dimples?
- What is the stud spacing rule at this connection?
- Which openings require NOTCH operations?

A STEP parser would have to re-infer all of this from raw geometry.
That is harder and less reliable than querying Truck directly.

### 2. Truck already has the answers

When a designer places a stud at 600mm centres in plat-trunk, Truck knows:
- The exact member length
- The connection points at each end
- The faces, edges, and vertices of the C-section

Querying Truck directly gives precise, semantically rich answers in one step.
Re-deriving the same information from STEP geometry is error-prone.

### 3. STEP round-trip introduces precision loss

STEP uses floating point representation. For manufacturing at ±0.5mm
tolerance, re-parsing STEP could introduce small but real rounding errors.
Direct Truck query is lossless.

### 4. STEP is slower to implement correctly

A robust STEP parser for steel framing geometry is a significant project.
Direct Truck query uses existing APIs already understood by the team.

---

## Why the `Frameset` boundary is still clean decoupling

The decoupling goal is: **howick-rs should not depend on plat-trunk**.

This is achieved by `Frameset` being the stable interface:

```
plat-trunk (Truck) ──→ FrameExtractor ──→ Frameset ──→ howick-rs ──→ CSV
                         (internal)        (public)     (public)
```

- `howick-rs` is a standalone public crate. Zero plat-trunk dependency.
- Any other tool (Revit plugin, Tekla script, custom app) can produce
  `Frameset` structs and use `howick-rs` to generate CSV.
- If a STEP-based extractor is ever needed, it implements `FrameExtractor`
  and produces `Frameset` — no changes to `howick-rs` required.

The STEP path remains possible in the future. It is simply not the MVP path.

---

## The `FrameExtractor` trait (to be implemented)

```rust
// plat-trunk internal — src/manufacturing/frame_extractor.rs

use howick_rs::types::Frameset;
use truck_modeling::Solid;  // Truck B-Rep type

pub trait FrameExtractor: Send + Sync {
    /// Extract all framesets from a Truck model.
    /// One Frameset per structural panel (wall, truss, floor).
    fn extract(&self, solid: &Solid) -> anyhow::Result<Vec<Frameset>>;
}

/// Query Truck B-Rep to identify steel framing members.
/// Produces Frameset structs ready for howick-rs CSV serialisation.
pub struct TruckFrameExtractor {
    pub stud_spacing_mm: f64,       // e.g. 600.0
    pub profile_code: String,       // e.g. "S8908"
}

impl FrameExtractor for TruckFrameExtractor {
    fn extract(&self, solid: &Solid) -> anyhow::Result<Vec<Frameset>> {
        // 1. Identify linear members (edges with C-section faces)
        // 2. Calculate lengths from edge geometry
        // 3. Derive dimple positions from stud_spacing_mm
        // 4. Derive lip-cut positions from connection topology
        // 5. Identify notch positions from opening geometry
        // 6. Identify service hole positions (default pattern or explicit)
        // 7. Assemble into Frameset { components: [...] }
        todo!("TruckFrameExtractor — Phase 1 implementation")
    }
}
```

---

## Implementation Phases

### Phase 0 — Current (done)
- `howick-rs` crate: parser, serialiser, types, 14 tests
- Real factory CSV files as fixtures (T1 truss, W1 wall)
- `Frameset` struct is the stable interface

### Phase 1 — Simple wall panels
- `TruckFrameExtractor` for rectangular wall panels
- Fixed stud spacing (600mm), no openings
- Enough to generate a real CSV for Prin's factory

### Phase 2 — Openings
- Door and window openings → NOTCH operations
- Header/sill members above/below openings
- Jamb studs at opening edges

### Phase 3 — Trusses
- Roof truss geometry extraction
- Web member pattern derivation
- END_TRUSS angle calculation

### Phase 4 — Full building
- Multi-panel jobs → multiple Framesets in one submission
- Floor panels (joists, bearers)
- Service routing → SERVICE_HOLE positions

---

## Related

- ADR-0013: Factory hardware integration (Howick + OPC UA)
- ADR-0012: Deployment topologies
- ADR-0005: Scene graph with assembly hierarchy
- howick-rs: https://github.com/joeblew999/howick-rs
- Truck kernel: https://github.com/ricosjp/truck
