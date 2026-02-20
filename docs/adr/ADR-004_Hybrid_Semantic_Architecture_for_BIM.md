# [ADR-004] Hybrid Semantic Architecture for Local-First BIM

We need the system to accomodate Mechanical engineers and architetcs

## STATUS

Need Gemini to help CLAUDE to make this good before doing anything else.


## IFC 

IFC is the industry standard and is build on top of step which we already have in truck.

Contenders:

https://github.com/louistrue/ifc-lite

- Processing:	Client-side (WASM) or Server-side (Rust)
- Format:	IFC4 (STEP) or IFC5 (IFCX JSON)

https://github.com/MetabuildDev/ifc_rs

https://github.com/nilaysavant/bevy_pmetra

Aspects for whichever we pick to use:

MUST work with automerge well as we use this for sync.

MUST work in Web as WASM.

Maybe a combination is also useful.

## 2D Drawing

WIth the Traditional way you also make 2D Drawings as a PDF. These are Viewports of the 3d Model.

https://github.com/louistrue/ifc-lite/tree/main/packages/drawing-2d





