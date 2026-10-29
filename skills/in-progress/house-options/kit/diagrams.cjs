// diagrams.cjs: shoot each option's diagram set from diagrams-preview.html into shots/.
// usage: <node> diagrams.cjs o01 [o02 ...]        (brief.json's `node`: `node`, or `orb run node` where native binaries are blocked)
// All the options load on one page, as on the catalog page, so their partis share one scale. For each key it writes
//   shots/<key>-diag-parti.png   the parti        shots/<key>-diag-site.png    the site plan (when the option is placed)
//   shots/<key>-diag-steps.png   the step row     shots/<key>-diag.png         the whole set with its captions
// at 2x. WIDTH (default 1180) sets the page width; BRIEF names another brief file (or none) and TAG goes after -diag in
// the names, for test runs; the server and playwright's folder come from project.js (serve,
// nodePath), and FIT_BASE and NODE_PATH override them, as for shoot.cjs.
const path = require('path'), fs = require('fs'), P = require('./project.js');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require(path.resolve(__dirname, P.nodePath || '', 'playwright')); } })();
const S = P.serve || {}, BASE = process.env.FIT_BASE || `http://${S.host}:${S.port}${S.path || '/' + path.basename(__dirname) + '/'}`;
(async () => {
  const keys = process.argv.slice(2);
  if (!keys.length) { console.log('usage: diagrams.cjs <key> [key...]'); process.exit(1); }
  const width = +process.env.WIDTH || 1180, out = path.join(__dirname, 'shots'), tag = process.env.TAG ? '-' + process.env.TAG : '';
  const bq = process.env.BRIEF ? '&b=' + encodeURIComponent(process.env.BRIEF) : '';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(BASE + 'diagrams-preview.html?o=' + keys.join(',') + bq + '&t=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__done, null, { timeout: 20000 }).catch(() => errs.push('timed out waiting for the preview'));
  const font = await page.evaluate(() => [...document.fonts].some(f => /Geist/.test(f.family) && f.status === 'loaded'));
  if (!font) errs.push('Geist did not load: labels are set in a fallback face');
  await page.waitForTimeout(300);
  const made = [];
  for (const k of keys) {
    const m = await page.$('#dg-' + k); if (!m) { errs.push(k + ': no mount'); continue; }
    const shot = async (sel, name) => { const e = await m.$(sel); if (e) { await e.screenshot({ path: path.join(out, `${k}-${name}${tag}.png`) }); made.push(`${k}-${name}${tag}`); } };
    await shot('.dg-parti canvas', 'diag-parti');
    await shot('.dg-site canvas', 'diag-site');
    await shot('.dg-steps', 'diag-steps');
    await m.screenshot({ path: path.join(out, `${k}-diag${tag}.png`) }); made.push(`${k}-diag${tag}`);
  }
  const all = errs.concat(await page.evaluate(() => window.__errs || []));
  console.log(`${all.length ? 'ERRORS ' + all.join(' | ') : 'no page errors'}; wrote shots/: ${made.join(', ')}`);
  await browser.close();
  process.exit(all.length ? 1 : 0);
})();
