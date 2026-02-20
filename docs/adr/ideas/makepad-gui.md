# makepad GUI

At the moment we have html and webgpu and need to keep them in sync.

We have hono, zod and automerge so API and sync.

But keeping 2 GUI in Sync for a WYSIWYG is hard, and we are moving more and more into the 3D suface being the editor, and the HTML being just a bidirectional binding that is js based.

MakePad might be a better way.

We are also needing a MJML WYSIYWG too, which is obviously a html iframe based WYSIWYG, as opposed to a WebGPU system for hte 3D CAD, but the patterns are the same in many ways.

We need REAL WYWIWYG, but with menus and property grids and docking also so that they can edit "on canvas" and "using proeprties.

We also need really really exact 2d GUI tools to pull this off. 
We have gizmo in the WebGPU 3D cad, but have nots of bits missing to make it a perfect Fusion 360 clone. 



## gemini 

Here is the specific toolkit for building your "Star Trek" CAD and email system with Makepad. These repositories provide the core engine, the AI skills to help you code it, and the professional references you'll need for the "LCARS" layout.

### 1. The Core Engine (Makepad)

This is the main repository. It contains the **makepad-widgets** crate and the **Live Design** DSL engine.

* **Main Repo:** [https://github.com/makepad/makepad](https://github.com/makepad/makepad)
* **The "Zoo":** Check the `examples/ui_zoo` folder inside the repo—it’s a live catalog of every widget.

### 2. The AI Skills (Claude Code)

Since you want Claude to help you build this, you need to "prime" it with these skills. These tell Claude how to write Makepad DSL properly.

* **Makepad Skills:** [https://github.com/ZhangHanDong/makepad-skills](https://github.com/ZhangHanDong/makepad-skills)
* **How to use:** Copy the `skills/` folder into your project's `.claude/skills/` directory.
* **What it does:** It teaches Claude about **SDF drawing** (for the glowing Star Trek shapes) and **Adaptive Layouts** (for the mobile/desktop swapping).



### 3. Professional References (Production Code)

Don't start from a blank page. These are the two biggest production apps built with Makepad. They are the best places to "borrow" complex docking and Star Trek-style UI code.

* **Robrix (Matrix Client):** [https://github.com/project-robius/robrix](https://github.com/project-robius/robrix)
* *Best for:* Complex multi-pane layouts and cross-platform mobile logic.


* **Moly (AI Desktop Client):** [https://github.com/moxin-org/moly](https://github.com/moxin-org/moly)
* *Best for:* Sleek, modern dark-mode interfaces and managing complex async state.



---

### The "Star Trek" Layout Logic

To handle the "Mobile vs. Desktop" swap you mentioned (moving menus from side to bottom), you use the **`AdaptiveView`** pattern found in the `makepad-skills` repo.

**The Logic:**

1. **Desktop:** You define a `Horizontal` axis in your `Dock`.
2. **Mobile:** You detect `WindowGeom` changes. If `width < height`, you trigger a state change that swaps the `Dock` axis to `Vertical`.
3. **Claude Command:** Once you have the skills installed, you can simply tell Claude:
> "Using the makepad-adaptive-layout skill, create a viewport that takes 100% width on mobile with a bottom-docked menu, but switches to a 300px side-docked tree view on desktop."



### 4. The Agent Bridge (Optional)

If you want to try the real-time "Streaming UI" where Claude can change your UI while the app is running:

* **A2UI Bridge:** [https://github.com/google/A2UI](https://github.com/google/A2UI) (The protocol)
* **Makepad A2UI:** Keep an eye on the `experiments` folder in the main Makepad repo; they are currently prototyping the direct streaming of `live_design` blocks.

**Would you like me to generate a "Project Scaffolding" command that you can give to Claude to set up this whole structure for you?**

