## What it does

`launch-film` makes a short product film (a 20–30 s teaser for X, or a longer feature cut) from the real thing you built: a web app, a site, a Three.js scene, or a set of project photos. Instead of cutting a screen recording, the agent writes a `plan.js` that describes a camera moving over the real surface, with captions and scene timings. A small canvas engine then renders it frame by frame in headless Chromium and hands the frames to ffmpeg. Every frame is a pure function of time, so a render is repeatable, a 25 s film at 1080p takes under a minute, and changing one push-in means editing one line.

The default grammar is a showcase: an accelerating flip through the project's own images, one continuous camera over the product with eased push-ins on the details worth seeing, and at most one plain caption per beat. For a 3D app the 3D shots are rendered on a real GPU as frame sequences, and the app itself is driven headless with real pointer events, so a drag in the film is a real drag.

The examples release has a finished film: [examples/launch-film](https://github.com/SkylarKitchen/skills/releases/tag/examples/launch-film). It was made from a `room-from-photos` page: five phone photos, the model flying out of the first photo, three layouts rearranging themselves, the paneling repainting, and the real gizmo sliding and turning furniture.

## When to reach for it

Ask for a launch video, a teaser, a showcase clip, or a better version of a screen recording you made yourself, and the agent reaches for it. Type `/launch-film` to call it directly.

It's for a film you author. To cut an existing recording into a looping background reel, trim the footage instead.

## Common questions

**Do I need a video editor?**
No. The plan is the edit. Scene lengths, camera keys, captions and the cut order all live in one JavaScript file, and every render starts from it.

**What does it need installed?**
Node with Playwright (`npm i playwright`, then `npx playwright install chromium`) and ffmpeg. The optional sound bed needs Python with numpy.

**Can it film a 3D app?**
Yes, with one extra step. Headless Chromium has no GPU, so the 3D shots are rendered in a normal browser: the page exposes a debug hook, a script sets the camera and state for each frame, and each frame is posted to a local sink. `examples/room-configurator/` shows the whole setup for a `room-from-photos` page.

**Does it do vertical or 4:5?**
Yes. A 4:5 cut is its own small plan that imports the 16:9 one and changes the frame, the camera keys and the type sizes. 3D shots are re-rendered for the taller frame.

**What about sound?**
Films for X ship silent by default, because X autoplays muted. If you want sound, bring a track, or use the cue-driven synth bed in `engine/sound.py`.

## It's working if

- The camera never cuts between UI states. It moves over one continuous surface and pushes in on real details.
- `measure.sh` passes after the opener, and `holds.sh` passes at every camera hold.
- Mid-move frames show the camera going where the plan says (a panel rises in, it doesn't drop in).
- Captions match what is on screen at that moment.
- The same plan renders the same video twice.
