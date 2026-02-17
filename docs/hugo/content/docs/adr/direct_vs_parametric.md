# Direct vs. Parametric CAD 

Vision:

We are going to provide both so that mechanicla engineers can use Parametrics like how Fusions 360 does it, and Architects can use Direct modelling.

Look into: 
https://github.com/KittyCAD/ezpz

Language: Written in Rust.
Purpose: It’s a high-performance solver that takes a set of geometric constraints and "solves" the positions and dimensions of the entities.
Text Format: It even has its own text format for defining problems (e.g., point p, p.x = 0, vertical(p, q)).


Why it came up in our "Direct vs. Parametric" talk:
You were interested in creating a system that feels like SketchUp (Direct Modeling) but remains mathematically sound and exportable to STEP files (Parametric Precision).

Ezpz is the piece that makes that possible in the Zoo ecosystem. It allows the software to take your "direct" mouse movements and solve them against a set of constraints in real-time, so the model stays "valid" as you drag things around.



