# [ADR-007] WebGPU Rendering (Tier 3 Server-Side)

## Status

**Future** — Tier 1 (browser-native WebGPU) is shipped and is the product. Tier 3 (server-rendered video) is a demo/insurance capability, not started.

## For Claude Code: Build instructions for Tier 3 video rendering pipeline

**Project**: Ubuntu Software — "Where AI Designs Reality"
**Date**: 2026-02-12
**Priority**: Tier 3 is a demo capability and insurance policy, NOT a core revenue path. Tier 1 (browser-native) is the product.

-----

## Context & Strategic Framing

We’re building a CAD/spatial platform with two rendering tiers:

- **Tier 1 (Browser-native)**: Truck B-Rep kernel + wgpu compiled to WASM, renders locally via WebGPU. Works on desktops with decent GPUs. **Zero server cost. This is the product.**
- **Tier 3 (Server-rendered video)**: Same Rust binary running natively on a GPU server, streaming H.264 video to the browser via WebRTC. Works on any device with a browser.

There is no Tier 2. Binary decision: can the browser handle WebGPU rendering? Yes → Tier 1. No → Tier 3.

### Why Tier 1 is the real product

Server-side GPU rendering is economically broken as a core business model. The numbers:

- Fly.io L40S GPU: **$1.50/hr** per active viewport session
- Zoo/KittyCAD charges **$0.50/min ($30/hr)** — their entire business is renting GPU rendering time
- SolidWorks: ~$3,000/year = **~$1.50/hr** assuming 2000 working hours — and that runs locally on the user’s own hardware with full solver, simulation, everything included

Zoo is burning VC money subsidizing GPU time hoping to build lock-in before the economics matter. That’s a countdown timer, not a business model.

Meanwhile, WebGPU is shipping in every major browser. Phones and tablets get more GPU power every year. The window where “server-rendered CAD video” makes economic sense is shrinking, not growing.

**Our bet**: rendering happens at the edge, on the user’s device, for free. We sell the platform, the collaboration, the spatial intelligence — not GPU cycles.

### What Tier 3 is actually for

1. **Investor demo** — “look, it runs on this phone too” (run for 20 minutes, costs $0.50, done)
1. **Insurance policy** — rare enterprise edge case where someone needs a massive model on a thin client
1. **Proof of architecture** — demonstrates the same Rust binary runs in WASM and natively, validating the single-codebase story

Tier 3 is a capability we demonstrate, not something we run 24/7. Build Tier 1 first. It covers 90%+ of use cases at zero server cost.

This spec covers the Tier 3 demo/insurance capability.

-----

## Reference: Zoo/KittyCAD (Cautionary Tale + Technical Validation)

Zoo (formerly KittyCAD) validates that this architecture works technically. But their business model — charging $30/hr for GPU-rendered CAD viewports — is a warning sign, not something to emulate.

What they prove technically (and we can learn from):

- Custom Rust geometry engine on GPU servers (Vulkan)
- NVENC hardware H.264 encoding
- WebRTC video stream to browser `<video>` element
- Unreliable WebRTC data channel for mouse/interaction events (high frequency, low latency)
- Their blog post on H.264 SPS/PPS NALU bugs with Safari is required reading: https://zoo.dev/blog/fixing-an-h264-encoding-bug
- They bill by server-minute ($0.0083/sec) — proves the economics work

-----

## Two-Transport Split

This is a hard architectural rule. Do not mix these concerns:

|Transport           |Carries                                                                               |Protocol     |Why                                                                                            |
|--------------------|--------------------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------|
|**SSE (Datastar)**  |Data — op log updates, UI state, property panels, feature tree, collaboration presence|HTTP/SSE     |Small JSON payloads. Text-oriented. What SSE is designed for.                                  |
|**WebRTC (LiveKit)**|Video — rendered 3D viewport frames                                                   |UDP/RTP H.264|Binary media stream. Adaptive bitrate. Hardware decode in browser. What WebRTC is designed for.|

SSE is **not** for video. WebRTC is **not** for data sync. Keep them separate.

-----

## Why LiveKit (Not CF Calls or Raw WebRTC)

We chose LiveKit as the WebRTC layer:

1. **Open source SFU, written in Go** — fits the existing Go stack for the control plane
1. **Rust client SDK** (`livekit/rust-sdks`) — GPU server is a LiveKit “participant” that publishes a video track
1. **Browser JS SDK** — receives video in `<video>` element, tiny integration with Datastar UI
1. **Self-hostable** on Fly.io, or use LiveKit Cloud for zero ops
1. **Go server SDK** — the Huma API orchestrator can create rooms, issue tokens, manage sessions natively
1. **Built-in fan-out** — spectator/presenter mode (1 GPU renderer → N browser viewers) comes free
1. **Handles STUN/TURN/ICE/DTLS** — the entire NAT traversal nightmare is abstracted away

