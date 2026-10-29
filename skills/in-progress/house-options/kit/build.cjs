// build.cjs: the page as one self-contained file, project.js `out` (house-options.html). build.sh runs it with brief.json `node`.
// Head, style (the Geist font inlined) and body (every {{TOKEN}} filled from brief.json and costs.json), then one script:
// the brief, the cost rates, the grades (results.json, when it exists), the registry (read from REGISTRY.md), the drawing
// kit, the options listed in accepted.txt (one key per line, e.g. o05, so a drawing still in progress never reaches the
// page), the sheet and the page code. Then diagrams.js, when the run has one.
// shoot.cjs requires this file for the same pieces (css, globals, option files), so the preview and the page agree.
const fs = require('fs'), path = require('path');
const dir = __dirname, read = f => fs.readFileSync(path.join(dir, f), 'utf8'), has = f => fs.existsSync(path.join(dir, f));
const fail = m => { console.error('build.sh: not built: ' + m); process.exit(1); };
const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = n => '$' + Math.round(n).toLocaleString('en-US');

// Touch the inputs before reading them: where node runs in a VM (brief.json `node` = "orb run node"), a file just written
// from the Mac can read stale until it is touched from inside the VM.
function fresh(files) { const t = new Date(); for (const f of files) { try { fs.utimesSync(path.join(dir, f), t, t); } catch (e) {} } }
const INPUTS = ['brief.json', 'costs.json', 'results.json', 'project.js', 'REGISTRY.md', 'accepted.txt', 'head.html', 'body.html', 'style.css',
  'lib.js', 'sheet.js', 'catalog.js', 'preview.html', 'preview-init.js', 'diagrams.js'];
