# Proposal: Monstertruck API Alignment with Upstream truck

**To:** Moritz Moeller (virtualritz)
**From:** Gerard Webb / plat-trunk team
**Date:** 2026-03-06
**Re:** Making monstertruck a drop-in replacement for ricosjp/truck

---

## TL;DR

We use both truck and monstertruck in production and work directly with the ricosjp team. Monstertruck adds capabilities we need (fillets, T-splines, Result-based booleans), but **every API rename forces us to maintain two codepaths** and prevents patches from flowing between the two projects. We're proposing that monstertruck keep its existing `#[deprecated]` type aliases and add `pub use` function/module aliases for upstream names — ~18 lines across 4 crates, zero runtime cost — so code written against truck compiles against monstertruck with minimal changes.

## Context: We're Invested in Both Projects

We're in direct communication with Tanimura-san and his manager at RICOS. They use truck on real projects. We use monstertruck for its superior boolean API and fillet engine. Our goal is to help **both projects benefit from each other's work** — not to pick sides.

Right now, the API divergence makes that impossible. A bug fix written against truck can't be applied to monstertruck without renaming everything first. A new feature in monstertruck can't be proposed upstream without reversing the renames. The two codebases are drifting apart unnecessarily.

## The Problem: Unnecessary Migration Tax

We maintain a flip script ([truck-update.sh](../scripts/truck-update.sh)) that switches between truck and monstertruck. It works, but it requires **174 lines of sed** to handle renames that don't need to exist.

### Current divergences (complete audit — 2026-03-07)

#### 1. Crate name renames (10 renames)

| upstream (truck) | monstertruck | Functionally different? |
|-----------------|--------------|------------------------|
| `truck-modeling` | `monstertruck-modeling` | No — same types, same API |
| `truck-shapeops` | `monstertruck-solid` | **Yes** — adds `difference()`, `symmetric_difference()`, `Result<Solid, ShapeOpsError>` |
| `truck-meshalgo` | `monstertruck-meshing` | No — same trait names, same methods |
| `truck-rendimpl` | `monstertruck-render` | No |
| `truck-platform` | `monstertruck-gpu` | No |
| `truck-base` | `monstertruck-core` | No |
| `truck-stepio` | `monstertruck-step` | **Yes** — `out` -> `save`, `in` -> `load` |
| `truck-polymesh` | `monstertruck-mesh` | No |
| `truck-topology` | `monstertruck-topology` | No |
| `truck-assembly` | `monstertruck-assembly` | No |

New crates with no upstream equivalent: `monstertruck-traits`, `monstertruck-derive`, `monstertruck-geometry`, `monstertruck-wasm` — **these are fine**, no rename conflict.

#### 2. Function/method renames (5 renames)

| upstream (truck) | monstertruck | Fix mechanism | Notes |
|-----------------|--------------|---------------|-------|
| `builder::tsweep()` | `builder::extrude()` | `pub use extrude as tsweep;` | Same signature, same behavior |
| `builder::rsweep()` | `builder::revolve()` | `pub use revolve as rsweep;` | Same signature, same behavior |
| `.robust_triangulation()` | `.triangulation()` | Deprecated wrapper method | Method on PolygonMesh/meshing trait |
| `.interpole()` | `.interpolate()` | Deprecated wrapper method | Method on BsplineCurve |
| `.try_interpole()` | `.try_interpolate()` | Deprecated wrapper method | Method on BsplineCurve |

#### 3. Module renames (2 renames)

| upstream (truck) | monstertruck | Fix mechanism | Notes |
|-----------------|--------------|---------------|-------|
| `truck_stepio::out` | `monstertruck_step::save` | `pub use save as out;` | Same functions inside |
| `truck_stepio::r#in` | `monstertruck_step::load` | `pub use load as r#in;` | `r#in` is ugly, but it's what upstream calls it |

#### 4. Type renames — RFC 430 (14+ renames)

All follow Rust API Guidelines RFC 430 (acronyms as words, type-at-end). Monstertruck already provides `pub type` aliases for many of these, marked with `#[deprecated]`.

