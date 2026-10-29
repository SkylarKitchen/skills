// Trace each "borrowed from" citation of one option to the research notes, so every claim can be read against its source.
// usage: NODE cite.cjs o13        (NODE is brief.json `node`)
// For each precedent it prints the source lines that name the building, best match first: ranked by how well a line
// names it, then by how many of the claim's own words it shares, so a line that supports the claim is not left past the
// best 4 behind lines that only name the building. A claim may say only what its source says. The brief's precedent
// set is what these notes name (project.js cite.sources) plus the regional house types it names without a note
// (project.js cite.regional, a RegExp the controller fills after the precedent research); anything else is outside the set and makes this exit 1
// (in the first catalog, options 21, 22, 27 and 29 each cited one: textile mills, the Ward Willits House, the medieval
// hall house, the Farnsworth House).
const fs = require('fs'), path = require('path');
const key = process.argv[2];
if (!key) { console.log('usage: cite.cjs <key>'); process.exit(1); }
const dir = __dirname, read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const P = require('./project.js');
let o;
try { o = require('./wishes.cjs').load([key]).OPT[key]; } catch (e) { console.log('ERROR does not evaluate: ' + e.message); process.exit(2); }
if (!o) { console.log('OPT.' + key + ' is not defined'); process.exit(2); }
// each source a folder (its .md files) or a file, relative to this folder unless absolute
const files = P.cite.sources.map(s => path.resolve(dir, s)).flatMap(s => { try { return fs.statSync(s).isDirectory()
  ? fs.readdirSync(s).filter(f => f.endsWith('.md')).map(f => path.join(s, f)) : [s]; } catch (e) { console.log('no source at ' + s); return []; } });
const lines = files.flatMap(f => { try { return fs.readFileSync(f, 'utf8').split('\n').map((t, i) => ({ f: path.basename(f), n: i + 1, t, tl: t.toLowerCase() })); } catch (e) { return []; } });
const STOP = new Set(['little', 'black', 'short', 'house', 'small', 'great', 'north', 'south', 'cabin', 'retreat', 'the']);
const REGIONAL = P.cite.regional ? (P.cite.regional instanceof RegExp ? P.cite.regional : new RegExp(String(P.cite.regional), 'i')) : null;
// words too common to tell one source line from another
const CSTOP = new Set(('about above after again against along also among been before being below between both does down during each '
  + 'either every from further have having here into itself just less like more most much must neither only onto other over same '
  + 'should some such than that their them then there these they this those through under until upon very were what when where '
  + 'which while whose will with within without would your').split(' '));
let missing = 0, outside = 0;
for (const [name, claim] of o.borrowed || []) {
  const base = name.replace(/\s*\(.*$/, '').trim(), words = base.split(/\s+/);
  // every shorter form of the name too ("Marie Short House" is "Marie Short" in the brief); lines from all forms are ranked together
  const keys = [base, words.slice(0, 2).join(' ')];
  if (words[0].length >= 5 && /^[A-Z]/.test(words[0]) && !STOP.has(words[0].toLowerCase())) keys.push(words[0]);
  keys.splice(0, keys.length, ...keys.filter((k, i, a) => a.indexOf(k) === i));
  const score = (name.toLowerCase().match(/[a-z0-9|]{4,}/g) || []);
  // the claim's words about the precedent (before "here", which starts this house's part; SPEC), 4+ letters, less stop
  // words and the name's own, each matched at a word's start with a plural s dropped ("bedrooms" finds "bedroom")
  const claimW = [...new Set((String(claim || '').split(/\bhere\b/)[0].toLowerCase().match(/[a-z]{4,}/g) || [])
    .filter(w => !CSTOP.has(w) && !score.includes(w)).map(w => w.length > 4 ? w.replace(/s$/, '') : w))].map(w => new RegExp('\\b' + w));
  const hits = lines.filter(l => keys.some(k => l.tl.includes(k.toLowerCase())));
  const used = keys.filter(k => hits.some(h => h.tl.includes(k.toLowerCase())));
  console.log(`\n${name}\n  claim: ${claim}`);
  if (!hits.length) {
    missing++;
    if (REGIONAL && REGIONAL.test(name)) console.log('  NOT IN THE SOURCES, one of the brief\'s regional house types: accept only a well-established, widely published fact');
    else { outside++; console.log('  OUTSIDE THE PRECEDENT SET: cite only from the brief\'s set (SPEC); remove it'); }
    continue;
  }
  // a line naming the building by a two-word form outranks one that only shares its words: the one-word key alone
  // ("Front" of Front Range) also matches "frontage" and buried the real line
  hits.forEach(h => { h.s = score.filter(w => h.tl.includes(w)).length + (h.tl.includes(base.toLowerCase()) ? 1 : 0)
    + (keys.some(k => k.includes(' ') && h.tl.includes(k.toLowerCase())) ? 3 : 0);
    h.c = claimW.filter(re => re.test(h.tl)).length; });
  // the name match first; among lines that name the building equally well, the one sharing most of the claim's words
  hits.sort((a, b) => b.s - a.s || b.c - a.c);
  console.log(`  found as "${used.join('", "')}" in ${hits.length} line(s)${hits.length > 4 ? ', best 4' : ''}:`);
  for (const h of hits.slice(0, 4)) console.log(`  ${h.f}:${h.n}  ${h.t.trim().slice(0, 420)}`);
}
console.log(`\n${key}: ${(o.borrowed || []).length} precedent(s), ${missing} not in the sources${outside ? `, ${outside} OUTSIDE THE SET` : ''}`);
if (outside) process.exitCode = 1;
