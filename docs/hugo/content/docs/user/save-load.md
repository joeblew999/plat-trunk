# Save and Load

## Save JSON

Click **Save JSON** to download the current scene as a `.json` file. The file contains full B-Rep data for every object, including:

- Object UUIDs
- Complete solid geometry (no tessellation loss)
- Exact mathematical surface definitions

## Load JSON

Click **Load JSON** to restore a previously saved scene. This replaces the current scene with the loaded one.

![Save and load UI](/screenshots/08-save-load.png)

<video controls width="100%">
  <source src="/videos/save-and-load.webm" type="video/webm">
</video>

## File Format

The JSON format stores an array of objects, each with:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "solid": { ... }
  }
]
```

The `solid` field contains the truck B-Rep serialization — vertices, edges, faces, and surface definitions.

## Example Scenes

The **Load example** dropdown provides pre-built scenes:

- Default cube
- Two overlapping cubes
- Multi-primitive scene
- Boolean subtract result
- Complex assembly

## Automerge Documents

Beyond JSON save/load, scenes are also persisted via Automerge documents:

- **New Doc** — creates a fresh Automerge document
- **Share** — copies the document URL for collaborative editing
- Documents sync across tabs via BroadcastChannel
- Each document has a unique `automerge:` URL
