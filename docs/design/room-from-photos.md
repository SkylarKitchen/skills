## What it does

`room-from-photos` turns a few phone photos of a room you already have into a 3D model you can rearrange. The page shows three things side by side: a plan drawn like a working drawing, a dollhouse model that cuts away the walls nearest the camera, and each of your photos with the model laid over it, so you can see the rebuild lines up. The room opens in its real finishes (paint, floorboards, paneling, trim and each piece's colours), sampled from the photos.

On top of the room sit two or three layouts, each a different idea with a one-line trade-off, and fit checks that update as you move things. The checks cover pieces that hit a wall or each other, door swings, blocked drawers and bed sides, tall things in front of windows, and how much open floor is left. Click a piece and a gizmo appears: arrows slide it, a ring turns it. Finishes, looks and piece variants (a longer sofa, a bigger rug) are one click each, and every choice belongs to the layout you're on, like a configurator. "Add a piece" opens a library of about thirty common pieces in real sizes (sofas, chairs, tables, storage, beds, rugs, lamps, plants, a wall TV, art and mirrors), each shown as the page's own render of it. An added piece lands in the clearest open spot and is checked like everything else, and "Copy layout for Claude" carries it back to the agent.

![The starter's sample room: plan, dollhouse model with the gizmo on the new bed, fit checks and pickers](https://github.com/SkylarKitchen/skills/releases/download/examples/room-from-photos/room-from-photos-page.png)

More example captures (each layout, and the white model) are on the [examples release](https://github.com/SkylarKitchen/skills/releases/tag/examples/room-from-photos).

It works from a starter engine rather than a blank page. The agent copies `starter.html` and fills in one `CONFIG` block: the room's outline, openings, furniture, palette, layouts and one camera per photo. The result is a single HTML file with no build step, served beside a `photos/` folder and a `textures/` folder.

## When to reach for it

Send photos of a room and ask where something should go ("will the new bed fit", "where should the desk go", "try a few layouts"), and the agent reaches for it. Type `/room-from-photos` to call it directly.

It fits furniture decisions in a room that exists. For a new build or a renovation with drawings and costs, start from a floor plan instead.

## How the room gets measured

You don't need a tape measure. The agent reads each photo by its perspective, writes the room out wall by wall, and scales it from things of known size: an 80″ door, a mattress, floorboard widths, outlet plates. With three or more photos it solves the room and every camera together, then back-projects each piece of furniture onto the floor to measure where it really stands. Every estimate is listed on the page under "verify", so you know which numbers to check.

## Common questions

**How many photos?**
One works for a simple room. Two or three give a much better model: one from the doorway and one from the opposite corner is the best pair. Five let the agent measure the furniture to within a few inches.

**How real does it look?**
Close, when rendered on a real GPU. The wood, fabric, brick and carpet are photo scans of real materials (CC0, from ambientCG) at their true size: the floor and the paneling are cut from them board by board, and each is tinted to the swatch you pick. The dollhouse keeps a clean studio light, so every paint and fabric reads as its swatch, with soft sun shadows, window light, lamps that glow, contact shadows under each piece, and mirrors that reflect the room. Seen through a photo's camera, the room lights itself the way the photos do: a grey ceiling that falls off away from the windows, a floor that catches the window light, and a view outside that reads bright, as a camera exposed for the room sees it. The white-model toggle strips all that back when you only want to read the layout.

**Does it run on a phone?**
Yes. The layout stacks below 760 px, and the model redraws only when something changes, so it stays light.

**How do I send a layout back to the agent?**
"Copy layout for Claude" copies the current option's positions, colours and variants. Paste them into the chat and the agent writes them into the page.

## It's working if

- The model lines up with each photo in the photo overlay: corners, door jambs and window sills land on the photo's.
- The first option is the room as it is, and its checks only flag real problems.
- The layouts are different ideas, not three nudges of one.
- Dragging a piece updates the checks and the open-floor figure at once.
- The page loads with no console errors, at phone width and on a desktop.
- `python3 test.py <project-dir>` passes: every drawn part of every piece sits where the fit checks think it is, so nothing floats, clips or hangs from nothing; the photo finishes load, after the page rather than before it; and the photo view's light holds steady as you edit.
- The page is served, not opened from disk: from `file://` a browser won't let it read its textures, so it falls back to drawn finishes.
