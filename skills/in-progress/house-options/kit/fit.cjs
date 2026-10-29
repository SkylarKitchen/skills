// Every drawing fits its column, and the page keeps one scale per kind of drawing on every sheet.
// A canvas wider than its .draw box scrolls sideways, and the part past the edge is missing from every capture.
// Checks each option's preview (shoot.cjs's page, at its 1320 px) for every option file in opts/, and the page's sheets
// at desktop, tablet and phone widths. On the page, every sheet's plans, sections, axons and site plans must also shrink
// from their size at the widest width by one factor per width, since the title block says "Same scale on every sheet";
// a fix that shrinks only the drawings that overflow breaks that. Exits 1 on any failure.
// usage: NODE fit.cjs [preview|page]      (no server: both are opened over file://)
const fs = require('fs'), path = require('path'), { playwright, previewFile, pageURL, settle } = require('./shoot.cjs');
const WIDTHS = [1320, 1240, 1100, 1024, 960, 930, 900, 890, 881, 880, 820, 768, 600, 414, 390, 360, 320];
const PAD = { plan: 0, sect: 0, axon: 16, site: 66 };   // px a canvas adds beyond its drawing (drawAxon pads 8 px a side; lib.js SITE_PAD, SITE_R)
const measure = root => [...document.querySelectorAll(root + ' .draw')].map(d => {
  const c = d.querySelector('canvas'), s = d.closest('[data-k]');
  return { k: s ? s.dataset.k : '?', kind: c ? c.className + (c.dataset.lvl ? c.dataset.lvl : '') : '?', over: d.scrollWidth - d.clientWidth, w: c ? c.getBoundingClientRect().width : 0 };
});

(async () => {
  const only = process.argv[2], fails = [];
  const { chromium } = playwright(), browser = await chromium.launch();
  if (only !== 'page') {
    const keys = fs.readdirSync(path.join(__dirname, 'opts')).filter(f => /^o\d\d\.js$/.test(f)).map(f => f.slice(0, 3)).sort();
    const page = await browser.newPage({ viewport: { width: 1320, height: 1000 }, deviceScaleFactor: 1 });
    for (const k of keys) {
      await page.goto(previewFile(k), { waitUntil: 'load' });
      await settle(page, '__done');
      for (const m of await page.evaluate(measure, '#sheet')) if (m.over > 0) fails.push(`preview ${k} at 1320: ${m.kind} canvas ${m.over} px wider than its column`);
    }
    await page.close();
    console.log(`preview: ${keys.length} sheets checked`);
  }
  if (only !== 'preview') {
    let n = 0; const size = {};   // size[w][k][kind] = the canvas's CSS width
    for (const w of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
      await page.goto(pageURL(), { waitUntil: 'load' });
      await settle(page, '__drawn');
      size[w] = {};
      for (const m of await page.evaluate(measure, '#sheets .sheet')) {
        if (m.over > 0) fails.push(`page ${m.k} at ${w}: ${m.kind} canvas ${m.over} px wider than its column`);
        (size[w][m.k] = size[w][m.k] || {})[m.kind] = m.w;
      }
      n += Object.keys(size[w]).length;
      await page.close();
    }
    // one scale per kind per width: each drawing's size over its size at the widest width is the same for every sheet
    const w0 = WIDTHS[0];
    for (const w of WIDTHS.slice(1)) {
      const kinds = [...new Set(Object.values(size[w]).flatMap(o => Object.keys(o)))];
      for (const kind of kinds) {
        const pad = PAD[kind.replace(/\d+$/, '')] || 0;
        const rs = Object.keys(size[w]).filter(k => size[w][k][kind] && size[w0][k] && size[w0][k][kind])
          .map(k => ({ k, a: size[w][k][kind] - pad, b: size[w0][k][kind] - pad }));
        if (rs.length < 2) continue;
        const med = rs.map(r => r.a / r.b).sort((x, y) => x - y)[rs.length >> 1];
        for (const r of rs) if (Math.abs(r.a - med * r.b) > 2)
          fails.push(`page ${r.k} at ${w}: ${kind} drawn ${Math.round(r.a)} px where one scale for every sheet gives ${Math.round(med * r.b)} px`);
      }
    }
    console.log(`page: ${n} sheets checked at ${WIDTHS.length} widths`);
  }
  await browser.close();
  if (fails.length) { console.log(fails.join('\n')); console.log(`FAIL: ${fails.length} problem(s)`); process.exit(1); }
  console.log('PASS: every drawing fits its column, at one scale per kind on every sheet');
})();
