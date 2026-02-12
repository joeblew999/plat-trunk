---
name: automerge
description: Build collaborative local-first apps with Automerge CRDTs. Create documents, make changes, merge, sync, and persist data across peers using Automerge and Automerge Repo.
version: 1.0.0
license: MIT
metadata:
  author: automerge
  domain: local-first-collaboration
  tags:
    - crdt
    - collaboration
    - local-first
    - sync
    - real-time
compatibility: Works in Node.js, Deno, Bun, and browsers via WASM. Rust crate for native use.
---

# Automerge - Local-First Sync Engine

Build collaborative apps with CRDTs that work offline, prevent conflicts, and sync automatically.

## Packages

| Package | Purpose |
|---|---|
| `@automerge/automerge` | Core CRDT library (Rust compiled to WASM) |
| `@automerge/automerge-repo` | Repo, DocHandle, NetworkAdapter, StorageAdapter |
| `@automerge/react` | React hooks + convenience re-exports of the above |
| `@automerge/automerge-repo-storage-indexeddb` | IndexedDB StorageAdapter (browser) |
| `@automerge/automerge-repo-storage-nodefs` | Filesystem StorageAdapter (Node.js) |
| `@automerge/automerge-repo-network-websocket` | WebSocket adapters (client + server) |
| `@automerge/automerge-repo-network-broadcastchannel` | BroadcastChannel (cross-tab sync) |
| `@automerge/automerge-repo-network-messagechannel` | MessageChannel (inter-process) |
| `@automerge/prosemirror` | ProseMirror integration for rich text |

Rust crate: `automerge` — https://docs.rs/automerge/latest/automerge/

---

## Installation

```bash
npm install @automerge/react
# Or individually:
npm install @automerge/automerge @automerge/automerge-repo
```

Vite config (required):

```typescript
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
})
```

---

## Core API (`@automerge/automerge`)

### Creating Documents

```typescript
import * as Automerge from "@automerge/automerge"

let doc = Automerge.init<MyType>()

let doc = Automerge.from<MyType>({
  title: "Hello",
  tasks: [],
  text: "collaborative string",          // collaborative (use splice/updateText)
  url: new Automerge.ImmutableString("https://..."),  // non-collaborative (atomic replace)
  counter: new Automerge.Counter(0),
  bytes: new Uint8Array([1, 2, 3]),
  date: new Date(),
})
```

### Making Changes

```typescript
// ALWAYS use mutable idioms inside change() — NOT spread/immutable patterns
newDoc = Automerge.change(doc, "Add card", (d) => {
  d.property = "value"
  d.nested = {}
  d.nested.key = "value"
  delete d["old"]
  d.list.push(item)
  d.list.unshift(item)
  d.list.insertAt(index, ...items)
  d.list.deleteAt(index)
  d.list.splice(index, deleteCount, ...items)
  d.list[index] = newValue
  d.counter.increment(4)
  d.counter.decrement(3)
})
```

### Text Operations

```typescript
// splice(doc, path, index, deleteCount, insertText)
Automerge.splice(d, ["text"], 0, 0, "Hello ")

// updateText — computes diff, best per-keystroke
Automerge.updateText(d, ["text"], newValue)
```

### Rich Text (Marks + Blocks)

```typescript
// Marks — formatting spans
Automerge.mark(d, ["text"], {start: 0, end: 5, expand: "both"}, "bold", true)
let marks = Automerge.marks(doc, ["text"])

// Block markers — structural divisions
Automerge.splitBlock(d, ["text"], 0, {type: "paragraph", parents: []})

// Spans — text broken into segments with marks/blocks
let spans = Automerge.spans(doc, ["text"])
```

### Merge, Clone, Save/Load

```typescript
// Merge two documents with shared history
doc1 = Automerge.merge(doc1, doc2)

// Clone (independent copy)
let forked = Automerge.clone(doc)

// Save to binary (Uint8Array)
let bytes = Automerge.save(doc)

// Load from binary
let [doc] = Automerge.load(bytes)
```

### Conflicts

```typescript
// After merge, get conflicting values
Automerge.getConflicts(doc, "propertyName")
// Returns: { '1@actorId1': value1, '1@actorId2': value2 }
```

---

## Automerge Repo API

### Repo Constructor

```typescript
import { Repo } from "@automerge/automerge-repo"

const repo = new Repo({
  network: [networkAdapter1, networkAdapter2],
  storage: storageAdapter,
})
```

### Repo Methods

```typescript
const handle = repo.create<MyType>()                    // new document
const handle = repo.create<MyType>({ title: "", tasks: [] })  // with initial data
const handle = await repo.find<MyType>(automergeUrl)     // find existing
repo.delete(automergeUrl)                                // delete
```

### DocHandle

