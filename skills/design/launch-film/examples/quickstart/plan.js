// Quickstart: a 10 s showcase film of one page. Shoot the page first (1440 x 900 at 2x = 2880 x 1800):
//   node ../../engine/shoot.cjs https://your-site.example page.png 1440 900
//   node ../../engine/capture.cjs plan.js preview.mp4
// Camera keys are [t, [cx, cy, zoom]] in image px from the crop's centre; zoom .4 fits 2880 px into the 1280-wide frame.
const HERE = new URL("./", import.meta.url).href, f = (n) => n / 30;   // every duration a whole number of frames
const ground = "#F2F2EF", ink = "#141414";

export default {
  fps: 30, frame: [1280, 720], scale: 1.5,   // 1920 x 1080 out
  images: { page: HERE + "page.png" },
  // Geist (OFL) from jsDelivr; a local woff2 path works too. Without fonts/font the engine uses the system sans.
  fonts: { Geist: { src: "https://cdn.jsdelivr.net/npm/@fontsource-variable/geist@5/files/geist-latin-wght-normal.woff2", weight: "100 900" } }, font: "Geist",
  scenes: [
    // Rise in, hold on the whole page, push to the top-left detail, drift right, pull back out.
    { type: "product", dur: f(240), bg: ground, ink, image: "page", crop: [0, 0, 2880, 1800],
      camera: [[0, [0, -1500, .4]], [.8, [0, 0, .4]], [1.6, [0, 0, .4]], [2.6, [-620, -420, .95]], [4.6, [-420, -380, .95]],
               [5.6, [380, 120, .8]], [7.0, [420, 140, .8]], [7.8, [0, 0, .4]]] },
    { type: "title", dur: f(75), bg: ground, ink, text: "Your project", sub: "One plain line", size: 66, subSize: 24, subInk: "#6b6b66" },
  ],
  caption: { x: 36, y: 34, size: 23, ink },
  captions: [
    { text: "What it is", from: 1.0, to: 2.6 },
    { text: "The detail worth a push-in", from: 2.8, to: 4.8 },
  ],
};