Alternative considered: CF Calls (WHIP/WHEP). Rejected because no off-the-shelf Rust WHIP publishing crate exists and the ecosystem is less mature.

-----

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Fly.io GPU Machine (L40S — $1.50/hr)                   │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ Truck    │───▶│ wgpu     │───▶│ NVENC H.264      │   │
│  │ B-Rep   │    │ Vulkan   │    │ hardware encode  │   │
│  │ kernel  │    │ headless │    │ (L40S has NVENC) │   │
│  └──────────┘    └──────────┘    └────────┬─────────┘   │
│       ▲                                    │             │
│       │ Automerge                          ▼             │
│       │ op log          ┌──────────────────────────┐     │
│       │                 │ LiveKit Rust SDK          │     │
│       │                 │ publish: video track      │     │
│       │                 │ subscribe: data channel   │     │
│       │                 └───────────┬──────────────┘     │
│       │                             │ WebRTC             │
└───────┼─────────────────────────────┼───────────────────┘
        │                             │
        │ NATS JetStream              │
        │                             ▼
┌───────┴─────────┐     ┌────────────────────────┐
│  Go Orchestrator│     │  LiveKit SFU           │
│  (Huma API)     │     │  (Fly.io or Cloud)     │
│                 │     │  - room management     │
│  - session mgmt │     │  - TURN/ICE            │
│  - token issue  │     │  - fan-out to viewers  │
│  - Fly GPU API  │     └───────────┬────────────┘
│  - scale to 0   │                 │ WebRTC
└─────────────────┘                 │
                                    ▼
                    ┌──────────────────────────────┐
                    │  Browser                      │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │ <video> element          │  │
                    │  │ LiveKit JS SDK           │  │
                    │  │ receives H.264 stream    │  │
                    │  │ hardware decode (free)   │  │
                    │  └─────────────────────────┘  │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │ Datastar UI              │  │
                    │  │ property panels, tree    │  │
                    │  │ SSE for data updates     │  │
                    │  └─────────────────────────┘  │
                    │                               │
                    │  mouse/keyboard ──────────────┼──▶ LiveKit data channel
                    │  (orbit, pan, zoom, select)   │    (unreliable, low latency)
                    └──────────────────────────────┘
```

-----

## What Gets Offloaded

|Concern                        |Runs on                 |Browser cost                       |
|-------------------------------|------------------------|-----------------------------------|
|B-Rep evaluation (Truck kernel)|GPU server              |Zero                               |
|Tessellation                   |GPU server              |Zero                               |
|Rasterization (Vulkan)         |GPU server              |Zero                               |
|H.264 encoding (NVENC)         |GPU server              |Zero                               |
|H.264 decoding                 |Browser hardware decoder|Negligible — every browser has this|
|UI panels, property editors    |Browser (Datastar/SSE)  |Minimal                            |
|Mouse/keyboard input           |Browser → data channel  |Trivial                            |

-----

## Cog Container Packaging (Replicate Format)

The Tier 3 Rust binary is packaged as a Replicate Cog container. This matters for portability:

- **Today**: Deploy to Fly.io GPUs (works now, proven with cog-sd3 and cog-flux examples)
- **Soon**: Deploy to CF GPU containers when they ship (CF acquired Replicate Nov 2025, container platform in preview)
- **Anywhere**: Any Docker host with NVIDIA GPU

### What Cog gives us

Cog (github.com/replicate/cog, Apache 2.0) is:

- CLI written in Go — handles Docker builds, CUDA setup, registry pushes
- Runtime server in Python (FastAPI) inside the container
- Generates Docker image with NVIDIA base, correct CUDA/cuDNN versions
- Exposes `/predictions` endpoint on port 5000, auto-generates OpenAPI schema

### Our approach: Skip the Python layer

Since our renderer is a native Rust binary (not a Python ML model), we use Cog for the container packaging but bypass the Python predict.py pattern:

- `cog.yaml` defines the CUDA base, system packages (Vulkan SDK, NVENC headers), GPU requirement
- Instead of predict.py, we run the Rust binary directly as the container entrypoint
- The Rust binary exposes its own HTTP health endpoint for Fly’s health checks
- LiveKit Rust SDK handles the video publishing (not the Cog HTTP API)

The Cog container is essentially a well-structured NVIDIA Docker image with our Rust binary in it. The value is the reproducible CUDA/driver setup and the portability story.

### Fly.io deployment

```bash
fly apps create --name ubuntu-cad-renderer
fly storage create  # Tigris for model storage
cog push registry.fly.io/ubuntu-cad-renderer:latest --use-cuda-base-image false
fly deploy
```

fly.toml config for scale-to-zero:

```toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  gpu_kind = "l40s"
  memory = "16gb"
  cpus = 4