| upstream (truck) | monstertruck | Crate | Notes |
|-----------------|--------------|-------|-------|
| `ID<T>` | `Id<T>` | core | Has deprecated alias |
| `VertexID<P>` | `VertexId<P>` | topology | Has deprecated alias |
| `EdgeID<C>` | `EdgeId<C>` | topology | Has deprecated alias |
| `FaceID<S>` | `FaceId<S>` | topology | Has deprecated alias |
| `RenderID` | `RenderId` | gpu | Has deprecated alias |
| `BSplineCurve<P>` | `BsplineCurve<P>` | geometry | Has deprecated alias |
| `BSplineSurface<P>` | `BsplineSurface<P>` | geometry | Has deprecated alias |
| `KnotVec` | `KnotVector` | geometry | Has deprecated alias |
| `PCurve<C, S>` | `ParameterCurve<C, S>` | geometry | Has deprecated alias |
| `SPHint1D` | `SearchParameterHint1D` | traits | Has deprecated alias |
| `SPHint2D` | `SearchParameterHint2D` | traits | Has deprecated alias |
| `BSplineCurveForm` | `BsplineCurveForm` | step | STEP loader internal |
| `BSplineSurfaceForm` | `BsplineSurfaceForm` | step | STEP loader internal |
| `PCurve` (STEP) | `Pcurve` | step | STEP loader internal |
| + ~6 more BSpline* variants | BsplineXxx | step | STEP loader internals |

#### 5. Enum variant renames (HARDEST — no clean alias)

| upstream (truck) | monstertruck | Problem |
|-----------------|--------------|---------|
| `Curve::BSplineCurve` | `Curve::BsplineCurve` | `pub use` can't alias an enum variant — pattern matches break |

This is the one rename that has **no zero-cost fix**. Options: (a) keep both variants with a `From` impl, (b) accept the break, (c) macro that matches both.

#### 6. New APIs (no conflict — additions only)

These exist only in monstertruck. No alias needed — they're new capabilities:

