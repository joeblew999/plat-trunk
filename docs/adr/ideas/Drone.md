# DJI Drone Integration Pathways — Platform Architecture

## Platform Stack

|Layer              |Technology                  |Role                                                                                                                                      |
|-------------------|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
|**Runtime**        |Hono + Zod                  |Universal API layer — runs on Cloudflare Workers, Deno, Bun, Node, edge. Zod validates all schemas (telemetry, frames, missions, auth).   |
|**Auth & Security**|Better Auth                 |Framework-agnostic TypeScript auth. Multi-tenant orgs, 2FA, SSO, API keys, session management. Runs on Hono, backed by D1.                |
|**Compute**        |Rust/Go → WASM + WebGPU     |GPU-accelerated 3D reconstruction, point cloud processing, sensor fusion math. Same binary runs everywhere — browser, phone, edge, server.|
|**Database**       |Cloudflare D1               |Final structured data — projects, missions, users, drone registrations, reconstruction metadata. SQLite at the edge.                      |
|**Object Storage** |Cloudflare R2               |Final assets — imagery, point clouds (.las/.laz), meshes (.glb/.gltf), video segments, WPML mission files. S3-compatible.                 |
|**Messaging**      |NATS JetStream              |Real-time data flow — telemetry streams, frame references, mission commands, reconstruction progress.                                     |
|**Frontend**       |Datastar/SSE + WebGPU viewer|Real-time UI via SSE. 3D viewer runs WASM/WebGPU in browser — same reconstruction engine as server.                                       |

### How They Fit Together

```
DJI Drone (any path)
    │
    ▼
[ Ingest Layer — varies per path ]
    │
    ▼
NATS JetStream ◄──────────────────────────── Hono API (Cloudflare Workers)
    │                                              │
    ├─► Reconstruction Workers (WASM/WebGPU)       ├─► Better Auth (D1-backed)
    │       │                                      ├─► Zod schema validation
    │       ├─► Point clouds → R2                  ├─► Mission management → D1
    │       ├─► Meshes → R2                        └─► Client sessions → KV
    │       └─► Metadata → D1
    │
    └─► Datastar/SSE → Browser (WebGPU 3D viewer)
```

### Security Model (Better Auth)

Better Auth on Hono with D1 provides the full security perimeter:

- **Multi-tenant organizations** — each client (construction company, manufacturer) is an org with members, roles, and access control
- **API keys** — drone ingest endpoints authenticate via API key per device/org. Validated at the Hono layer before data hits NATS
- **Sessions** — stored in Cloudflare KV for speed, backed by D1. Rate limiting via KV
- **2FA / Passkeys** — for operator and admin access to mission planning and reconstruction data
- **SSO** — enterprise clients bring their own IdP
- **R2 file access** — Better Auth Cloudflare plugin manages R2 uploads/downloads with auth checks, file type validation, size limits
- **Per-path auth:** Every DJI integration path must authenticate before writing to NATS or R2. The Hono middleware validates the token/API key regardless of whether data arrives from an Android MSDK app, an MQTT bridge, an RTMP ingest, or a manual upload

-----

## Sensor Fusion Context

DJI drones carry dual redundant IMUs (3-axis accelerometers + gyroscopes), 3-axis magnetometers, barometric sensors, and multi-constellation GNSS (GPS/GLONASS/BeiDou/Galileo). Enterprise models add RTK positioning (1cm+1ppm horizontal). The flight controller runs a Kalman filter fusing all sources into a unified state estimate at high frequency.

What varies across integration paths is **how much of this you can access, when, and where your WASM/WebGPU compute can run**.

-----

## Path 1 — RTMP Live Stream (Consumer/Prosumer)

**Drones:** Mavic 3, Mini series, Air series — anything with DJI Fly app  
**Setup:** DJI Fly app → custom RTMP URL → your server

### Video

- 1080p max, H.264
- 1-3 second latency over 4G/5G
- Quality degrades with poor cell signal

### Sensor Fusion

