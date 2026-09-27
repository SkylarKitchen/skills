# Worked example: a film of a room-from-photos page

The film that made this skill's 3D mode: five phone photos, a fly-out from the first photo into the model, three layouts rearranging themselves, the paneling repainting, and the real gizmo sliding and turning furniture. The finished cut is on the [examples release](https://github.com/SkylarKitchen/skills/releases/tag/examples/launch-film).

Put these files in `<project>/film/`, next to the page and its `photos/`.

1. Serve the page (`python3 -m http.server 8793`) and open `index.html#debug` in a desktop browser with a GPU.
2. Start the sink in its own terminal: `python3 snapsink.py <frames-dir>` from the `room-from-photos` skill.
3. In that page's console: `const F = await import('/film/film.js'); F.size(3840, 2160); F.useBase(); await F.run('reveal', 0, undefined, {prefix: 'rv'});`, then run `layouts` (prefix `ly`) and `finishes` (prefix `fn`), and finish with `F.restore()`.
4. Downscale into `film/frames/`: `ffmpeg -start_number 0 -i <frames-dir>/rv_%04d.jpg -vf scale=1920:1080:flags=lanczos -q:v 2 -start_number 0 frames/rv_%04d.jpg`, and the same for `ly` and `fn`.
5. Record the UI take: dry-run it first (`node ui.cjs ui probe`, which prints each piece's position and the checks after every move), then run `node ui.cjs ui`.
6. Render: `node <skill>/engine/capture.cjs plan.js preview.mp4`.

For 4:5, render the shots again with `F.size(2160, 2700); F.tune({el: 8, fin: 1.3})` and prefixes `rv45`, `ly45` and `fn45`, downscale them to 1080×1350 into `frames45/`, and render `plan45.js`.