| API | Crate | What |
|-----|-------|------|
| `difference()` | solid | Boolean difference (A - B) |
| `symmetric_difference()` | solid | Boolean XOR |
| `ShapeOpsError` | solid | Proper error type for boolean Result API |
| `fillet()`, `fillet_edges()`, etc. | solid | Fillet engine (addresses upstream issue #53) |
| `FilletOptions`, `FilletCurve`, `FilletError` | solid | Fillet types |
| T-spline module | geometry | T-spline and T-NURCC surfaces (addresses upstream issue #13) |
| `monstertruck-traits` crate | traits | Extracted search parameter traits |
| `monstertruck-derive` crate | derive | Derive macros |

## What We're Asking For

### Keep upstream names as aliases (zero-cost, non-breaking)

For every rename, add a `pub use` alias so upstream names still work:

```rust
// monstertruck-modeling/src/builder.rs
pub fn extrude<T, Swept>(elem: &T, vector: Vector3) -> Swept { ... }

// Alias -- lets truck code compile without changes
pub use extrude as tsweep;
pub use revolve as rsweep;
```

```rust
// monstertruck-modeling/src/geometry.rs
pub enum Curve {
    BsplineCurve(BsplineCurve<Point3>),  // monstertruck name
    // ...
}
// Alias for upstream compat
pub use BsplineCurve as BSplineCurve;  // (or vice versa via type alias)
```

```rust
// monstertruck-step/src/lib.rs
pub mod save;
pub mod load;

// Aliases
pub use save as out;
pub use load as r#in;  // yes it's ugly, but it's what upstream calls it
```

### Optional: `truck-compat` meta-crate

If you're open to it, a small `truck-compat/` crate that re-exports all `monstertruck-*` crates under their `truck-*` names would let existing truck users switch by changing one line in `Cargo.toml`. But the function/module aliases above are the main ask — those alone eliminate the bulk of the migration work.

## Why This Matters

### 1. Patches should flow both directions — and upstream review bandwidth is limited

We work directly with Tanimura-san and his manager at RICOS. The reality is that truck is maintained by one person who also gets pulled onto real-world client projects. That's not a criticism — it's the situation. PR review bandwidth is naturally limited when you're also shipping production work.

This is exactly why API alignment matters. If monstertruck and truck share the same API surface:
- **Fixes land in whichever project has bandwidth first**, and apply cleanly to the other
- **Community contributors don't have to pick a side** — a PR written against truck works on monstertruck and vice versa
- **When Tanimura-san has time to review**, patches are already tested and proven in monstertruck (or the other way around)
- **Moritz gets community PRs for free** — those 8 open PRs against ricosjp/truck could be tested and merged into monstertruck today if the API matched

The rename wall turns a one-project contribution into a two-project translation exercise. Nobody has time for that.

### 2. What Moritz gets out of this

To be direct about the benefit to monstertruck specifically:
- **Larger user base** — every truck user can evaluate monstertruck with zero code changes. Lower switching cost = more adoption.
- **Community PRs become portable** — bug fixes and improvements written against truck apply directly to monstertruck. Free maintenance help.
- **Co-maintainers who work on both** — we (and others) can contribute to both projects without maintaining parallel patch sets. That's more hands on monstertruck's code.
- **Credibility as the upgrade path** — "drop-in replacement with strictly more features" is a much stronger pitch than "better but you have to rename everything."

### 3. Our concrete cost today

We maintain:
- 174-line sed flip script
- 10 crate name mappings, 5 function/method renames, 2 module renames, 14+ type renames, 1 enum variant rename
- Version sync logic (all monstertruck crates must match)
- Two separate composite branches in our fork

With aliases, our flip script reduces to: crate name swaps + enum variant (Cargo.toml + one sed). The bulk of the source code changes disappear.

### 4. The `tsweep`/`rsweep` names are actually standard

These come from CAD kernel terminology (translational sweep, rotational sweep). `extrude` and `revolve` are the UI/user-facing terms. Both are valid. Keeping both via aliases costs nothing and respects both naming conventions.

## What We're NOT Asking For

- We're NOT asking you to revert the internal restructuring (16 crates is great for build times)
- We're NOT asking you to remove the new names — `extrude()` is a better name for users
- We're NOT asking you to match upstream's behavior where monstertruck improved it
- We're NOT asking you to slow down development

We're asking for **`pub use` aliases and `pub type` aliases** so both name sets work. Zero runtime cost.

## Proposed Implementation

### Already done by monstertruck (just keep them)

Monstertruck already provides `#[deprecated]` type aliases for many RFC 430 renames (`ID→Id`, `VertexID→VertexId`, `KnotVec→KnotVector`, etc.). **These just need to stay** — don't remove them.

### Still needed

| Crate | Change | Mechanism | Lines |
|-------|--------|-----------|-------|
| `monstertruck-modeling` | `tsweep`, `rsweep` aliases | `pub use extrude as tsweep; pub use revolve as rsweep;` | 2 |
| `monstertruck-step` | `out`, `r#in` module aliases | `pub use save as out; pub use load as r#in;` | 2 |
| `monstertruck-meshing` | `robust_triangulation` wrapper | Deprecated method that calls `.triangulation()` | 3 |
| `monstertruck-geometry` | `interpole`, `try_interpole` wrappers | Deprecated methods that call `.interpolate()` / `.try_interpolate()` | 6 |
| Root `Cargo.toml` | Compat mapping documentation | `[package.metadata.truck-compat]` section | 5 |

**Total: ~18 lines across 4 crates.**

### The enum variant problem (unsolved)

`Curve::BSplineCurve` → `Curve::BsplineCurve` — can't alias an enum variant with `pub use`. Options:

1. **Keep both variants** with a `From` impl (adds a match arm, not zero-cost in code size)
2. **Accept the break** (our flip script already handles this)
3. **Macro** that matches both (ugly, fragile)

Recommendation: accept the break for enum variants. Our flip script handles it. The type aliases and function aliases cover 95%+ of compatibility.

## We Want to Help

We're offering to submit the PR. We've already mapped every divergence and tested both directions. If you agree with the approach, we can have it ready within a day.

We want truck and monstertruck to converge, not diverge. API compatibility is what makes that possible — it benefits Moritz, it benefits the ricosjp team, and it benefits every downstream user who shouldn't have to choose between the two.

---

*plat-trunk is a production CAD platform built on truck/monstertruck. We ship WASM to Cloudflare Workers with 29 MCP tools for AI-driven CAD. We use monstertruck's Result-based boolean API and fillet engine in production, and work directly with the ricosjp team.*

---

## Status Log

### 2026-03-06 — Moritz's reply

**Maintainer access:** Invite sent to `joeblew999` on the monstertruck GitHub org. Check GitHub notifications to accept.

**Boolean engine:** Moritz is building a clean room boolean engine based on state-of-the-art SSI (Surface-Surface Intersection) research. Key points:
- **Purely symbolic/analytic** — NOT tessellation-based. He says tessellation-based approaches (like truck's current boolean ops) "will always explode in your face in edge cases."
- **Not yet decided if OSS** — he's invested ~a week of spare time. We cannot count on getting this code.
- **No code from researchers** — clean room from papers only.
- **Interesting IP question** — he raised whether LLM-generated "clean room" implementations of LGPL code (like OCCT) would be (L)GPL. Referenced https://lucumr.pocoo.org/2026/3/5/theseus/

**Crate naming convention confirmed:** Follows Rust API Guidelines (RFC 430), common CAD terminology, type-at-end convention. Example: `RevoluteCurve` (how it was constructed) → `RevolutionSurface` (what was constructed, in CAD terms `SurfaceOfRevolution` but with type at end for consistency).

**Implications for us:**
1. Accept the GitHub maintainer invite immediately.
2. The `pub use` alias proposal is still the right ask — his naming rationale is sound but aliases cost nothing.
3. Don't depend on his boolean engine being available. Our `try_bool_op` with perturbation fallback (ADR-0002 / GeometryStore) must stay robust independently.
4. If his symbolic boolean engine does become available, it would replace the tessellation-based booleans in `lib.rs` — GeometryStore calls `lib::bool_union()` etc., so the swap is clean regardless.