- **None in real-time.** RTMP carries video only, no telemetry metadata
- Post-flight: DAT flight logs contain full fused state (position, velocity, attitude quaternions, GPS, barometric altitude) at 10Hz — but only after landing
- EXIF on SD card images has GPS + gimbal angles — post-flight only
- No raw IMU, obstacle avoidance, or wind estimation during flight

### Actuation

- **None.** No programmatic flight control
- Pilot flies manually or uses DJI Fly’s limited built-in waypoint features
- No closed-loop — cannot modify flight path based on reconstruction feedback
- No programmatic camera triggering or gimbal control

### Platform Integration

```
Phone (DJI Fly)
    │ RTMP over 4G/5G
    ▼
MediaMTX (Go-native RTMP server)
    │ Frame extraction
    ▼
Hono Worker (auth check via Better Auth API key)
    │ Zod validates frame metadata
    ▼
NATS JetStream (frame references)
    │
    ├─► Frames → R2
    └─► WASM/WebGPU reconstruction worker
            │
            ├─► Point cloud → R2
            └─► Metadata → D1
```

**Where WASM/WebGPU runs:** Server-side only. The phone is occupied by DJI Fly — no way to run your compute alongside it.

**Auth touchpoint:** MediaMTX ingest requires API key. Hono middleware validates before NATS publish.

### Best For

Live monitoring, demos, proof of concept. Pair with SD card pull post-flight for real reconstruction.

-----

## Path 2 — MSDK Custom Android App (Enterprise)

**Drones:** M30 series, M300/350 RTK, Mavic 3 Enterprise, Matrice 4 series  
**Setup:** Custom Android app via DJI Mobile SDK → USB to RC controller → drone

### Video

- Direct decoded video frame access in the app
- Full resolution (up to 4K depending on model)
- Minimal latency (controller-to-app is local USB)
- Programmatic frame extraction

### Sensor Fusion

- **Rich real-time access.** MSDK exposes:
  - Fused GPS position (lat/lng/alt) — Kalman-filtered output the FC uses internally
  - Attitude (quaternions or Euler angles)
  - Velocity (3-axis)
  - Gimbal angles (pitch/roll/yaw)
  - Barometric altitude + GPS altitude separately
  - IMU state (accelerometer + gyroscope values)
  - Compass heading
  - RTK position + RTK heading (enterprise models)
  - Obstacle avoidance sensor distances (all directions)
  - Wind speed estimation
  - Battery state, temperature
  - Vision positioning system status
- Update rates: IMU ~100Hz, GPS 5Hz, fused state ~50Hz, obstacle sensors ~10Hz
- **Only consumer-accessible path with time-synchronized sensor fusion alongside video frames**

### Actuation

- **Full programmatic control:**
  - Waypoint missions (WPML) — define points, speeds, altitudes, camera actions
  - Virtual stick control — direct velocity/attitude commands in real time
  - Gimbal control — pitch/yaw/roll
  - Camera control — trigger photos, start/stop video, change settings
  - Fly-to-point commands
  - Return-to-home, land, takeoff
  - Geofence management
- **Closed-loop possible:** Reconstruction detects coverage gaps → commands drone to revisit in real time

### Platform Integration

```
Phone (Custom Android App + DJI MSDK)
    │
    ├─► WebView/Browser: WASM/WebGPU reconstruction ON THE PHONE
    │       Phone GPU runs same reconstruction binary as server
    │       Real-time preview model builds as drone flies
    │
    ├─► NATS client (jnats) over WiFi/4G
    │       ├─► Telemetry stream → drone.{id}.telemetry
    │       ├─► Frame references → drone.{id}.frames
    │       └─► Reconstruction progress → drone.{id}.reconstruction
    │
    └─► Hono API (Cloudflare Worker)
            │ Better Auth validates device API key + org membership
            │ Zod validates telemetry schema
            ▼
        ├─► Frames → R2 (signed upload URLs)
        ├─► Telemetry → D1 (time-series)
        └─► Full-res reconstruction → WASM/WebGPU on server
                │
                └─► Final assets → R2, metadata → D1
```

**Where WASM/WebGPU runs:**

