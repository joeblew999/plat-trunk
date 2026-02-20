# [ADR-009] Parametric Modeling

## Status

**Future** — Direct modeling is shipped (primitives, transforms, booleans, sketch/extrude). Parametric constraints not started.

## Vision

Provide both direct and parametric modeling:
- **Architects**: Direct modeling (SketchUp-style) for quick iteration
- **Mechanical engineers**: Parametric constraints (Fusion 360-style) for precision manufacturing

## Constraint Solver: ezpz

[ezpz](https://github.com/KittyCAD/ezpz) — a Rust constraint solver from Zoo/KittyCAD.

- High-performance solver for geometric constraints
- Takes constraints and solves positions/dimensions of entities
- Has its own text format for defining problems (e.g., `point p, p.x = 0, vertical(p, q)`)
- Allows "direct" mouse movements to be solved against constraints in real-time

ezpz is cloned to `.src/ezpz/` and managed by `task ezpz:deps:clone`.

## How It Fits

The goal is a system where direct mouse movements are solved against constraints, keeping the model mathematically valid and STEP-exportable:

1. User drags a face (direct manipulation)
2. ezpz resolves the drag against active constraints
3. truck B-Rep updates with the constrained result
4. WebGPU re-renders

## Prerequisites

- Sketch tool (shipped — line, rect, triangle, extrude)
- 2D constraint definitions (not started)
- Integration of ezpz solver with truck geometry (not started)

