// grades/<criterion>-<seat>.json -> results.json (shape: kit/BRIEF.md, "Added by playbook")
const fs = require('fs'), path = require('path'), dir = process.argv[2] || '.';
const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const B = rd('brief.json'), seats = B.lite ? 1 : 2;
const acc = fs.readFileSync(path.join(dir, 'accepted.txt'), 'utf8').split(/\s+/).filter(k => /^o\d\d$/.test(k));
const R = { version: 1, criteria: B.criteria, weights: B.weights, graders: seats, graded: new Date().toISOString(), options: {} };
for (const k of acc) R.options[k] = { criteria: Object.fromEntries(B.criteria.map(c => [c, { score: null, grades: [] }])) };
for (const f of fs.readdirSync(path.join(dir, 'grades')).filter(f => /^[a-z]+-\d\.json$/.test(f))) {
  const g = rd('grades/' + f);
  for (const [k, s] of Object.entries(g.scores)) {
    const c = R.options[k] && R.options[k].criteria[g.criterion];
    if (!c) { console.log(`skip ${f} ${k}: not accepted, or not a criterion`); continue; }
    c.grades.push({ seat: g.seat, model: g.model, score: s.score, reason: s.reason, evidence: s.evidence || [] });
  }
}
let bad = 0;
for (const [k, o] of Object.entries(R.options)) {
  o.total = 0;
  B.criteria.forEach((c, i) => {
    const x = o.criteria[c];
    if (x.grades.length < seats) { bad++; console.log(`MISSING ${k} ${c}: ${x.grades.length} of ${seats} grades`); }
    if (!x.grades.length) return;
    x.score = Math.round(x.grades.reduce((a, g) => a + g.score, 0) / x.grades.length);
    o.total += x.score * B.weights[i] / 100;
  });
  o.total = Math.round(o.total * 10) / 10;
}
if (bad) process.exit(1);
const keys = Object.keys(R.options).sort((a, b) => R.options[b].total - R.options[a].total
  || B.criteria.reduce((d, c) => d || R.options[b].criteria[c].score - R.options[a].criteria[c].score, 0) || (a < b ? -1 : 1));
keys.forEach((k, i) => { R.options[k].rank = i + 1; });
fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(R, null, 1) + '\n');
keys.forEach(k => console.log(`${R.options[k].rank}. ${k} ${R.options[k].total}`));