- **On the phone** — real-time preview reconstruction using phone GPU via WebGPU in a WebView. This is the killer feature of your architecture. The phone isn’t just a relay — it’s a compute node.
- **On the server** — full-resolution reconstruction from uploaded frames
- **In the browser** — client views progressive 3D model via Datastar/SSE + WebGPU viewer

**Auth touchpoints:**

- Android app authenticates via Better Auth on startup (operator login, org context)
- API key per device for machine-to-machine NATS publish
- R2 upload uses signed URLs generated by Hono worker (scoped to org)
- Reconstruction results inherit org/project ACLs in D1

### The Catch

- Requires Android device physically connected to RC controller (AOA handshake)
- Java/Kotlin for MSDK integration; your WASM runs in a WebView alongside
- DJI API key validation requires internet

### Best For

Full-featured integration with real-time sensor-fused reconstruction. Phone GPU does preview, cloud does final. Closed-loop adaptive scanning.

-----

## Path 3 — PSDK On-Board Compute (Enterprise)

**Drones:** Matrice 350 RTK, Matrice 400 + Manifold 3  
**Setup:** Compute board mounted on drone, connected via PSDK port

### Video

- Direct decoded camera frames on-board
- H30 camera: hardware-assisted decode + encode
- LiDAR point cloud data subscription (L2/L3 payloads)
- Process at the edge before any network transmission

### Sensor Fusion

- **Deepest access available:**
  - Everything MSDK provides, plus:
  - Hardware-synced IMU data with precise timestamps for registering with external sensors
  - Raw stereo camera pairs (forward + downward) on supported models
  - Multi-Function IO pins for triggering/syncing external sensors
  - Custom data channels between payload and flight controller
  - RTK data direct from receiver
  - Point cloud data from LiDAR/millimeter-wave radar payloads
- **Key advantage:** Hardware time synchronization enables precise fusion with your own external sensors (thermal cameras, additional LiDAR, custom payloads)

### Actuation

- **Full flight control plus payload orchestration:**
  - Everything MSDK offers for flight control
  - Custom widget management on controller screen
  - Payload gimbal control
  - Custom serial data channels to/from flight controller
  - AR overlay drawing on pilot’s feed
  - Trigger actions based on on-board computation results
- **Edge-loop:** Reconstruct → detect gap → adjust flight → all on the drone, zero network latency

### Platform Integration

```
Manifold 3 / Linux SBC (ON THE DRONE)
    │
    ├─► Go WASM/WebGPU reconstruction ON-BOARD
    │       Process frames + sensor data at the edge
    │       Generate preliminary point cloud during flight
    │
    ├─► NATS client (nats.go) over drone's network link
    │       ├─► Processed results → R2 (via Hono Worker)
    │       ├─► Telemetry summary → D1
    │       └─► Reconstruction progress → SSE to operator
    │
    └─► Hono API (Cloudflare Worker)
            │ Better Auth device certificate / API key
            │ Zod validates all payloads
            ▼
        ├─► Preliminary point clouds → R2
        ├─► Full-res raw data → R2 (for server reprocessing)
        └─► Mission state → D1
```

**Where WASM/WebGPU runs:**

- **On the drone** — Manifold 3 has GPU. Go/Rust WASM + WebGPU runs the same reconstruction pipeline on-board. Preliminary results stream down during flight.
- **On the server** — reprocesses raw data at full quality post-flight
- **In the browser** — operator watches progressive model build via Datastar/SSE

**Auth touchpoints:**

- Manifold authenticates with device certificate issued per drone at provisioning
- All uploads to R2 go through Hono worker with auth middleware
- On-board compute results are signed before publish to prevent tampering
- Org/project scoping ensures multi-tenant isolation in D1 and R2

### The Catch

- PSDK is C/C++ only — you’d wrap your WASM modules or compile Rust/Go natively for ARM
- Manifold 3 expensive, adds weight/power draw
- Matrice 400 + Manifold 3 is $30K+
- Slow dev/test cycle (flash, mount, fly, debug)

### Best For