function json(f, need) {
  if (!has(f)) { if (need) throw new Error(f + ' is missing'); return null; }
  try { return JSON.parse(read(f)); } catch (e) { throw new Error(f + ' does not parse: ' + e.message); }
}
// brief.json (required), costs.json (required) and results.json (only once graded)
function data() { fresh(INPUTS); return { brief: json('brief.json', true), costs: json('costs.json', true), results: json('results.json', false) }; }
// the option file for a key: opts/oNN.js for a drawn option, examples/<key>.js for a worked example (never on the page)
const optPath = k => /^o\d\d$/.test(k) ? 'opts/' + k + '.js' : 'examples/' + k + '.js';
// style.css with the bundled Geist font as a data URI, so the page needs no network and works from file://
function css() {
  const font = path.join(dir, 'fonts', 'geist-latin-wght-normal.woff2');
  const s = read('style.css');
  return fs.existsSync(font) ? s.replace(/url\(fonts\/geist-latin-wght-normal\.woff2\)/g, 'url(data:font/woff2;base64,' + fs.readFileSync(font).toString('base64') + ')') : s;
}
// the registry as the page reads it: each `**NN Name.**` that starts a line in REGISTRY.md, with the first sentence after it;
// template entries ({{FILL...}}) are left out
function registry() {
  if (!has('REGISTRY.md')) return [];
  return [...read('REGISTRY.md').matchAll(/^\*\*(\d\d) (.+?)\.\*\*\s*(.*)$/gm)]
    .filter(m => !/\{\{/.test(m[2])).map(m => [m[1], m[2].trim(), (m[3].match(/^.*?[.!?](?=\s|$)/) || [m[3]])[0].replace(/\{\{[^}]*\}\}/g, '').trim()]);
}
// the constants every page script reads; brief, costs and grades are data, never code
function globals(d, page) {
  const j = v => JSON.stringify(v == null ? null : v).replace(/</g, '\\u003c');
  return 'const BRIEF = ' + j(d.brief) + ';\nconst COSTS = ' + j(d.costs) + ';\nconst RESULTS = ' + j(d.results) + ';\nconst PAGE = ' + j(page || {}) + ';\n'
    + "if(typeof window!=='undefined'){ window.BRIEF = BRIEF; window.RESULTS = RESULTS; }\n";
}
const accepted = () => has('accepted.txt') ? [...new Set(read('accepted.txt').split(/\s+/).filter(s => /^o\d\d$/.test(s)))].sort() : [];

// ---------------------------------------------------------------- the page's words, from the brief
function words(B, C, P, reg, R) {
  const S = B.site || {}, G = B.program || {}, lat = +S.lat, n = reg.length || 8, who = B.who || 'the owner';
  const area = Math.abs((S.lot || []).reduce((a, p, i, L) => { const q = L[(i + 1) % L.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  const known = S.known || [];
  const rooms = (G.rooms || []).map(r => (r.count > 1 ? r.count + ' × ' : '') + esc(r.name) + (r.minSf ? ' (' + r.minSf + ' sf)' : '')).join(', ');
  const crit = { wishes: 'your wishes', sun: 'sun and climate', cost: 'cost against budget', life: 'daily life', idea: 'strength of the idea' };
  const facts = [
    ['The lot', `${Math.round(area).toLocaleString('en-US')} sf, ${(S.lot || []).length} sides, setbacks ${(S.setbacks || []).join(', ')} ft; ${lat}° N` + (S.region ? ', ' + esc(S.region) : '') + (S.climate ? '; ' + esc(S.climate) : '')],
    ['Budget', B.budget && B.budget.total ? money(B.budget.total) + (B.budget.covers ? ', ' + esc(B.budget.covers) : '') : 'not given'],
    ['Rooms', (rooms || 'as the plans give') + (G.areaRange ? `; ${G.areaRange.map(v => v.toLocaleString('en-US')).join(' to ')} sf` : '') + (G.storeys ? `; up to ${G.storeys} storey${G.storeys > 1 ? 's' : ''}` : '') + (G.foundation && G.foundation !== 'any' ? '; ' + esc(G.foundation) : '')],
    ['Wishes', (B.wishes || []).map(w => esc(w.text)).join('; ') || 'none listed'],
    ['Ranked by', (B.criteria || []).map((c, i) => (crit[c] || esc(c)) + ' ' + ((B.weights || [])[i] != null ? B.weights[i] : '')).join(', ')]
  ].concat(B.style && B.style.length ? [['Style', B.style.map(esc).join(', ')]] : []);
  const R0 = C.rates || {}, rate = r => r ? `<td>${esc(r.label)}</td><td>${money(r.rate)} ${esc(r.unit)}</td><td class="src">${esc(r.src)}</td>` : '';
  const rows = Object.entries(R0).flatMap(([k, r]) => r && r.rate != null ? [[k, r]] : Object.entries(r || {}).map(([f, x]) => [k + ' ' + f, x]));
  const M = C.markup || {}, L = C.location || {};
  const costTable = '<div class="tablewrap"><table class="rates"><thead><tr><th>What</th><th>Rate</th><th>Source</th></tr></thead><tbody>'
    + rows.map(([, r]) => '<tr>' + rate(r) + '</tr>').join('')
    + Object.values(M).map(m => `<tr><td>${esc(m.label)}</td><td>${Math.round(m.rate * 100)}%</td><td class="src">${esc(m.src)}</td></tr>`).join('')
    + '</tbody></table></div>';
  const T = {
    TITLE: esc(P.title || B.title || 'House options'),
    H1: P.text && P.text.h1 || esc(B.title || 'House options'),
    LEDE: P.text && P.text.lede || `${n} plan types for ${esc(who)}${/s$/i.test(who) ? "'" : "'s"} house on this lot, each drawn to the same scale: the plans, a section with the noon sun, a view from above, a site plan, step diagrams, each wish measured from the plan, and a rough cost. ` + (R ? 'They are ranked by the criteria below, in the order you chose.' : 'They are ranked once every option is drawn and graded; until then they show in number order.'),
    FACTS: facts.map(f => '    <span><b>' + f[0] + '</b>' + f[1] + '</span>').join('\n'),
    COST_DATE: esc(C.date || ''),
    COST_ABOUT: esc(C.about || ''),
    COST_TABLE: costTable,
    LOCATION: esc(L.src || ''),
    LAT: String(lat),
    SUN_DEC: String(Math.round(90 - lat - 23.44)), SUN_JUN: String(Math.round(Math.min(90, 90 - lat + 23.44))),
    KNOWN: known.length ? known.map(esc).join(', ') : 'none'
  };
  return T;
}
const fill = (f, s, T) => { for (let i = 0; i < 2; i++) s = s.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => k in T ? T[k] : m);
  const left = s.match(/\{\{[^}]*\}\}/); if (left) fail(f + ' has ' + left[0] + ', which build.cjs does not fill'); return s; };

function build() {
  let d; try { d = data(); } catch (e) { fail(e.message); }
  const B = d.brief, S = B.site || {};
  const bad = [];
  if (!Array.isArray(S.lot) || S.lot.length < 3) bad.push('site.lot (3 or more [x, y] points)');
  if (typeof S.lat !== 'number') bad.push('site.lat (a number)');
  if (!Array.isArray(B.criteria) || !Array.isArray(B.weights) || B.criteria.length !== B.weights.length) bad.push('criteria and weights (same length)');
  if (bad.length) fail('brief.json needs ' + bad.join(', '));
  const P = require('./project.js'), reg = registry(), acc = accepted();
  fresh(acc.map(optPath));
  for (const k of acc) if (!has(optPath(k))) fail(optPath(k) + ' is in accepted.txt but missing');
  const T = words(B, d.costs, P, reg, d.results);
  const page = { card: P.card || {}, registry: reg, diagrams: has('diagrams.js') };
  const html = '<!doctype html>\n<html lang="en">\n<head>\n' + fill('head.html', read('head.html'), T)
    + '<style>\n' + css() + '</style>\n</head>\n<body>\n'
    + fill('body.html', read('body.html'), T)
    + '<script>\n(function(){\n\'use strict\';\n' + globals(d, page) + read('lib.js')
    + acc.map(k => read(optPath(k))).join('\n')
    + read('sheet.js') + read('catalog.js')
    + '})();\n</script>\n'
    + (has('diagrams.js') ? '<script src="diagrams.js"></script>\n' : '')
    + '</body>\n</html>\n';
  fs.writeFileSync(path.join(dir, P.out), html);
  console.log(`${P.out}: ${Buffer.byteLength(html)} bytes; options in: ${acc.length} of ${reg.length || '?'}; ${d.results ? 'ranked from results.json' : 'not graded yet'}${has('diagrams.js') ? '; diagrams.js linked' : ''}`);
}

module.exports = { fresh, data, css, globals, optPath, registry, accepted, esc };
if (require.main === module) build();
