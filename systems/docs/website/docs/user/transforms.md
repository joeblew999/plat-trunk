# Transforms

Move, rotate, scale, duplicate, and rename objects.

## Translate (Move)

Click an object to select it. Three colored arrows appear:

- **Red** (X) — left/right
- **Green** (Y) — up/down
- **Blue** (Z) — forward/back

Drag an arrow to move along that axis. Press **Escape** during drag to cancel.

You can also enter exact values in the Transform panel: set dx, dy, dz and click **Move Selected**.

## Rotate

Rotate an object around an axis by a given angle (in degrees).

In the Transform panel:
1. Select the axis (X, Y, or Z)
2. Enter the angle in degrees
3. Click **Rotate Selected**

## Scale

Scale an object along each axis independently.

In the Transform panel:
1. Enter sx, sy, sz values (1.0 = no change)
2. Click **Scale Selected**

Uniform scaling: use the same value for all three axes.

## Duplicate

Create an exact copy of the selected object. The duplicate gets a new UUID and is placed at the same position as the original.

## Rename

Give an object a descriptive name. The name appears in the outliner panel and is preserved through export/import.

## Via MCP (AI Agents)

AI agents use these tools with `objectId` as the object identifier:

- `translate` — `{ objectId, dx, dy, dz }`
- `rotate` — `{ objectId, angleDeg, axisX, axisY, axisZ }`
- `scale` — `{ objectId, sx, sy, sz }`
- `duplicate` — `{ objectId }`
- `rename` — `{ objectId, name }`

## Undo

All transforms can be undone with **Ctrl+Z** and redone with **Ctrl+Shift+Z**.