On-board AI, custom sensor payloads, zero-latency closed-loop. Research, high-value industrial inspection.

-----

## Path 4 — Cloud API + Dock (Fully Autonomous)

**Drones:** Matrice 3D/3TD (Dock 2), Matrice 4D/4TD (Dock 3)  
**Setup:** DJI Dock on-site → MQTT to your cloud. No phone/controller after commissioning.

### Video

- Live streaming via RTMP, WebRTC, or GB28181
- Initiated by `live_start_push` MQTT command
- Latency: ~110-150ms drone-to-dock + network to cloud
- Media files auto-uploaded to object storage after mission

### Sensor Fusion

- **Moderate real-time via OSD telemetry:**
  - Position (lat/lng/alt), attitude, velocity
  - Battery, wind speed/direction
  - Gimbal angles, flight mode, GPS quality
  - RTK status/position (dock has built-in RTK base station)
  - Obstacle avoidance status
  - Dock environmental data (weather station)
- Published to MQTT topic `thing/product/{device_sn}/osd`
- Device state via `thing/product/{device_sn}/state`
- HMS alarms via events topic
- **What you lose vs MSDK/PSDK:** No raw IMU, no hardware-synced timestamps, no stereo camera access, no custom sensor integration. Fused output only.

### Actuation

- **Mission-based and remote control:**
  - Wayline missions via WPML (waypoints, 2D/3D mapping, strip mapping, oblique photography, panoramic)
  - Mission upload, execute, pause, resume, cancel — all MQTT
  - Direct Remote Control (DRC) — real-time `drone_control` commands via MQTT
  - `fly_to_point`, `takeoff_to_point`
  - Camera/gimbal control via MQTT
  - Dock control (cover, charging, reboot)
  - Custom flight area restrictions, forced landing
- **Cloud-loop:** Server analyzes imagery → generates new WPML → pushes to dock → drone flies again. Per-mission, not per-frame.

### Platform Integration

```
DJI Dock (on-site)
    │ MQTT (TLS)
    ▼
MQTT-to-NATS Bridge (Go, lightweight)
    │ Better Auth validates dock device identity
    │ Zod validates DJI MQTT message schemas
    ▼
NATS JetStream
    │
    ├─► Telemetry OSD → D1 (time-series per mission)
    ├─► Live video stream → MediaMTX → frame extraction
    │       └─► WASM/WebGPU reconstruction (server)
    │               └─► Progressive results → R2
    │
    ├─► Post-mission media upload
    │       DJI uploads to MinIO/S3 → sync to R2
    │       └─► Full-res WASM/WebGPU reconstruction
    │               ├─► Point clouds → R2
    │               ├─► Meshes → R2
    │               └─► Metadata → D1
    │
    └─► Mission generation
            Hono Worker → analyzes previous results (D1/R2)
            → generates WPML mission file
            → publishes to NATS → bridge → MQTT → dock
            → drone flies next mission

Operator Browser:
    Hono API → Better Auth session
    → Datastar/SSE for live mission status
    → WebGPU 3D viewer showing progressive reconstruction
    → Mission planning UI → WPML generation → NATS → dock
```

**Where WASM/WebGPU runs:**

- **Server (Cloudflare Worker or dedicated)** — processes live stream frames and post-mission full-res imagery
- **In the browser** — operator views reconstruction, plans next mission, WebGPU renders 3D model
- **NOT on the drone** — no custom compute on Dock hardware

**Auth touchpoints:**

- Dock authenticates via device certificate + DJI license key
- MQTT-to-NATS bridge validates dock identity against D1 device registry
- Operators authenticate via Better Auth (2FA for mission execution)
- Multi-tenant: each org’s docks, missions, and data are isolated
- API keys for programmatic mission scheduling (CI/CD for drone missions)
- R2 bucket policies scoped per org via Better Auth middleware

### The Catch

- BVLOS regulatory approval required
- $10-15K+ hardware
- Lower video quality than direct MSDK frame access
- No raw sensor data for tight fusion
- One-time phone setup for commissioning
- Reliable internet required at dock location

