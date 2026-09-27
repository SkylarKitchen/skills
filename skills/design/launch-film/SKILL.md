---
name: launch-film
description: Make a short, frame-exact product film for X or a portfolio from the real thing (a web app, a site, a Three.js scene, project photos), authored as a plan and rendered on a canvas engine rather than cut from a screen recording. Use when the user wants a launch video, a teaser, a "better version" of their own screen recording, or a showcase clip of something they built. Looping background reels cut from existing footage are a different job.
---

# Launch film

The films are **authored, not cut**. Energy comes from a camera moving over one continuous surface, with eased push-ins on the details that matter, not from edits. Every frame is a pure function of time, so a render is repeatable and a 25 s film at 1080p renders in under a minute.

The engine is `engine/film.html`, a 2D canvas that plays a `plan.js`. `engine/capture.cjs` steps it frame by frame in headless Chromium and pipes the frames to ffmpeg.

## Mode: pick one first
- **Showcase** (the default): the work speaks. The opener is an accelerating flip through the project's own images (photos, drawings, stills), with no words. The body is one continuous camera over the real surface, with push-ins on the best details. It ends on the pulled-back product, or on a plain title if the user wants one. Ask before adding a title card. Add one plain caption per beat at most (people watch X muted); no taglines, no pitch copy.
- **Interaction**: the cursor acts on the real page. A click motivates each camera move, and hovers show the page's real states. Shoot cursor-free stills of each state with Playwright (`hover()` and `click()` draw no cursor), plus each element's centre. Then use the product scene's `states` (section swaps keyed by time), `hovers` (a band, underline or ring where the page has no hover style), `cursor.clicks` and `cursor.hide`.
- **3D product** (a Three.js app): headless Chromium has no GPU, so render the 3D shots as frame sequences on a real GPU in a normal browser. A debug hook drives the camera and app state per frame, and each frame is POSTed as a JPEG to a local sink. Render at 4K, downscale to 1080p with lanczos, and play them in `frames` scenes. `from: {image, wipe}` wipes a photo into the render from the same camera. The UI take is the real app driven headless with real pointer events, one screenshot per frame (SwiftShader draws WebGL at about 1 s a frame), with the pointer recorded to `cursor.json` and replayed through a `product` scene with `seq` and `cursor.frames`. Dry-run each drag first and read the app's own state after it: a move that looks fine can turn a piece or break the app's checks. Worked example: `examples/room-configurator/`, a film of a `room-from-photos` page (`film.js` renders the shots, `ui.cjs` records the UI take, `plan.js` and `plan45.js` hold the timeline).

## Length and rhythm
- **Teaser, 20–30 s** for X: opener about 2 s, body in two or three beats of 4–8 s each.
- **Feature, about 80 s**: a few continuous takes with push-ins. Calm shots have a median of 4–8 s.
- Hard cuts only between scenes. Rapid cuts live only in the opener, never over UI states. Longer than 90 s is a tutorial, not this skill.

## Pipeline
1. **Source the surface.** `node engine/shoot.cjs <url> page.png 1440 900` (add `full` for a scrolling page). For 3D, render the frame sequences first (see the worked example). Measure every position you'll push in on from the full-size image, never from a scaled contact sheet.
2. **Write `plan.js`** in the project (copy `examples/quickstart/plan.js`). See the plan reference below.
3. **Render**: `node engine/capture.cjs plan.js preview.mp4`. It needs Playwright and ffmpeg; `CHROMIUM=<path>` uses a system Chromium.
4. **Look at it.** Make a sheet with `ffmpeg -i preview.mp4 -vf "fps=2,scale=320:-1,tile=8x5" -frames:v 1 sheet.png`, and pull full-size frames mid camera move. The sheet hides direction errors, such as a panel dropping in from above instead of rising.
5. **Gate.** `bash measure.sh preview.mp4 <opener_end_s>` must pass: after the opener, calm shots have a median of at least 3.5 s, with at most two rapid bursts of up to 5 s. Then run `bash holds.sh preview.mp4 <t> ...` at each camera hold. It fails a push-in that frames blank page.
6. **Show the user the preview and the sheet before any final encode.**
7. **Deliver.** Re-render with `CRF=18 PRESET=slow`. X takes H.264 1920×1080. For the feed, a 4:5 cut (`frame: [864, 1080]`, `scale: 1.25` = 1080×1350) takes more of a phone screen. Give it its own plan that imports the 16:9 one and overrides the frame, the camera keys and the type sizes. A 3D film needs its shots re-rendered at 4:5: a narrower frame keeps the photo's height, not its width.

## Sound
Deliver X cuts without an audio track (`-an`) unless the user supplies music or asks for sound: X autoplays muted, and generic synth beds read as cheap. `capture.cjs` writes `<out>.cues.json` with every cut, camera whip and press. `engine/sound.py` (needs numpy) turns the cues into a synth bed if the user wants one. With supplied music, snap scene durations to its beats.

## Plan reference
Top level:
- `frame` and `scale`: the logical frame (default `[1280, 720]`) and output scale. Positions and sizes are in logical px.
- `fps`: default 25. Use 30 to match frame sequences rendered at 30, and keep every duration a whole number of frames (`n / 30`).
- `images`: `{name: url}`, preloaded.
- `fonts`: `{Name: url}` or `{Name: {src, weight: "100 900"}}` for a variable face; `font` picks the one to use. Always load one. A minimal Linux container may map `sans-serif` to a monospace face.
- `captions`: labels in film time, `{text, from, to, row, tag}`. They sit top-left, in sentence case: a white label, with an optional dark letter tag such as an option's A, B or C. `caption` sets x, y, gap, size, small, ink and bg.
- `grain: true`: adds film grain.

Scenes (`{type, dur, bg, ...}`), played in order:
- `still`: a project image. `cover: true` makes it full-bleed with a slow `push`; otherwise `fit`, `dx` and `dy` place it. `word` sets optional text.
- `product`: a UI image floating on the ground. `crop: [x, y, w, h]` of the image; `camera: [[t, [cx, cy, zoom]], ...]`, eased between keys, in image px from the crop's centre (positive y looks lower on the page). `seq` swaps in a screenshot sequence instead of `image`. `cursor` is either `{path: [[t, [x, y]]], click, clicks, hide}` or `{frames, fps, scale, ripple}` (the pointer recorded with the take, in CSS px times `scale`). Also `states`, `hovers` and `headline` (a line over the empty ground before the UI rises in).
- `frames`: a full-bleed frame sequence, `seq: {src: "shot_%04d.jpg", count, fps, at}`. It holds the first frame before `at` and the last frame after the end. `from: {image, wipe: [t0, t1]}` wipes it in over a still.
- `title`: a centred `text` with an optional `sub` line, rising in; `typeOn: true` types the text instead.
- `tagline`: `lines` rising in, one after another.

## Gotchas
- A whip (a camera jump over 400 image px between keys) adds a whoosh cue. Any other camera change stays silent.
- The scene detector behind `measure.sh` misses a cut between two same-colour frames, so check a white-on-white opener by eye.
- In `holds.sh`, test camera holds only. A title card is meant to read as empty.
- Check every photo before it goes public: documents with readable text, house numbers, street signs, and names on screens.
- The capture browser has no GPU. Keep film scenes 2D canvas, and bring 3D in as pre-rendered frames.
