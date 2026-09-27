// Room from Photos — X film, 4:5 (1080 x 1350). Same cut and timeline as plan.js; only framing and type change.
// 3D shots re-rendered for the tall frame (film.js: size(2160, 2700), tune({el: 8, fin: 1.3}), prefixes rv45/ly45/fn45).
//   CRF=18 PRESET=slow node ../../engine/capture.cjs plan45.js film_4x5.mp4
import base from "./plan.js";
// UI take camera for a tall frame: the whole page floats at .26, the push-ins fill the frame with the model column (x -240..990, clear of the column divider at 1000; y to 910, above its toolbar).
const ui = [[0, [0, -2300, .26]], [.7, [0, 0, .26]], [1.0, [0, 0, .26]], [1.85, [360, 140, .72]], [3.3, [390, 160, .72]],
  [4.1, [360, 150, .72]], [6.2, [350, 150, .72]], [7.0, [0, 0, .26]]];
export default {
  ...base, frame: [864, 1080], scale: 1.25,
  caption: { ...base.caption, size: 26, small: 20, gap: 54 },
  scenes: base.scenes.map((s) =>
    s.type === "frames" ? { ...s, seq: { ...s.seq, src: s.seq.src.replace("/frames/", "/frames45/").replace(/(rv|ly|fn)_%/, "$145_%") } }
    : s.type === "product" ? { ...s, camera: ui }
    : s),
};
