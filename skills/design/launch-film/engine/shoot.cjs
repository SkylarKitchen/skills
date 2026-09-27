// Screenshot a page for a product scene: cursor-free, at 2x.
//   node engine/shoot.cjs <url> <out.png> [width=1440] [height=900] [full]
// "full" captures the whole scrolling page (for a camera that travels down it); otherwise one viewport.
const { chromium } = require("playwright");
(async () => {
  const [url, out, w = "1440", h = "900", full] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: "networkidle", timeout: 60000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: out, fullPage: full === "full" });
  console.log(out); await b.close();
})();