### Best For

Recurring automated surveys. Construction progress, infrastructure inspection, agricultural mapping. Your platform becomes the mission planning + reconstruction engine.

-----

## Path 5 — SD Card Post-Processing (Any DJI Drone)

**Drones:** Any DJI drone  
**Setup:** Fly → land → pull SD card or WiFi transfer → upload → process

### Video

- Full native resolution (4K, 5.1K, 8K)
- No streaming compression
- Full frame rate
- RAW + JPEG photos

### Sensor Fusion

- **Rich but delayed:**
  - Every image: full EXIF (GPS, altitude, gimbal angles, focal length, timestamp)
  - SRT subtitle files: per-frame GPS + altitude + timestamp
  - DAT flight logs: complete fused state at 10Hz (position, velocity, attitude quaternions, GPS, barometric altitude, compass, battery, motor data)
  - Enterprise: RTK-tagged coordinates in EXIF (cm-level)
  - LiDAR models: direct .las/.laz point cloud files
- **All post-flight. No real-time reaction possible.**

### Actuation

- **Pre-planned only:**
  - DJI Fly/Pilot 2 waypoint missions
  - Third-party apps (Dronelink, Litchi) for automated flights
  - No in-flight adjustment, no closed-loop
  - Mission for next flight can be generated from reconstruction gaps

### Platform Integration

```
SD Card / WiFi Transfer
    │
    ▼
Upload UI (Hono Worker)
    │ Better Auth: operator session, org context
    │ Zod validates upload manifest (file list, expected EXIF fields)
    ▼
R2 (raw imagery + flight logs)
    │
    ▼
NATS JetStream (batch processing trigger)
    │
    └─► WASM/WebGPU reconstruction worker
            │ Reads from R2, processes batch
            │ Full quality, all sensor data from EXIF + logs
            ▼
        ├─► Point clouds → R2
        ├─► Meshes → R2
        ├─► Metadata + quality report → D1
        └─► Next mission WPML (if gaps detected) → D1

Operator Browser:
    Better Auth session → project dashboard
    WebGPU 3D viewer renders completed model from R2
    Gap analysis suggests next flight mission
```

**Where WASM/WebGPU runs:**

- **Server** — batch reconstruction, highest quality
- **In the browser** — same WASM/WebGPU engine renders the result. Operator can also run local reconstruction on their machine’s GPU for preview before upload completes
- **Offline capable** — operator laptop with browser can reconstruct locally without cloud connectivity, sync later

**Auth touchpoints:**

- Upload requires authenticated session with project write access
- R2 signed upload URLs scoped to org/project
- Reconstruction results inherit project ACLs
- Share links for clients: Better Auth generates scoped read-only tokens for viewing specific models

### Best For

Highest quality output. Survey-grade photogrammetry. Baseline quality benchmark for all other paths. Also the offline/disconnected use case.

-----

## Path 6 — Hybrid: RTMP Real-Time + SD Card Full Quality

**Drones:** Enterprise or prosumer with RTMP support  
**Setup:** RTMP streams during flight for live preview; SD card pull after landing for full reconstruction

### Video

- Real-time: 1080p RTMP
- Post-flight: Full resolution from SD card

### Sensor Fusion

- Real-time: **Minimal** — video only via RTMP, no telemetry (unless also running MSDK = Android problem)
- Post-flight: Full EXIF + flight logs as per Path 5
- **Gap:** Live rough model has no sensor context; delayed precise model has full sensor data. Timestamp alignment required to merge.

### Actuation

- Whatever drives the flight (manual, DJI Fly waypoints, Dronelink)
- No closed-loop during flight
- Post-flight: system generates next mission from gap analysis

### Platform Integration

