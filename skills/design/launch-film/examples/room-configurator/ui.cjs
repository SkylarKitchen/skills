// The film's UI take: the real configurator, driven by real pointer events, one screenshot per film frame.
//   URL=http://localhost:8793/index.html#debug node ui.cjs <out-dir> [probe]      (probe: a dry run that prints the app's state, no screenshots)
// Writes f0000.jpg… (3200x2000) and cursor.json + cursor.mjs ({x, y, down} per frame, CSS px) for the compositor to draw the pointer.
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const OUT = path.resolve(process.argv[2] || "ui"), PROBE = process.argv[3] === "probe", FPS = 30;
const ease = (x) => (x = Math.min(1, Math.max(0, x)), x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  await p.goto(process.env.URL || "http://localhost:8793/index.html#debug", { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(3000);
  // Screen points (CSS px) of things in the model: a piece, the gizmo's arrow and ring, and where a world offset lands.
  await p.evaluate(() => { const E = ROOM.ev, T = ROOM.T;
    const proj = (v) => { E("applyCam()"); const cam = E("mcam"); cam.updateMatrixWorld(true); const q = v.clone().project(cam), r = E("mc").getBoundingClientRect();
      return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
    window.__f = {
      item(k){ const b = new T.Box3().setFromObject(E("OBJ")[k]), c = b.getCenter(new T.Vector3()); c.y = b.max.y * 0.8; return proj(c); },
      place(k){ return E("place()")[k].slice(); },
      checks(){ return [...document.querySelectorAll("#checks li")].map((li) => li.textContent).join(" | "); },
      arrow(axis, sign){ const tc = E("GIZ")[0]; E("applyCam()"); tc.updateMatrixWorld(true); const o = tc.object.getWorldPosition(new T.Vector3()); let best = null;   // handle transforms are baked into geometry: read world boxes
        tc._gizmo.gizmo.translate.traverse((m) => { if (m.isMesh && m.name === axis && m.visible){ const c = new T.Box3().setFromObject(m).getCenter(new T.Vector3()), a = axis.toLowerCase(), d = (c[a] - o[a]) * sign; if (d > 1 && (!best || d > best.d)) best = { d, c }; } });
        return { grab: proj(best.c), origin: proj(o), reach: best.d }; },
      offset(k, dx, dz){ const o = E("OBJ")[k].getWorldPosition(new T.Vector3()); const a = proj(o), q = proj(o.clone().add(new T.Vector3(dx, 0, dz))); return [q[0] - a[0], q[1] - a[1]]; },
      ring(){ const tc = E("GIZ")[1]; E("applyCam()"); tc.updateMatrixWorld(true); const o = tc.object.getWorldPosition(new T.Vector3()); let R = 0;
        tc._gizmo.gizmo.rotate.traverse((m) => { if (m.isMesh && m.name === "Y" && m.visible){ const bb = new T.Box3().setFromObject(m); R = Math.max(R, (bb.max.x - bb.min.x) / 2); } });
        return { o: [o.x, o.y, o.z], R, pts: Array.from({ length: 73 }, (_, i) => { const t = i / 72 * Math.PI * 2; return proj(o.clone().add(new T.Vector3(Math.cos(t) * R, 0, Math.sin(t) * R))); }) }; },
    }; });
  const f = (name, ...a) => p.evaluate(([n, a]) => window.__f[n](...a), [name, a]);
  const settle = () => p.evaluate(() => new Promise((r) => { ROOM.ev("slow = 0"); requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))); }));

  const K = process.env.KEY || "sofa", cursor = []; let frame = 0, mx = 1480, my = 930, down = false;
  const shot = async () => { await settle(); if (!PROBE) await p.screenshot({ path: path.join(OUT, `f${String(frame).padStart(4, "0")}.jpg`), type: "jpeg", quality: 93 });
    cursor.push({ x: +mx.toFixed(1), y: +my.toFixed(1), down }); frame++; };
  const glide = async (to, n, drag) => { const [x0, y0] = [mx, my]; for (let i = 1; i <= n; i++){ const k = ease(i / n); mx = x0 + (to[0] - x0) * k; my = y0 + (to[1] - y0) * k; await p.mouse.move(mx, my); await shot(); } };
  const hold = async (n) => { for (let i = 0; i < n; i++) await shot(); };
  const press = async () => { await p.mouse.move(mx, my); await settle(); await p.mouse.down(); down = true; await shot(); };
  const release = async () => { await p.mouse.up(); down = false; await shot(); };

  console.log("start", JSON.stringify(await f("place", K)), await f("checks"));
  await p.mouse.move(mx, my); await hold(6);
  await glide(await f("item", K), 22); await press(); await release();            // click the sofa: it selects, the gizmo appears
  await hold(12);
  const SL = +(process.env.SLIDE || 16);
  const AX = process.env.AXIS || "Z", SG = +(process.env.SIGN || 1); const ar = await f("arrow", AX, SG); await glide(ar.grab, 14); await hold(2); await press();   // take the south arrow
  const d = await f("offset", K, AX === "X" ? SG * SL : 0, AX === "Z" ? SG * SL : 0); const g0 = [mx, my];
  await glide([g0[0] + d[0], g0[1] + d[1]], 40); await release();                   // slide it back, clear of the coffee table
  console.log("before", "after slide", JSON.stringify(await f("place", K)), await f("checks"));
  await hold(4);
  const K2 = process.env.KEY2 || K;                                                  // the ring turns this piece (click it first)
  if (K2 !== K){ await p.keyboard.press("Escape"); await hold(2); await glide(await f("item", K2), 16); await press(); await release(); await hold(8); }   // deselect first: the sofa's ring would catch the click
  const rg = await f("ring"); let i0 = 0; rg.pts.forEach((q, i) => { if (q[1] > rg.pts[i0][1]) i0 = i; });  // the ring's point nearest the camera
  const TURN = +(process.env.TURN || -0.3);                                           // drag length along the ring's tangent, in ring half-widths
  await glide(rg.pts[i0], 14); await hold(2); await press();
  const t0 = rg.pts[(i0 + 71) % 72], t1 = rg.pts[(i0 + 1) % 72], tl = Math.hypot(t1[0] - t0[0], t1[1] - t0[1]);
  const hw = (Math.max(...rg.pts.map((q) => q[0])) - Math.min(...rg.pts.map((q) => q[0]))) / 2, L = TURN * hw, s0 = [mx, my];
  for (let s = 1; s <= 36; s++){ const u = ease(s / 36) * L; mx = s0[0] + (t1[0] - t0[0]) / tl * u; my = s0[1] + (t1[1] - t0[1]) / tl * u; await p.mouse.move(mx, my); await shot(); }
  await release(); console.log("after turn", JSON.stringify(await f("place", K2)), await f("checks"));
  await glide([mx + 150, my + 70], 20); await hold(10);
  const rec = JSON.stringify({ fps: FPS, dpr: 2, frames: cursor });
  fs.writeFileSync(path.join(OUT, "cursor.json"), rec); fs.writeFileSync(path.join(OUT, "cursor.mjs"), "export default " + rec + ";\n");   // the plan imports the .mjs
  console.log(`${frame} frames`); await b.close();
})();
