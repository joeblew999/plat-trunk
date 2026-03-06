# Sketch and Extrude

Create 3D solids from 2D constrained sketches. This is the parametric modeling workflow: draw a 2D profile, add geometric constraints, solve, then extrude into a 3D solid.

## Quick Start: Rectangle Extrude

The fastest way to create a parametric solid:

1. Switch to the **Sketch** tab (click dock button or press **S**)
2. Set **W** and **H** for your rectangle dimensions
3. Click **Rect** — creates a fully constrained rectangle
4. Set **extrude height** and click **Extrude**

A new 3D box appears in the scene, created from the constrained 2D sketch.

Or use MCP: `quick_rect_extrude { width: 2, height: 1, depth: 0.5 }` — one tool call.

## Full Sketch Workflow

### 1. Begin Sketch

- Select a sketch plane: **XY**, **XZ**, or **YZ**
- Click **Begin Sketch** to enter sketch mode

### 2. Add Points

- Enter **x** and **y** coordinates
- Click **+Pt** to add each point
- Points appear in the dropdowns for edges and constraints

### 3. Add Edges

- Select two points from the **P0** and **P1** dropdowns
- Click **+Edge** to connect them
- Edges appear in the constraint edge dropdowns

### 4. Add Constraints

Select a constraint type from the dropdown. The UI shows/hides relevant fields based on the type:

| Constraint | What it does | Required fields |
|---|---|---|
| **Fixed** | Pin a point to exact (x, y) | Point, x value, y value |
| **Horizontal** | Force an edge to be horizontal | Edge |
| **Vertical** | Force an edge to be vertical | Edge |
| **Distance** | Set distance between two points | Two points, value |
| **H-Distance** | Set horizontal distance between points | Two points, value |
| **V-Distance** | Set vertical distance between points | Two points, value |
| **Coincident** | Make two points overlap | Two points |
| **Parallel** | Make two edges parallel | Two edges |
| **Perpendicular** | Make two edges perpendicular | Two edges |
| **Equal Length** | Make two edges the same length | Two edges |
| **Midpoint** | Place a point at the midpoint of an edge | Edge, point |

### 5. Solve (Preview)

Click **Solve** to run the constraint solver and preview the solved point positions. The status bar shows the solved coordinates.

### 6. Extrude

- Set the **extrude height** (distance along the plane normal)
- Click **Extrude** to create the 3D solid
- The sketch is consumed and a new solid appears in the scene
- Requires at least 3 edges forming a closed loop

### 7. Cancel

Click **Cancel Sketch** or press **Escape** to discard the active sketch without creating a solid.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| S | Switch to Sketch tab |
| Escape | Cancel active sketch |

## Tips

- **Closed loop required**: Edges must form a closed polygon (each point connected to exactly 2 edges) for extrude to work.
- **Over-constraining**: Adding too many constraints may cause the solver to produce unexpected results. Start with fixed + horizontal/vertical + distances.
- **Quick Rect**: The rectangle helper auto-creates 4 points, 4 edges, and 7 constraints (fixed origin, H/V edges, distances). It's the easiest way to start.
- **Multiple sketches**: Each extrude creates an independent solid. You can add primitives and sketch-extruded solids in the same scene, then combine them with boolean operations.

## Automerge Collaboration

Sketch extrude operations are stored in the Automerge op log as `sketch_extrude` operations with the full sketch JSON. When a collaborator extrudes a sketch, the sketch is replayed on your side to produce the same solid.