```

-----

## Fly.io GPU Options

|GPU      |Cost/hr|NVENC     |VRAM|Regions           |Notes                                                 |
|---------|-------|----------|----|------------------|------------------------------------------------------|
|A10      |$0.75  |Yes       |24GB|ord               |Budget option, good for demos                         |
|L40S     |$1.50  |Yes (best)|48GB|ord               |Recommended — dedicated NVENC encoder, great for video|
|A100 40GB|$2.50  |Yes       |40GB|ord               |Overkill for rendering                                |
|A100 80GB|$3.50  |Yes       |80GB|iad, sjc, syd, ams|Multi-region if needed                                |

**Recommendation**: A10 in `ord` for demos ($0.75/hr). This is demo/insurance infrastructure, not production workload — don’t overspend on GPU tier. L40S only if you specifically need the better NVENC encoder quality or 48GB VRAM for massive models.

-----

## Render Pipeline Detail

### Headless wgpu rendering (no display needed)

wgpu supports headless rendering via `compatible_surface: None`. The render loop:

1. Create wgpu device with Vulkan backend, no surface
1. Create offscreen texture (render target) at desired resolution
1. Truck evaluates B-Rep geometry → tessellated mesh
1. wgpu renders mesh to offscreen texture
1. Read pixels from GPU texture back to CPU (or use GPU-to-GPU path with NVENC)
1. Encode frame as H.264 via NVENC
1. Push encoded frame to LiveKit as video track

### Frame loop

```
loop {
    // 1. Check for input events from LiveKit data channel
    if let Some(event) = data_channel.try_recv() {
        update_camera(event);  // orbit, pan, zoom
        update_selection(event);  // pick, highlight
    }

    // 2. Check for Automerge ops from NATS
    if let Some(ops) = nats_subscriber.try_recv() {
        automerge_doc.apply(ops);
        truck_model.rebuild();  // re-evaluate B-Rep if model changed
    }

    // 3. Render
    let frame = wgpu_render(truck_model, camera);

    // 4. Encode + publish
    let h264_frame = nvenc_encode(frame);
    livekit_track.publish(h264_frame);

    // 5. Target 30fps (33ms budget)
    sleep_until_next_frame();
}
```

### Dirty frame optimization

Don’t re-render if nothing changed. Track dirty flags:

- Camera moved → re-render
- Model changed (Automerge op) → re-evaluate + re-render
- Selection changed → re-render (highlight)
- Nothing changed → skip frame, NVENC sends P-frame referencing last I-frame

This is critical for cost — idle sessions should use near-zero GPU.

-----

## Browser Integration

### Auto-negotiation (Tier 1 vs Tier 3)

```javascript
// In the Datastar-managed page initialization
async function initViewport() {
    if (navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            const device = await adapter.requestDevice();
            // Check VRAM if possible
            // Tier 1: load WASM, render locally
            return initTruckWASM(device);
        } catch (e) {
            // WebGPU failed, fall through to Tier 3
        }
    }
    // Tier 3: request server session, receive video
    const session = await fetch('/api/render-session', { method: 'POST' });
    const { livekitUrl, token } = await session.json();
    return initLiveKitPlayer(livekitUrl, token);
}
```

### Viewport layout

The 3D viewport area in the Datastar UI is either:

- A `<canvas>` element (Tier 1 — wgpu WASM renders directly)
- A `<video>` element (Tier 3 — LiveKit JS SDK receives stream)

Everything around it (property panels, feature tree, toolbar, collaboration presence) is the same Datastar/SSE/templ UI regardless of tier. The viewport is the only thing that changes.

```html
<!-- Datastar template (templ) -->
<div id="viewport-container" data-signals="{renderTier: 'detecting'}">
    <!-- Tier 1: shown when renderTier === 'local' -->
    <canvas id="wgpu-canvas" data-show="$renderTier === 'local'"></canvas>

    <!-- Tier 3: shown when renderTier === 'remote' -->
    <video id="remote-video" data-show="$renderTier === 'remote'" autoplay playsinline></video>

    <!-- Loading: shown during detection -->
    <div data-show="$renderTier === 'detecting'">Detecting capabilities...</div>
