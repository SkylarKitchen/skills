// Screenshot one or more options' sheets into shots/. No server: each option's preview is written beside the page as
// .preview-<key>.html (preview.html filled in, everything inline but diagrams.js) and opened over file://.
// usage: NODE shoot.cjs o01 [o02 ...]      (NODE is brief.json `node`; a worked example's key, such as F, works too)
// writes shots/<key>-plan0.png (ground or only floor), -plan1.png (upper floor), -sect.png, -axon.png, -site.png,
// -diagrams.png (when the run has diagrams.js) and -page.png (the whole sheet)
// fit.cjs and labels.cjs require this file for playwright and the preview.
const fs = require('fs'), path = require('path');
const dir = __dirname, read = f => fs.readFileSync(path.join(dir, f), 'utf8');

// playwright: from the run's own node_modules (or NODE_PATH), else from the global install beside this node
function playwright() {
  const tries = [() => require('playwright'),
    () => require(path.join(path.dirname(path.dirname(process.execPath)), 'lib', 'node_modules', 'playwright')),
    () => require(path.join(require('child_process').execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(), 'playwright'))];
  for (const t of tries) { try { return t(); } catch (e) {} }
  console.error('playwright is not installed for this node. Run: sh ' + path.join(dir, 'setup.sh') + ' --install ' + dir);
  process.exit(3);
}

// the preview of one option, as a file beside the page; returns its file:// URL
function previewFile(key) {
  const B = require('./build.cjs'), d = B.data();
  const f = B.optPath(key); B.fresh([f]);
  if (!fs.existsSync(path.join(dir, f))) throw new Error(f + ' is missing');
  const script = '(function(){\n\'use strict\';\nconst KEY = ' + JSON.stringify(key) + ';\n' + B.globals(d, { registry: B.registry() })
    + read('lib.js') + '\n' + read(f) + '\n' + read('sheet.js') + '\n' + read('preview-init.js') + '\n})();';
  const html = read('preview.html').replace('/*STYLE*/', () => B.css()).replace('/*SCRIPT*/', () => script.replace(/<\/script/gi, '<\\/script'))
    .replace('<!--DIAGRAMS-->', () => fs.existsSync(path.join(dir, 'diagrams.js')) ? '<script src="diagrams.js"></script>' : '');
  const out = path.join(dir, '.preview-' + key + '.html');
  fs.writeFileSync(out, html);
  return 'file://' + out;
}
const pageURL = () => 'file://' + path.join(dir, require('./project.js').out);
// wait until the sheet is drawn and, when the page has diagrams.js, the diagrams too
async function settle(page, flag) {
  await page.waitForFunction(f => window[f] || (window.__errs && window.__errs.length), flag, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => window.HouseDiagrams ? Promise.race([window.HouseDiagrams.ready, new Promise(r => setTimeout(r, 8000))]) : null).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(300);
}

async function main() {
  const keys = process.argv.slice(2);
  if (!keys.length) { console.log('usage: shoot.cjs <key> [key...]'); process.exit(1); }
  const { chromium } = playwright(), browser = await chromium.launch();
  const out = path.join(dir, 'shots'); fs.mkdirSync(out, { recursive: true });
  let bad = 0;
  for (const k of keys) {
    let url; try { url = previewFile(k); } catch (e) { console.log(`${k}: ERRORS ${e.message}`); bad++; continue; }
    const page = await browser.newPage({ viewport: { width: 1320, height: 1000 }, deviceScaleFactor: 1 });
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await settle(page, '__done');
    for (const f of fs.readdirSync(out).filter(f => f.startsWith(k + '-') && f.endsWith('.png'))) fs.unlinkSync(path.join(out, f));
    const made = [], shot = async (el, name) => { if (el && (await el.boundingBox() || {}).height > 2) { await el.screenshot({ path: `${out}/${k}-${name}.png` }); made.push(name); } };
    const plans = await page.$$('canvas.plan');
    for (let i = 0; i < plans.length; i++) await shot(plans[i], 'plan' + i);
    for (const kind of ['sect', 'axon', 'site']) await shot(await page.$('canvas.' + kind), kind);
    await shot(await page.$('.diagrams'), 'diagrams');
    // Size the window to the whole sheet first: a fullPage capture of a tall page stitches tiles beyond the
    // viewport and can leave a blank block over the notes.
    const h = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    await page.setViewportSize({ width: 1320, height: h });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${k}-page.png` }); made.push('page');
    const all = errs.concat(await page.evaluate(() => window.__errs || []));
    if (all.length) bad++;
    console.log(`${k}: ${all.length ? 'ERRORS ' + all.join(' | ') : 'no page errors'}; wrote shots/${k}-{${made.join(',')}}.png`);
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
}

module.exports = { playwright, previewFile, pageURL, settle };
if (require.main === module) main();
