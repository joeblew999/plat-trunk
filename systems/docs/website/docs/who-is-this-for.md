# Use Cases

## AEC / Construction

Architecture, engineering, and construction teams need to review and coordinate 3D models without forcing everyone onto expensive desktop software. Import IFC files, inspect building metadata, measure geometry, and collaborate in real-time — all in a browser. Automerge CRDTs mean multiple reviewers can annotate the same model without version conflicts. No Revit license required for the project manager to review the structural model.

## Manufacturing & Product Design

Design engineers prototyping parts before committing to full parametric models in SolidWorks or Fusion. Quick concept geometry — brackets, housings, fixtures — with boolean operations and sketch-extrude, then export STEP for downstream tooling. Zero install means the supply chain partner in another country reviews your model in 30 seconds, not after a 3-day license procurement.

## AI & Automation

52+ MCP tools turn this into a programmable CAD backend for any industry. Connect Claude, GPT, or any MCP-capable agent and let it create geometry, run booleans, sketch profiles, and export models. Use cases: generative design pipelines, automated part configurators, AI assistants that translate natural language into 3D geometry. If you're building AI workflows that touch CAD, this is your integration point.

## Facilities & Asset Management

Facility managers and operations teams need lightweight 3D visualization of buildings and equipment without BIM expertise. Import IFC models from your design team, inspect room data, equipment metadata, and spatial relationships. No training required — if they can use a browser, they can navigate the model.

## Education & Training

Engineering programs, trade schools, and corporate training. Students open a link and start modeling — no 10 GB installer, no license server, no IT tickets. The entire stack is open source, so curricula can reference real code. Instructors share a URL, not a USB drive.

## Hardware Startups & Small Teams

No servers to provision, no licenses to manage ($3,995/yr per SolidWorks seat adds up), no VPN to configure. The app runs on Cloudflare's edge — models persist in R2 cloud storage. Works offline on a plane, syncs when you reconnect. A 3-person team gets the same collaboration as a 300-person enterprise.

## Platform & Integration Developers

The full stack is open source: Rust CAD kernel (truck), TypeScript UI, Cloudflare Workers, Automerge sync. Adding a new CAD command is one Rust struct with `#[derive(JsonSchema)]` — the MCP tool, API endpoint, and OpenAPI types generate automatically. Embed CAD capabilities into your own product via the REST API or MCP protocol.

## Who This Is _Not_ For (Yet)

- **Production mechanical engineering** — if you need GD&T, assemblies with mates, or FEA simulation, use SolidWorks or Fusion 360
- **CAM / manufacturing** — no toolpath generation or G-code export yet
- **Large-scale assemblies** — the kernel handles single-part modeling well; multi-part assemblies are on the [roadmap](/ROADMAP)
- **Enterprise PLM** — no PDM, revision control, or approval workflows (yet)

We're honest about the gaps. See [How We Compare](/comparison) for a detailed breakdown.