</div>
```

### Input handling (Tier 3)

When in Tier 3 mode, mouse/keyboard events on the `<video>` element are captured and sent via LiveKit’s unreliable data channel:

```javascript
// Attach to video element
videoEl.addEventListener('mousemove', (e) => {
    // Unreliable channel — fine to drop frames for mouse drag
    dataChannel.send(JSON.stringify({
        type: 'mouse_move',
        x: e.offsetX / videoEl.clientWidth,   // normalized 0-1
        y: e.offsetY / videoEl.clientHeight,
        buttons: e.buttons
    }));
});

videoEl.addEventListener('wheel', (e) => {
    dataChannel.send(JSON.stringify({
        type: 'zoom',
        delta: e.deltaY
    }));
});

// Click events use reliable channel (selection matters)
videoEl.addEventListener('click', (e) => {
    reliableChannel.send(JSON.stringify({
        type: 'pick',
        x: e.offsetX / videoEl.clientWidth,
        y: e.offsetY / videoEl.clientHeight
    }));
});
```

-----

## Multi-User Collaboration

Each user gets their own render stream (different camera angles, selections, zoom levels). Collaboration happens at the Automerge op log level via NATS, not at the video level.

```
User A → LiveKit → Fly GPU (ord) → Truck render (A's camera) ─┐
User B → LiveKit → Fly GPU (ord) → Truck render (B's camera) ─┼→ NATS → Automerge → R2
User C → LiveKit → Fly GPU (syd) → Truck render (C's camera) ─┘
```

Each GPU renderer subscribes to the same NATS subject for the Automerge document. Op log updates trigger model re-evaluation and re-render from each user’s viewpoint.

### Spectator/Presenter Mode (future)

For presentations, design reviews, meetings where one person drives:

- 1 GPU renderer → LiveKit fan-out → N browser viewers
- All viewers see the same camera angle
- Built into LiveKit SFU — no additional infrastructure

-----

## State Management

- **R2** (Cloudflare): Single source of truth for Automerge documents
- **NATS JetStream**: Real-time sync of Automerge ops between participants and GPU renderers
- **GPU servers are stateless and disposable**: Pull Automerge doc from R2 on session start, subscribe to NATS for updates, render, stream, terminate on disconnect

-----

## Session Lifecycle

Managed by the Go orchestrator (Huma API):

1. Browser requests render session → `POST /api/render-session`
1. Orchestrator calls Fly Machines API to start GPU machine (or wake from stopped state)
1. Orchestrator creates LiveKit room, generates participant tokens (one for GPU server, one for browser)
1. GPU machine starts → pulls Automerge doc from R2 → connects to LiveKit → begins rendering
1. Browser connects to LiveKit with its token → receives video stream
1. On disconnect: GPU machine auto-stops after idle timeout (Fly `auto_stop_machines`)
1. LiveKit room is cleaned up

Scale to zero: no active sessions = no running GPU machines = $0.

-----

## Build Phases

### IMPORTANT: Build Tier 1 first.

Tier 1 (browser WASM + WebGPU) is the product and covers 90%+ of use cases at zero server cost. Build and ship that. Tier 3 phases below are for when you need the demo/insurance capability.

### Phase 1: Prove the render loop (1-2 weeks)

**Goal**: A spinning 3D part visible in a browser via video stream.

- Rust binary: Truck loads a hardcoded STEP file → wgpu headless Vulkan render → RGBA frames
- Encode with software H.264 (ffmpeg/x264) initially — skip NVENC complexity
- Publish to LiveKit as video track using `livekit/rust-sdks`
- Browser page with LiveKit JS SDK receives in `<video>` element
- Deploy on Fly.io with A10 GPU ($0.75/hr — cheapest option, fine for demos)
- **Checkpoint**: does a rendered 3D model appear in a browser? That’s the demo. Ship it.

### Phase 2: Make it interactive (1-2 weeks)

**Goal**: Orbit, pan, zoom a model through the video stream.

- Browser sends mouse events via LiveKit unreliable data channel
- GPU server updates camera transform, re-renders affected frames
- Implement dirty frame optimization (don’t re-render when idle)
- Add pick/select via reliable data channel + ray casting on server
- **Checkpoint**: feels responsive enough to demo? Ship it.

### Phase 3: Cog packaging + production (1 week)

**Goal**: Reproducible deployment, scale to zero.

- Package Rust binary in Cog container (`cog.yaml` + Dockerfile)
- Push to Fly registry, deploy with `auto_stop_machines`
- Switch from software encoding to NVENC on L40S
- Add health checks, session timeout, graceful shutdown
- Go orchestrator manages session lifecycle via Fly Machines API
- **Checkpoint**: deploy from scratch in one command, scales to zero when idle.

### Phase 4: Integration with existing stack (1-2 weeks)

**Goal**: Tier 3 works alongside Tier 1 in the same UI.

- Auto-negotiation: detect WebGPU support, route to correct tier
- Same Datastar/templ UI wrapping both `<canvas>` (Tier 1) and `<video>` (Tier 3)
- Automerge state sync via NATS — GPU renderer subscribes to document changes
- R2 for persistent state
- **Checkpoint**: same model, same UI, one user on desktop (Tier 1), another on phone (Tier 3).

### Phase 5: Multi-user + spectator (future)

**Goal**: Collaborative editing with per-user render streams.

- Multiple GPU render sessions sharing same Automerge doc
- NATS distributes ops between sessions
- LiveKit fan-out for spectator mode
- **Checkpoint**: two users editing same model, each with their own camera.

-----

## Key Dependencies (Rust)

```toml
[dependencies]
truck-modeling = "x.x"       # B-Rep kernel
truck-meshalgo = "x.x"       # Tessellation
wgpu = "x.x"                 # GPU rendering (Vulkan backend headless)
livekit = "x.x"              # WebRTC video publish + data channels
tokio = { version = "1", features = ["full"] }
nats = "x.x"                 # NATS JetStream for Automerge sync
automerge = "x.x"            # CRDT state
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

For Phase 1 (software encoding):

```toml
ffmpeg-next = "x.x"          # Software H.264 encoding via libx264
```

For Phase 3 (hardware encoding):

```toml
# NVENC via nvidia-video-codec-sdk bindings or ffmpeg with nvenc
# Evaluate: AdrianEddy/gpu-video crate for Rust NVENC bindings
```

-----

## Key Dependencies (Browser)

```json
{
  "dependencies": {
    "livekit-client": "^2.x"
  }
}
```

LiveKit JS SDK is the only new browser dependency. Everything else (Datastar, templ rendering, SSE) is already in the stack.

-----

## Key Dependencies (Go Orchestrator)

```go
import (
    lksdk "github.com/livekit/server-sdk-go"  // Room creation, token generation
    "github.com/superfly/fly-go"               // Fly Machines API
)
```

-----

## Investor Pitch Summary

“Unlike Zoo/KittyCAD who charge $30/hr to rent GPU rendering, our platform runs CAD directly in the browser via WebGPU — zero server cost for the viewport. The user’s own hardware does the work. We sell the platform, collaboration, and spatial intelligence, not GPU cycles.

Same model works everywhere. Desktop users get native WebGPU performance for free. For the rare thin-client case — a tablet on a construction site, an investor demo on a phone — we can spin up GPU rendering on demand and stream video, but that’s a capability we demonstrate, not our business model.

We’re built on Cloudflare’s edge (R2, Workers) for collaboration and state, with the entire rendering pipeline in Rust/WASM running client-side. Single codebase compiles to both WASM (browser) and native (GPU server). As devices get more powerful and WebGPU matures, more users move to zero-cost Tier 1 automatically. We’re on the right side of the cost curve.”

-----

## URLs & Resources

- Truck B-Rep kernel: https://github.com/ricosjp/truck
- wgpu: https://github.com/gfx-rs/wgpu
- wgpu headless rendering guide: https://sotrh.github.io/learn-wgpu/showcase/windowless/
- LiveKit (open source SFU): https://github.com/livekit/livekit
- LiveKit Rust SDK: https://github.com/livekit/rust-sdks
- LiveKit self-hosting: https://docs.livekit.io/transport/self-hosting/
- Replicate Cog: https://github.com/replicate/cog
- Cog on Fly examples: https://github.com/fly-apps/cog-sd3
- Fly.io GPUs: https://fly.io/docs/gpus/
- Zoo H.264 bug post: https://zoo.dev/blog/fixing-an-h264-encoding-bug
- Zoo architecture post: https://zoo.dev/blog/putting-the-kittycad-api-to-work
- NVIDIA Video Codec SDK (NVENC): https://developer.nvidia.com/video-codec-sdk
- CF Calls (future option): https://developers.cloudflare.com/calls/
- CF container platform preview: https://blog.cloudflare.com/container-platform-preview/
- Automerge: https://automerge.org/
- ezpz constraint solver: https://github.com/KittyCAD/ezpz