```
Phone (DJI Fly)
    │
    ├─► RTMP stream over 4G ──► MediaMTX ──► Frame extraction
    │                                           │
    │   ┌───────────────────────────────────────┘
    │   ▼
    │   Hono Worker (Better Auth API key check)
    │       │ Zod validates
    │       ▼
    │   NATS JetStream
    │       └─► WASM/WebGPU server: rough real-time model
    │               └─► Progressive preview → R2 (temp)
    │                       └─► Datastar/SSE → browser WebGPU viewer
    │
    └─► Post-flight: SD card upload (same as Path 5)
            │
            └─► Full-quality WASM/WebGPU reconstruction
                    Replaces rough model with survey-grade output
                    ├─► Final assets → R2
                    └─► Metadata → D1
```

**Where WASM/WebGPU runs:**

- **Server** — real-time rough model from RTMP stream, then full-quality from SD card
- **Browser** — progressive view during flight (rough), then switches to final model
- **Phone** — occupied by DJI Fly, no compute available

**Auth touchpoints:** Same as Path 1 (ingest) + Path 5 (upload). Two-phase: live stream is device-authenticated, upload is operator-authenticated.

### Best For

Practical middle ground. Operator sees progress live, client gets final quality. No custom development needed. Real-time is for human awareness, not algorithmic feedback.

-----

## Path 7 — Third-Party Flight Apps + RTMP

**Drones:** Most DJI consumer/prosumer (Dronelink, Litchi compatibility)  
**Setup:** Dronelink or Litchi on phone → automated waypoints + RTMP stream

### Video

- RTMP stream (same as Path 1)

### Sensor Fusion

- **Limited real-time:** Apps use MSDK internally but expose limited telemetry externally
  - Dronelink: mission progress, position in cloud dashboard
  - Litchi: telemetry logged, some real-time display
  - No API to stream raw sensor data to your system
- Post-flight: flight logs, EXIF data as per Path 5

### Actuation

- **Good pre-planned automation:**
  - Complex waypoint missions with photo triggers
  - Orbit, panorama, mapping patterns
  - Speed, altitude, gimbal angle per waypoint
  - Dronelink: scripting language, adaptive triggers
- **No real-time closed-loop** with your system

### Platform Integration

```
Phone (Dronelink/Litchi)
    │
    ├─► RTMP stream ──► same pipeline as Path 1
    │
    └─► Dronelink Cloud API (if available)
            │ Hono Worker fetches mission telemetry
            │ Better Auth validates org API key
            │ Zod validates Dronelink data schema
            ▼
        NATS JetStream
            └─► Enriches RTMP frames with position data
                    └─► Better reconstruction than Path 1 alone
```

**Where WASM/WebGPU runs:** Server + browser only. Phone is occupied by flight app.

**Auth touchpoints:** Same as Path 1 for RTMP ingest. Additional API key for Dronelink cloud integration if used.

### Best For

Automated survey flights without custom Android development. Structured capture with some sensor data. Good enough for many commercial use cases.

-----

## Summary Matrix

