// metrics.cjs: the graders' fact sheet. Writes grades/metrics.md, one block per accepted option: storeys, foundation,
// rotation, areas, rough cost against budget, each wish's measured result, and the option's PNGs.
// usage: NODE metrics.cjs   (run from the run folder after every option in accepted.txt is shot)
const fs = require('fs'), path = require('path'), { load } = require('./wishes.cjs');
const dir = __dirname, keys = fs.readFileSync(path.join(dir, 'accepted.txt'), 'utf8').split(/\s+/).filter(k => /^o\d\d$/.test(k));
if (!keys.length) { console.log('metrics.cjs: accepted.txt lists no options'); process.exit(1); }
const K = load(keys), $ = n => '$' + Math.round(n).toLocaleString('en-US'), out = ['# Metrics for the graders', ''];
for (const k of keys) {
  const o = K.OPT[k], q = o.q || {}, c = K.costOf(o), w = K.evalWishes(o);
  const shots = fs.readdirSync(path.join(dir, 'shots')).filter(f => f.startsWith(k + '-') && f.endsWith('.png')).map(f => 'shots/' + f);
  out.push(`## ${k} ${o.name}`, '',
    `- storeys ${o.storeys || 1}, foundation ${K.foundOf(o)}, rotation ${K.rotOf(o)}°`,
    `- conditioned ${q.cond} sf, footprint ${q.footprint} sf, exterior wall ${q.perim} ft, glass ${q.glass} sf, porch ${q.porch || 0} sf`,
    `- rough cost ${$(c.total)} (${$(c.perSf)}/sf), ${c.gap > 0 ? $(c.gap) + ' over' : $(-c.gap) + ' under'} budget${o.unpriced ? '; not counting ' + o.unpriced : ''}`,
    ...w.map(e => `- wish ${e.id} "${e.text}": ${e.result}${e.result === 'judged' ? '' : ' (' + e.says + ')'}`),
    `- drawings: ${shots.join(', ')}`, '');
}
fs.mkdirSync(path.join(dir, 'grades'), { recursive: true });
fs.writeFileSync(path.join(dir, 'grades', 'metrics.md'), out.join('\n'));
console.log(`grades/metrics.md: ${keys.length} option(s)`);