```typescript
// Read (async, waits until ready)
const doc = await handle.doc()

// Read sync (guard with isReady())
if (handle.isReady()) {
  const doc = handle.docSync()
}

// URL
handle.url  // "automerge:2akvofn6L1o4RMUEMQi7qzwRjKWZ"

// Make changes (auto-saved + replicated)
handle.change((d) => {
  d.title = "New title"
  d.tasks.push({ title: "", done: false })
})

// Listen for remote changes
handle.on("change", (evt) => {
  console.log(evt.doc)
})

// Ephemeral messages (not persisted)
handle.broadcast({ cursor: { x: 10, y: 20 } })
handle.on("ephemeral-message", (msg) => { ... })
```

### Document URLs

```typescript
import { isValidAutomergeUrl, type AutomergeUrl } from "@automerge/automerge-repo"

// Format: "automerge:<base58>"
isValidAutomergeUrl(someString)  // boolean
```

---

## Storage Adapters

```typescript
// Browser — IndexedDB
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb"
const storage = new IndexedDBStorageAdapter()

// Node.js — filesystem
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs"
const storage = new NodeFSStorageAdapter("/path/to/dir")
```

---

## Network Adapters

```typescript
// WebSocket client
import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket"
const network = new WebSocketClientAdapter("wss://sync.automerge.org")

// WebSocket server (Node.js)
import { WebSocketServer } from "ws"
import { WebSocketServerAdapter } from "@automerge/automerge-repo-network-websocket"
const wss = new WebSocketServer({ port: 8080 })
const network = new WebSocketServerAdapter(wss)

// Cross-tab (same browser)
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel"
const network = new BroadcastChannelNetworkAdapter()
```

---

## React Integration

### RepoContext + useDocument

```tsx
import { Repo, RepoContext, useDocument, useRepo, updateText,
         IndexedDBStorageAdapter, BroadcastChannelNetworkAdapter,
         WebSocketClientAdapter } from "@automerge/react"

// Setup
const repo = new Repo({
  network: [
    new BroadcastChannelNetworkAdapter(),
    new WebSocketClientAdapter("wss://sync.automerge.org"),
  ],
  storage: new IndexedDBStorageAdapter(),
})

ReactDOM.createRoot(root).render(
  <RepoContext.Provider value={repo}>
    <App />
  </RepoContext.Provider>
)

// In components
function TaskList({ docUrl }: { docUrl: AutomergeUrl }) {
  const [doc, changeDoc] = useDocument<TaskListType>(docUrl)

  // Read
  doc.title
  doc.tasks[0].done

  // Modify
  changeDoc((d) => {
    d.tasks.push({ title: "", done: false })
    d.tasks[index].done = !d.tasks[index].done
  })

  // Collaborative text in form inputs
  changeDoc((d) => {
    updateText(d, ["tasks", index, "title"], e.target.value)
  })
}

// Create documents from components
function CreateButton() {
  const repo = useRepo()
  const handle = repo.create<TaskList>({ title: "", tasks: [] })
  // handle.url is the AutomergeUrl to share
}
```

---

## Sync Server (Node.js)

```typescript
import { Repo } from "@automerge/automerge-repo"
import { WebSocketServer } from "ws"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs"

const wss = new WebSocketServer({ noServer: true })
const repo = new Repo({
  network: [new NodeWSServerAdapter(wss)],
  storage: new NodeFSStorageAdapter("./data"),
})
```

---

## Data Modeling Best Practices

- Documents are the unit of collaboration (JSON object + git repo combined)
- Use fine-grained mutations inside `change()`, never immutable-style spreads
- Use UUIDs for entity IDs, not auto-incrementing counters
- Link documents via `AutomergeUrl` references stored in other documents
- "Root document" pattern: one entry-point doc stores `AutomergeUrl[]` to sub-docs
- Store root URL in `localStorage` for persistence
- Documents hold full change history — hundreds is fine, avoid syncing thousands simultaneously

---

## ProseMirror Rich Text

```typescript
import { init } from "@automerge/prosemirror"

const { pmDoc, schema, plugin } = init(handle, ["text"])

const view = new EditorView(editorRoot, {
  state: EditorState.create({
    schema,
    plugins: [...exampleSetup({ schema }), plugin],
    doc: pmDoc,
  }),
})
```

---

## WASM Initialization (manual, for special environments)

```typescript
import * as Automerge from "@automerge/automerge/slim"
import { Repo } from "@automerge/automerge-repo/slim"
import wasmUrl from "@automerge/automerge/automerge.wasm?url"

await Automerge.initializeWasm(wasmUrl)
```

---

## References

- Docs: https://automerge.org/docs/hello/
- JS API: https://automerge.org/automerge/api-docs/js/
- Rust API: https://docs.rs/automerge/latest/automerge/
- GitHub: https://github.com/automerge/automerge
- Full LLM docs: docs/llms/automerge-llms-full.txt (166KB)
