// Worked example: a film of a room-from-photos page, 16:9, 30 fps, ~26 s. Showcase grammar: the work speaks, one plain label per beat.
// Lives in <project>/film/ next to <project>/photos/. 3D shots are GPU-rendered frame sequences (film.js in the page's #debug mode);
// the UI take is the real app driven headless (ui.cjs).
//   node ../../engine/capture.cjs plan.js preview.mp4      (path to the skill's engine from wherever the plan sits)
import CUR from "./ui/cursor.mjs";
const F = new URL("./", import.meta.url).href, D = new URL("../", import.meta.url).href;   // film/ and the project folder
const ground = "#F2F2EF", ink = "#141414", f = (n) => n / 30;   // every duration a whole number of frames
const photo = (i, n) => ({ type: "still", dur: f(n), bg: ground, image: "p" + i, cover: true, push: .04 });
const seq = (name, count, at = 0) => ({ src: F + `frames/${name}_%04d.jpg`, count, fps: 30, at });
// UI take camera, crop-centred image px (the page is 3200 x 2000): rise in, push to the sofa's gizmo, pan to the grey chair, pull back.
const ui = [[0, [0, -1300, .33]], [.7, [0, 0, .33]], [1.0, [0, 0, .33]], [1.85, [560, 190, .62]], [3.3, [610, 220, .62]],
  [4.1, [470, 370, .58]], [6.2, [440, 380, .58]], [7.0, [0, 0, .33]]];

export default {
  fps: 30, frame: [1280, 720], scale: 1.5, grain: false,
  fonts: { Geist: { src: F + "geist.woff2", weight: "100 900" } }, font: "Geist",   // any variable woff2 (Geist is OFL); drop both keys for the system sans
  images: Object.fromEntries([1, 2, 3, 4, 5].map((i) => ["p" + i, D + `photos/photo-${i}.jpg`])),
  caption: { x: 36, y: 34, gap: 48, size: 23, small: 18, ink },
  scenes: [
    // Opener: four of the five phone photos, accelerating (21, 17, 14, 12 frames), landing on photo 1.
    photo(2, 21), photo(3, 17), photo(4, 14), photo(5, 12),
    // Photo 1 holds, wipes to the model seen from the same phone position, then the camera flies up and out into the dollhouse.
    { type: "frames", dur: f(183), bg: ground, seq: seq("rv", 120, f(63)), from: { image: "p1", wipe: [f(27), f(54)] }, cues: { tick: [0], whoosh: [f(54), f(63) + 1.6] } },
    // Same camera continues: the pieces rearrange A -> B -> C while it drifts round.
    { type: "frames", dur: f(180), bg: ground, seq: seq("ly", 180), cues: { whoosh: [1.6, 4.3] } },
    // Push in on the fireplace wall: honey oak paneling -> deep green -> limewashed.
    { type: "frames", dur: f(96), bg: ground, seq: seq("fn", 96) },
    // The real app: select the sofa, slide it back with the arrow, pick the grey chair, turn it with the ring; plan and checks follow.
    // No title card: the film ends on the pulled-back app, held 1.2 s.
    { type: "product", dur: f(246), bg: ground, ink, crop: [0, 0, 3200, 2000], seq: { src: F + "ui/f%04d.jpg", count: 216, fps: 30 },
      camera: ui, cursor: { frames: CUR.frames, fps: 30, scale: CUR.dpr, ripple: "31,79,216" } },
  ],
  captions: [
    { text: "5 phone photos", from: .15, to: 3.0 },
    { text: "Rebuilt in 3D", from: 3.5, to: 7.2 },
    { text: "3 layouts", from: 7.3, to: 14.2 },
    { text: "As it is", tag: "A", row: 1, from: 7.45, to: 8.85 },
    { text: "Face the fireplace", tag: "B", row: 1, from: 8.8, to: 11.5 },
    { text: "Sofa under the windows", tag: "C", row: 1, from: 11.45, to: 14.2 },
    { text: "Finishes", from: 14.35, to: 17.35 },
    { text: "As it is", row: 1, from: 14.35, to: 15.1 },
    { text: "Deep green paneling", row: 1, from: 15.05, to: 16.4 },
    { text: "Limewashed paneling", row: 1, from: 16.35, to: 17.35 },
    { text: "Slide with the arrows", from: 18.2, to: 21.3 },
    { text: "Turn with the ring", from: 21.4, to: 24.3 },
  ],
};
