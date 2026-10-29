// wishes.cjs: each of brief.json's wishes measured against one option's plan data, with the house turned as it sits on the lot.
// usage: NODE wishes.cjs o01 [o02 ...] [--json]
// Each wish is YES (every check passes), NO (a check fails, with the measured value) or JUDGED (no checks, or one that
// cannot be measured: the graders read it). The predicates live in lib.js (WISH, evalWishes); DATA.md documents them.
// Exit 0 whatever the results (a failed wish is the grade's business, not an error); 2 when an option will not load.
// Also exports load(keys), the kit in a sandbox with those options loaded, which check.cjs, cite.cjs and labels.cjs use.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname, read = f => fs.readFileSync(path.join(dir, f), 'utf8');

// the kit (brief, costs, lib.js, the given options, sheet.js) evaluated in a sandbox; returns the kit's names
function load(keys) {
  const B = require('./build.cjs'), d = B.data();
  B.fresh(keys.map(B.optPath));
  const src = [B.globals(d, { registry: B.registry() }), read('lib.js'), ...keys.map(k => read(B.optPath(k))), read('sheet.js'),
    ';globalThis.__x = {OPT, EXT, BRIEF, COSTS, RESULTS, levelsOf, rotOf, trueBearing, bearingTxt, compass, toLot, sunProfile, foundOf, gradeOf, '
    + 'sectItems, massOf, buildable, footprints, outside, polyArea, costOf, evalWishes, roomsOf, findRooms, roomGlass, WISH, sunRay, axonBounds};'].join('\n');
  const box = {};
  vm.runInNewContext(src, box, { filename: keys.join('+') + '.js' });
  return box.__x;
}
// the brief's wishes against one option: [{id, text, result, checks:[{type, pass, says}], says}]
function evaluate(key, K) { K = K || load([key]); const o = K.OPT[key]; if (!o) throw new Error('OPT.' + key + ' is not defined'); return K.evalWishes(o); }

if (require.main === module) {
  const args = process.argv.slice(2), json = args.includes('--json'), keys = args.filter(a => a !== '--json');
  if (!keys.length) { console.log('usage: wishes.cjs <key> [key...] [--json]'); process.exit(1); }
  let K;
  try { K = load(keys); } catch (e) { console.log('ERROR does not evaluate: ' + e.message); process.exit(2); }
  const all = {};
  for (const k of keys) {
    if (!K.OPT[k]) { console.log('ERROR OPT.' + k + ' is not defined'); process.exit(2); }
    const w = all[k] = evaluate(k, K);
    if (json) continue;
    const y = w.filter(e => e.result === 'yes').length, m = w.filter(e => e.result !== 'judged').length;
    console.log(`${k}: ${y} of ${m} measured wish(es) met, ${w.length - m} judged (rotation ${K.rotOf(K.OPT[k])}°)`);
    for (const e of w) {
      console.log(`  ${e.result.toUpperCase().padEnd(6)} ${e.id}  ${e.text}`);
      for (const c of e.checks) console.log(`         ${c.pass === true ? 'pass' : c.pass === false ? 'FAIL' : 'n/a '} ${c.type}: ${c.says}`);
    }
  }
  if (json) console.log(JSON.stringify(all, null, 1));
}
module.exports = { load, evaluate };
