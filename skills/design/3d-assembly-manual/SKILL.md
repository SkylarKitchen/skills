---
name: 3d-assembly-manual
description: Build a phone-first interactive 3D step-by-step guide (LEGO-manual style, BIG diagram look) as a single self-contained Three.js HTML file. Use when the user asks for a 3D build guide, install sequence, assembly/instruction manual, or "step-by-step 3D" for a physical task (garden, house, furniture, repair).
---

# 3D assembly manual

Proven on a garden-bed build, then generalised after kitchen and sauna test builds. **Copy `starter.html`**: a project-agnostic engine with a four-step shelf example that renders on its own. Edit only the `CONFIG` block and the `PROJECT SCENE` block; leave the engine alone.

## CONFIG keys (top of the script)
| Key | What |
|---|---|
| `title`, `subtitle`, `date` | Header text; `date` prefixes the page counter. |
| `storageKey` | localStorage key for the last page; unique per manual. |
| `accent` / `fill` | Dark accent (arrows, plan frame, outline flash, CSS `--accent`) and pale part fill (this step's parts, thumbnails). |
| `view` | Default view direction vector. |
| `plan` | Plan inset `{c:[x,z], r}`; `null` derives it from the scene's Box3 (shadow camera always does). |
| `figure` | Modulor scale figure `[x, z, rotY?]` or `null`: a flat cut-out that faces the view unless `rotY` is given. Frame the overview preset to take in its raised hand, 7.4 ft up. |
| `CAM` | Presets `{c, r, v?, walls?, cut?}`. |
| `NAMES`, `INVENTORY` | Part labels keyed like `P`; inventory groups `[[group, [[part, qty]]]]`. |
| `STEPS` | Pages. Besides the copy keys (`title text acts meta time tip parts dims notes inventory calendar`): `detail` `{p, r, hide?:[regKeys], view?}` (the bubble's own pass: hide parts in front, look from another direction), `view` (direction), `walls` `{h, sides?}` (walls on those sides drop to `h` ft; omit sides = all), `cut:[regKeys]` (fade to 0.12 for a cutaway), `onEnter(t)` (special animation; `t` has `lastLand, objs, tween, ease, easeIO, setOpacity, setColor, paint, T, still`; return a new end time to delay marks). Step keys override the preset. |

PROJECT SCENE block: context geometry (auto-painted white), `wall(side, x0, x1, y0, y1, z0, z1)` for rooms, `P.*` part builders, optional `THUMB_ONLY[key]` builders (a thicker thumbnail-only variant for thin parts: bands, wires), `reg()` calls. Groups passed to `reg()` are re-centred automatically, so parts can be built in absolute coordinates.

## Look (BIG evolution diagram)
- White model, ink hairline edges (EdgesGeometry, opacity ~0.72), near-flat light: HemisphereLight 0.9 + sun 0.16, one pale PCFSoft shadow. Toon gradient bands 226/241/255.
- Already-built parts near-white (#ececec). Only this step's new or removed parts in the pale `fill`; arrows in the dark `accent`. Parts page shows the whole kit in fill. The starter default is the blue pair #1F4FD8 / #A6C0F6; one orange (#f28c1e) for both also works.
- A scale figure in the scene: the starter's `modulorFigure()`, an adult's smooth front-view outline drawn to Le Corbusier's Modulor (crown 183 cm, raised fingertips 226 cm), cut flat in one grey (#555) with no edges. Never people built from cylinders, boxes or spheres: they read as mannequins, not people. Chrome neutral: white paper, ink buttons, grey rules, Geist + Geist Mono, sentence case, square corners. Colour lives only in the picture.

## Engine (in starter.html)
- `reg(key, obj, {add, remove, only:[pages], from, lag, each, span, part, grow, noGhost, noArrow})`; a page's scene is the cumulative state; `only` parts fade when their page turns.
- Orthographic camera; preset `{c, r, v}` tweened 900 ms ease-in-out, walls and cutaways tweened with it. Every tween's clock starts on its first rendered frame, so a slow first frame can't eat the opening motion. Landings 700 ms ease-out along an arrow, ghost outline at destination, accelerating stagger `span*sqrt(i/(n-1))`.
- Per step: parts callout with 3D thumbnails (second renderer, toDataURL; below 760 px one scrolling row of 32 px thumbs, ellipsised names, right-edge fade when it overflows), numbered action marks with screen offsets (clamped below the callout; the leader is redrawn from the clamped position to its point), detail bubble (scissor pass, circular mask with `overflow:hidden`), dimension lines, live scale bar, plan inset, step number, time, one tip.
- Tap a part = blink + outline flash. Swipe the sheet (pointer events, `touch-action:pan-y`). `#stepN` deep-links, `#stepN&still` freezes for captures.

## Process
1. Measure or estimate the real space from photos (mark "verify"); list parts grouped by where they come from.
2. Write STEPS copy: plain instructions, 2-4 numbered acts, quantities in a mono meta line.
3. Build (the starter has no dark-mode tokens: it commits to a light drawing sheet on purpose), then verify at 375 px in a browser over a localhost server (e.g. `python3 -m http.server`; keep the viewport meta), and capture with headless Chrome through a 390x844 iframe harness at `#stepN&still`.
4. Deliver one `.html` file: Three.js and fonts load from a CDN, everything else is inline, so it opens by double-click or on any static host. Until you have a capture from the browser the reader will use, call the render unverified.

## Gotchas
- MeshToonMaterial in shadow drops the whole directional term: keep ambient high or orange goes brown.
- Keep pulse base colour under its own userData key (opacity code owns `userData.base`).
- Emissive glow is invisible on white or accent parts; blink opacity instead.
- Touch-only handlers can't be tested with mouse-driven automation; use pointer events.
- Rooms: work on opposite walls (sink run vs nook) needs two presets with different `v`, each cutting the walls between camera and work (learned on a kitchen build). The pale `fill` matters: a dark part fill hides the ink edges.
- Numbers derived from another file (plank rows, rips) : port its calculation functions instead of retyping results.
- Captures: run headless Chrome one at a time, each under `perl -e 'alarm 50; exec @ARGV' <chrome --headless=new --user-data-dir=<scratch>/st-N --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=520,880 --timeout=15000 --screenshot=...>` (macOS has no `timeout`; it does not exit on its own), then `pkill -f user-data-dir=<scratch>/st-N`. Parallel runs give black canvases.

## Sources
- Video with no transcript (music-only): read the burned-in captions from frames. Draw the paused video to a canvas at intervals, lay the frames out as a contact sheet on the page, screenshot it. Seeking in a background tab renders black.