|Capability                |Path 1 RTMP      |Path 2 MSDK                    |Path 3 PSDK                |Path 4 Dock              |Path 5 SD Card            |Path 6 Hybrid    |Path 7 3rd Party|
|--------------------------|-----------------|-------------------------------|---------------------------|-------------------------|--------------------------|-----------------|----------------|
|**Real-time video**       |1080p, 1-3s      |Full res, min lag              |On-board, zero             |WebRTC ~200ms            |None                      |1080p live       |1080p live      |
|**Real-time telemetry**   |None             |Full (IMU, GPS, RTK, obstacles)|Deepest (+ hw sync, stereo)|Moderate (fused via MQTT)|None                      |None             |Limited         |
|**Raw IMU access**        |No               |Partial (fused)                |Yes (hw-synced)            |No                       |No (logs only)            |No               |No              |
|**RTK positioning**       |No               |Yes                            |Yes                        |Yes (dock base)          |Yes (EXIF)                |Post-flight      |No              |
|**LiDAR data**            |No               |Metadata                       |Point cloud sub            |Post-mission             |Direct .las               |Post-flight      |No              |
|**Obstacle sensors**      |No               |Real-time                      |Real-time                  |Status only              |No                        |No               |No              |
|**Custom sensor fusion**  |No               |Limited                        |Yes (hw sync + IO)         |No                       |No                        |No               |No              |
|**Programmatic flight**   |No               |Full (virtual sticks)          |Full (+ payload)           |Full (MQTT)              |Pre-planned               |Pre-planned      |Scripted        |
|**Gimbal/camera control** |No               |Real-time                      |Real-time                  |MQTT commands            |Pre-planned               |Pre-planned      |Per-waypoint    |
|**Closed-loop w/ 3D**     |No               |Per-frame                      |On-board, zero lat         |Per-mission              |No                        |Per-mission      |No              |
|**WASM/WebGPU on device** |No (phone busy)  |**Yes (phone GPU)**            |**Yes (Manifold GPU)**     |No                       |Browser only              |No (phone busy)  |No (phone busy) |
|**WASM/WebGPU on server** |Yes              |Yes                            |Yes                        |Yes                      |Yes                       |Yes              |Yes             |
|**WASM/WebGPU in browser**|Yes (viewer)     |Yes (viewer + live)            |Yes (viewer + live)        |Yes (viewer + live)      |Yes (viewer + local recon)|Yes (viewer)     |Yes (viewer)    |
|**Android dependency**    |Phone for DJI Fly|Yes (AOA problem)              |No (Linux on-board)        |No (one-time)            |Phone for DJI Fly         |Phone for DJI Fly|Phone for app   |
|**Cost**                  |$0 extra         |$5-15K + dev                   |$15-30K+                   |$10-15K+                 |$0 extra                  |$0 extra         |$15-30/mo       |
|**Regulatory**            |VLOS             |VLOS                           |VLOS                       |BVLOS                    |VLOS                      |VLOS             |VLOS            |

-----

## WASM/WebGPU Compute Tiers

The same Rust/Go WASM binary with WebGPU runs at every tier, but the available GPU and data determines the output quality:

|Tier                  |Device                        |GPU                    |What It Processes                              |Output Quality                   |
|----------------------|------------------------------|-----------------------|-----------------------------------------------|---------------------------------|
|**Edge (on drone)**   |Manifold 3 (Path 3)           |ARM Mali/Adreno        |Raw frames + full sensor data, zero latency    |Preliminary model, gap detection |
|**Edge (on phone)**   |Pixel/Samsung (Path 2)        |Adreno 640+            |MSDK frames + telemetry, minimal latency       |Real-time preview model          |
|**Cloud**             |Cloudflare Worker / GPU server|Server GPU             |Full-res imagery + all sensor data             |Survey-grade final model         |
|**Browser (operator)**|Laptop/desktop                |Discrete/integrated GPU|Streams from R2, renders + optional local recon|Interactive viewer, local preview|
|**Browser (client)**  |Any device with WebGPU        |Whatever they have     |Pre-built model from R2                        |View-only, LOD-based             |

### Progressive Reconstruction Pipeline

```
Tier 1: Edge (drone/phone) — rough model, detect coverage gaps, guide flight
    │ Uploads preliminary + raw to R2
    ▼
Tier 2: Cloud — full-quality reconstruction from raw data
    │ Writes final assets to R2, metadata to D1
    ▼
Tier 3: Browser — renders final model, allows measurement/annotation
    │ Annotations → D1 via Hono API
    ▼
Tier 4: Next mission — gap analysis generates WPML → back to drone
```

-----

## Cloudflare Data Architecture

### D1 (Structured Data)

```
organizations          — Better Auth multi-tenant orgs
users                  — Better Auth user records
sessions               — Better Auth sessions (overflow from KV)
api_keys               — Better Auth API keys (per device, per org)

projects               — reconstruction projects, per org
drones                 — registered drones, linked to org
missions               — flight missions (planned, in-progress, complete)
mission_telemetry      — time-series telemetry per mission
reconstructions        — reconstruction jobs (status, quality metrics)
annotations            — user annotations on 3D models
shares                 — scoped sharing links for clients
```

### R2 (Object Storage)

