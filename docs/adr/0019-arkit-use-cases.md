# plat-trunk + ARKit: Use Case Roadmap

**Document type:** User research  
**Related ADR:** [0019-arkit-tauri-integration.md](0019-arkit-tauri-integration.md)  
**Status:** Seeking feedback — see [Post tracking](#post-tracking) below

---

## What we are building

plat-trunk is a browser-native CAD platform. We are adding ARKit integration so
that the same CAD tools can use the iPhone and iPad camera as a spatial input and
output device — measuring real-world geometry, detecting surfaces, scanning
physical spaces, and placing models in the real world at true scale.

This document describes the use cases we are considering and asks: **which of
these would change how you work?**

---

## User types

The use cases below reference these user types:

| Type | Description |
|------|-------------|
| **Product designer** | Designs parts and assemblies intended for physical manufacture. Works primarily at a desk, uses tools like Fusion 360, SolidWorks, or Onshape. |
| **Field engineer** | Works on-site at factories, construction sites, or plant. Regularly measures existing conditions and feeds them back into design. |
| **Fabricator / machinist** | Cuts, forms, and assembles physical parts. Cares about fit, tolerances, and real-world dimensions more than abstract geometry. |
| **Architect / interior designer** | Designs spaces — rooms, buildings, fitouts. Works with floor plans, sections, and 3D models of built environments. |
| **Construction manager** | Oversees work on a building site. Needs to compare what is built against what was designed, in the field. |
| **Structural / FEA engineer** | Analyses forces, stresses, and structural behaviour using simulation tools. Needs accurate geometry as input. |
| **Robotics / automation engineer** | Programs and integrates robots and automated machinery. Needs precise spatial context for robot workspace planning. |

---

## Use cases

---

### UC-1: See your CAD model at real scale in AR

**What:** With one tap, place your current CAD model into the real world using
your iPhone or iPad camera. Walk around it. See it at true 1:1 scale in your
physical space before anything is built or ordered.

**Works on:** Any iPhone or iPad (no LiDAR needed).

**Why it matters:**

- **Product designer** — sanity-check scale and proportion before committing to
  fabrication. Catching that a bracket is twice the size you imagined takes
  seconds, not a reprint.
- **Fabricator / machinist** — confirm that a new part will fit the space it is
  going into before cutting material.
- **Architect / interior designer** — show clients a proposed fitout in their
  actual room, not a rendering on a screen.
- **Construction manager** — walk a structural element into its intended location
  on-site to check clearances before lifting it into place.

---

### UC-2: Scan a physical object to use as design reference

**What:** Walk around a physical object taking photos. The app produces a 3D mesh
of the object that you can import into your CAD session as reference geometry —
something to design around, measure against, or check fit against.

**Works on:** Any iPhone or iPad. LiDAR devices (iPhone 12 Pro and later,
iPad Pro) produce higher quality results.

**Why it matters:**

- **Product designer** — most real-world design work is retrofit, not greenfield.
  When you need to design a bracket, cover, or adapter for an existing part that
  has no CAD model, you currently measure by hand and model from scratch. This
  collapses that process.
- **Field engineer** — capture as-built conditions of existing equipment and
  bring them into the model without a survey team.
- **Fabricator / machinist** — scan an existing part to check whether a new
  component will mate correctly.
- **Architect / interior designer** — scan existing furniture, fixtures, or
  structural elements to use as reference when designing around them.

---

### UC-3: Measure real-world distances and feed them into your model

**What:** Tap two points in the real world. The app measures the 3D distance
between them at millimetre precision and injects it as a dimension into your
active sketch. No tape measure, no manual typing.

**Works on:** Any iPhone 6s or later.

**Why it matters:**

- **Field engineer** — the core daily pain: measure something on-site, write
  it down, type it in later. This closes the loop in one step, in the field,
  with the model open.
- **Fabricator / machinist** — measure the gap, the hole spacing, the clearance —
  directly into the dimension that controls the part.
- **Architect / interior designer** — measure a room, a window opening, or a
  ceiling height directly into the drawing.
- **Construction manager** — spot-check that what has been built matches the
  model dimensions, on-site, without a separate measuring instrument.

---

### UC-4: Point your camera at a surface to set your sketch plane

**What:** Point the camera at a physical surface — a floor, a wall, a machine
face, a workbench. The app detects the plane. One tap sets it as your active
sketch plane, with the correct orientation, so anything you draw is aligned to
that real surface.

**Works on:** Any iPhone 6s or later.

**Why it matters:**

- **Field engineer** — designing something that must mount to a specific physical
  surface. Getting the plane orientation right from the real object rather than
  estimating it removes a significant source of error.
- **Fabricator / machinist** — snap the sketch plane to the face of a workpiece
  or a fixture surface that you are designing for.
- **Architect / interior designer** — set the sketch plane to a real wall or
  floor before drawing the fitout. Everything you draw is immediately in the
  right spatial context.

---

### UC-5: Place your live CAD model in AR and keep it in sync

**What:** Anchor your current model at a real-world position — on a surface, at
a GPS coordinate, or at a point you tap in space. Unlike a static preview
(UC-1), this stays live: changes you make in the CAD editor update the AR view
in real time. Multiple people in different locations can see the same model in
their physical spaces simultaneously.

**Works on:** Any iPhone 6s or later.

**Why it matters:**

- **Architect / interior designer** — walk through a proposed design in the
  actual space while a colleague edits it at a desk. See changes immediately.
- **Construction manager** — anchor the structural model to the site and use it
  as a persistent reference while work progresses. The model is always there,
  always up to date.
- **Robotics / automation engineer** — place the robot workspace model into the
  actual factory space to check reach envelopes, collision zones, and cable
  routing against real conditions.

---

### UC-6: Scan a space or object with LiDAR

**What:** Walk through a physical space or around an object with a LiDAR-equipped
iPhone or iPad. The app builds a dense 3D scan of the environment in real time.
That scan comes into your CAD session as reference geometry — every surface,
edge, and form captured at millimetre scale.

**Works on:** iPhone 12 Pro and later, iPad Pro (2020 and later).

**Why it matters:**

- **Product designer** — design parts that must fit into a scanned physical
  environment. No manual measurement, no guessing at geometry that already exists.
- **Field engineer** — capture as-built conditions of a complex installation
  precisely and quickly. The scan becomes the ground truth the design is checked against.
- **Structural / FEA engineer** — work from the actual geometry of an as-built
  component rather than the nominal design geometry, which may differ significantly
  from reality after fabrication and installation.
- **Robotics / automation engineer** — scan the actual factory floor, fixtures,
  and equipment to give the robot workspace model a geometrically accurate context.

---

### UC-7: Scan a room and get CAD-ready walls, doors, and windows

**What:** Walk through a room for a couple of minutes. The app uses Apple's
RoomPlan technology to produce a structured model of the space — walls at their
actual dimensions, door and window openings in their correct positions — as
solid CAD geometry you can work with immediately.

**Works on:** iPhone 12 Pro and later, iPad Pro (2020 and later).

**Why it matters:**

- **Architect / interior designer** — the scan that currently takes a team
  half a day with a laser measure and a CAD operator becomes a two-minute
  iPhone capture. The model is immediately usable, not a point cloud that needs
  processing.
- **Construction manager** — verify that a completed room matches the design
  intent by comparing the scan against the model.
- **Field engineer** — capture the envelope of a space that equipment must fit
  into, with accurate door and opening geometry, before designing the installation.

---

### UC-8: Use a LiDAR scan as input to structural simulation

**What:** Scan a physical component or structure with LiDAR. That geometry goes
directly into a structural simulation pipeline — generating the mesh, running the
analysis, and returning stress and deformation results — without manual geometry
cleanup or re-modelling.

**Works on:** iPhone 12 Pro and later, iPad Pro (2020 and later).

**Why it matters:**

- **Structural / FEA engineer** — running simulation on as-built geometry rather
  than design geometry is currently a labour-intensive process involving point
  cloud cleanup, meshing, and often significant manual CAD work. This makes it
  practical for routine use, not just special investigations.
- **Field engineer** — get a rapid structural assessment of an existing component
  or condition in the field, without sending geometry back to an office analyst.

---

## Which phase are we in?

| Phase | Use cases | Device needed | Status |
|-------|-----------|---------------|--------|
| 1 | UC-1, UC-2 | Any iPhone / iPad | Planned |
| 2 | UC-3, UC-4, UC-5 | Any iPhone 6s or later | Planned |
| 3 | UC-6, UC-7, UC-8 | iPhone 12 Pro / iPad Pro (LiDAR) | Planned |

Phasing reflects technical dependencies, not priority. **User feedback will
determine which phases we accelerate.** If UC-7 (room scan to CAD geometry) is
the most important use case to the people who will actually use this, we will
move it forward.

---

## We want your feedback

**Questions:**

1. Which of these use cases would meaningfully change how you work?
2. Which device do you use in the field — standard iPhone, iPhone Pro (LiDAR),
   or iPad?
3. Is there a use case not listed here that AR + CAD would unlock for you?

---

## Post tracking

Record post URLs here. These will be fetched to capture community responses and
update the roadmap priority based on real signal.

| Forum | Post URL | Date | Top feedback |
|-------|----------|------|-------------|
| | | | |

---

## Forums

### CAD / design professionals

| Forum | Audience | Most relevant UCs |
|-------|----------|------------------|
| GrabCAD Community | Mechanical designers | UC-1, UC-2, UC-3 |
| r/cad | General CAD users | UC-1, UC-3, UC-4 |
| r/SolidWorks | SolidWorks users | UC-1, UC-3 |
| r/Fusion360 | Fusion 360 users | UC-1, UC-2, UC-3 |
| Onshape Forums | Cloud-native CAD users | UC-1, UC-3, UC-4 |

Links: https://grabcad.com/questions · https://reddit.com/r/cad · https://reddit.com/r/SolidWorks · https://reddit.com/r/Fusion360 · https://forum.onshape.com

### Architecture / construction / BIM

| Forum | Audience | Most relevant UCs |
|-------|----------|------------------|
| r/architecture | Architects and students | UC-4, UC-5, UC-7 |
| r/ArchitectureStudents | Early adopters | UC-4, UC-5, UC-7 |
| Autodesk AEC Community | BIM / Revit users | UC-5, UC-7 |
| r/Revit | Revit practitioners | UC-7 |
| r/SketchUp | SketchUp users | UC-1, UC-4, UC-7 |

Links: https://reddit.com/r/architecture · https://reddit.com/r/ArchitectureStudents · https://forums.autodesk.com/t5/aec/ct-p/aec · https://reddit.com/r/Revit · https://reddit.com/r/Sketchup

### Manufacturing / fabrication / engineering

| Forum | Audience | Most relevant UCs |
|-------|----------|------------------|
| r/engineering | Broad engineering audience | UC-3, UC-6 |
| r/manufacturing | Manufacturing professionals | UC-3, UC-6, UC-8 |
| r/metalworking | Fabricators and machinists | UC-3 |
| r/robotics | Robotics engineers | UC-5, UC-6 |
| Eng-Tips Forums | Professional engineers, FEA users | UC-6, UC-8 |

Links: https://reddit.com/r/engineering · https://reddit.com/r/manufacturing · https://reddit.com/r/metalworking · https://reddit.com/r/robotics · https://www.eng-tips.com/threadminder.cfm

### AR / spatial computing

| Forum | Audience | Most relevant UCs |
|-------|----------|------------------|
| r/augmentedreality | AR enthusiasts | all |
| r/ARKit | iOS AR developers | all |
| Apple Developer Forums — ARKit | ARKit implementors | all |
| r/VisionPro | Spatial computing early adopters | UC-1, UC-5 |

Links: https://reddit.com/r/augmentedreality · https://reddit.com/r/arkit · https://developer.apple.com/forums/tags/arkit · https://reddit.com/r/VisionPro

### Structural analysis / FEA

| Forum | Audience | Most relevant UCs |
|-------|----------|------------------|
| SimScale Community | FEA / CFD simulation users | UC-8 |
| r/fea | FEA practitioners | UC-8 |
| FEniCS Discourse | Open-source FEA community | UC-8 |

Links: https://www.simscale.com/forum · https://reddit.com/r/fea · https://fenicsproject.discourse.group

### Developer communities

| Forum | Audience | Most relevant UCs |
|-------|----------|------------------|
| Hacker News (Show HN) | Broad technical audience | all |
| r/rust | Rust community | all |
| users.rust-lang.org | Rust users forum | all |
| This Week in Rust | Newsletter — submit for inclusion | all |

Links: https://news.ycombinator.com · https://reddit.com/r/rust · https://users.rust-lang.org · https://this-week-in-rust.org
