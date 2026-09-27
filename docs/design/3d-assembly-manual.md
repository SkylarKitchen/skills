## What it does

`3d-assembly-manual` turns a physical job (building a shelf, planting a bed, fitting out a room) into an interactive 3D guide you flip through on a phone, one step per page. Each page shows the whole build so far, flies in this step's new parts along arrows, numbers the actions on the model, and lists the parts with small 3D thumbnails, the time it takes and one tip.

It works from a starter engine rather than a blank page. The agent copies `starter.html`, fills in a `CONFIG` block (title, camera presets, parts, steps) and a scene block (the geometry), and leaves the engine alone. The result is a single HTML file with no build step.

## When to reach for it

Ask for a 3D build guide, an install sequence, an assembly or instruction manual, or "step-by-step 3D" for something physical, and the agent reaches for it. Type `/3d-assembly-manual` to call it directly.

It fits jobs where order and position matter: which board goes on first, where the hose runs, which wall the shelf hangs on. For a flat checklist, a plain list is faster.

## The look

The drawings follow BIG's (Bjarke Ingels Group) diagram style: a white model with thin ink edges and soft shadows, already-built parts near white, and one colour for this step's parts and arrows. A grey Modulor figure stands in the scene for scale: an adult outline drawn to Le Corbusier's proportions, cut flat like the card figures in an architect's model. The page chrome stays neutral (white paper, ink buttons, sentence case) so colour lives only in the picture.

## Common questions

**Do I need to model everything precisely?**
No. Measure what you can, estimate the rest from photos, and mark estimates as "verify" in the copy. The guide is for sequence and placement, not shop drawings.

**Can it do rooms, not just objects?**
Yes. Walls drop or fade per step so the camera can see the work, and each camera preset can cut away the walls between it and the part being fitted.

**How do I check it on a phone size?**
Serve the file from a local server and open it at 375 px wide. `#step3` opens a given page, and `#step3&still` freezes the motion for screenshots.

## It's working if

- Every page reads without the text: you can tell what moves where from the picture alone.
- This step's parts are the only coloured things on the page.
- The scale figure is visible from the opening view, raised hand included.
- The page loads with no console errors, at phone width and on a desktop.