```
/{org_id}/raw/
    /{mission_id}/
        frames/         — original imagery (JPEG, RAW)
        video/          — video segments
        lidar/          — .las/.laz point clouds
        logs/           — DAT flight logs, SRT files
        wpml/           — mission definition files

/{org_id}/processed/
    /{reconstruction_id}/
        pointcloud/     — processed point clouds
        mesh/           — .glb/.gltf meshes, LOD levels
        textures/       — texture atlases
        ortho/          — orthomosaics
        metadata.json   — reconstruction quality report

/{org_id}/temp/
    /{session_id}/      — live RTMP frame captures (TTL, auto-cleanup)
```

### KV (Hot Data)

```
session:{token}         — Better Auth active sessions
ratelimit:{key}         — Better Auth rate limiting
device:{device_id}      — last known drone state (fast lookup)
mission:{id}:status     — live mission status for SSE push
reconstruction:{id}:progress — live reconstruction % for SSE
```

-----

## Per-Path Zod Schemas

Every DJI integration path produces data validated by the same Zod schemas before entering the system:

```
TelemetryFrame {
    device_id: string
    timestamp: ISO8601
    position: { lat: number, lng: number, alt_msl: number, alt_rel: number }
    attitude: { quaternion: [w,x,y,z] } | { euler: { pitch, roll, yaw } }
    velocity: { vx, vy, vz }
    gimbal: { pitch, roll, yaw }
    battery: { percent, voltage, temperature }
    gps: { satellites, signal_quality, rtk_status? }
    obstacles?: { forward, backward, left, right, up, down }  // Path 2, 3 only
    wind?: { speed, direction }  // Path 2, 3, 4
    imu_raw?: { accel: [x,y,z], gyro: [x,y,z], timestamp_hw }  // Path 3 only
}

FrameReference {
    device_id: string
    mission_id: string
    timestamp: ISO8601
    r2_key: string
    resolution: { width, height }
    exif?: { ... }
    telemetry_ref?: string  // links to TelemetryFrame for this timestamp
}

MissionDefinition {
    org_id: string
    project_id: string
    drone_id: string
    wpml_r2_key: string
    mission_type: "waypoint" | "mapping_2d" | "mapping_3d" | "oblique" | "strip"
    parameters: { ... }
    schedule?: { cron, repeat_count }  // Path 4 only
}

ReconstructionJob {
    id: string
    org_id: string
    project_id: string
    source_mission_ids: string[]
    status: "queued" | "processing" | "complete" | "failed"
    quality: { point_count, mesh_faces, coverage_percent, gap_regions }
    output_r2_keys: { pointcloud, mesh, ortho, metadata }
}
```

These schemas are defined once in Zod, validated at every boundary (Hono middleware, NATS consumers, R2 upload triggers), and shared across all runtimes.

-----

## Recommendations by Use Case

**Construction site progress monitoring (recurring, same site)**  
→ Path 4 (Dock). Hono worker generates WPML missions on schedule. Dock executes. Cloud reconstructs. Browser shows diff against previous survey. D1 tracks progress over time. R2 stores historical models.

**On-demand site survey (operator in field)**  
→ Path 7 (Dronelink) + Path 6 (hybrid). Operator sees live RTMP preview via WebGPU in browser. Full quality from SD card post-flight. Gap analysis suggests follow-up flight.

**Real-time adaptive scanning (high-value assets)**  
→ Path 2 (MSDK). Phone runs WASM/WebGPU preview reconstruction in real time. Closed-loop: reconstruction gaps → flight commands. Final cloud reconstruction from uploaded full-res data.

**Edge AI / custom sensor payload (industrial)**  
→ Path 3 (PSDK). WASM/WebGPU on Manifold processes on-board. Zero-latency closed-loop. Custom sensors fused with DJI state via hardware sync.

**Client demos / sales**  
→ Path 1 (RTMP) for live wow-factor. Path 5 (SD card) for deliverable. Browser WebGPU viewer with Better Auth share link for client access.

**Offline / disconnected field work**  
→ Path 5 (SD card). Operator runs WASM/WebGPU reconstruction locally in browser on their laptop — no cloud needed. Syncs to R2/D1 when connectivity returns.
