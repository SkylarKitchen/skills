// Render a launch-film plan to mp4, frame-exact (no wall clock involved).
//   node engine/capture.cjs <plan.js> <out.mp4>
// Needs Playwright (npm i playwright; npx playwright install chromium) and ffmpeg on PATH.
// Env: CRF=18 PRESET=slow for the delivery encode (defaults 16 / medium); CHROMIUM=<path> to use a system Chromium.
const { chromium } = require("playwright"), { spawn } = require("child_process"), path = require("path");
(async () => {
  const [plan, out] = process.argv.slice(2).map((p) => path.resolve(p));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1920 } });
  p.on("pageerror", (e) => { console.error(e); process.exit(1); });
  await p.goto(`file://${__dirname}/film.html?plan=file://${plan}`);
  const P = await p.evaluate(async () => { const P = await window.ready; return { dur: P.scenes.reduce((a, s) => a + s.dur, 0), fps: P.fps || 25 }; });
  const FPS = P.fps;   // plan.fps: 30 for 3D frame sequences rendered at 30
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-crf", process.env.CRF || "16", "-preset", process.env.PRESET || "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  const n = Math.round(P.dur * FPS);
  for (let f = 0; f < n; f++) {
    const url = await p.evaluate(async (t) => (await render(t), document.getElementById("c").toDataURL("image/png")), f / FPS);   // render awaits per-frame images (seq)
    if (!ff.stdin.write(Buffer.from(url.split(",")[1], "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  // Sound cues derived from the plan (for sound.py): cuts, the cut into the page, camera moves, presses, the title.
  const cues = await p.evaluate(() => { const c = { swaps: [], whips: [], presses: [], page: null, title: null }; let t0 = 0;
    for (const s of PLAN.scenes) { if (s.type === "still") c.swaps.push(t0);
      for (const [k, arr] of Object.entries(s.cues || {})) for (const v of arr) (k === "whoosh" ? c.whips : k === "press" ? c.presses : c.swaps).push(t0 + v);
      const cf = s.cursor?.frames; if (cf) cf.forEach((q, i) => { if (q.down && !(cf[i - 1] || {}).down) c.presses.push(t0 + (s.cursor.at || 0) + i / (s.cursor.fps || 30)); });
      if (s.type === "product") { c.page ??= t0; for (let i = 1; i < (s.camera || []).length; i++) { const [ta, a] = s.camera[i - 1], [tb, b] = s.camera[i];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 400) c.whips.push(t0 + tb); } for (const k of [s.cursor?.click, ...(s.cursor?.clicks || [])]) if (k != null) c.presses.push(t0 + k); }
      if (s.type === "title") c.title = t0; t0 += s.dur; }
    c.seconds = t0; return c; });
  require("fs").writeFileSync(out.replace(/\.mp4$/, ".cues.json"), JSON.stringify(cues)); await b.close();
  console.log(`${out}: ${n} frames, ${P.dur}s`);
})();
