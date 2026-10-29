// test-wishes.cjs: regression tests for the wish predicates in lib.js. usage: NODE test-wishes.cjs (exit 1 on a failure)
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, 'lib.js'), 'utf8');
const box = {};
vm.runInNewContext('var BRIEF = {site:{}, wishes:[]}, COSTS = {}, RESULTS = null, PROJECT = {};\n' + src
  + '\n;globalThis.__x = {findRooms, WISH};', box, {filename: 'lib.js'});
const {findRooms, WISH} = box.__x;
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };

// rooms as roomsOf gives them: name, level, box [x0,y0,x1,y1]
const primary = {name: 'Primary bedroom', level: 0, box: [0, 0, 14, 12]};
const kid = {name: 'Bedroom', level: 0, box: [14.5, 0, 26, 12]};
const R = [primary, kid];

// "Bedroom" names the kids' rooms; it must not also find the primary bedroom
t('findRooms("Bedroom") is the exact-named room only', findRooms(null, 'Bedroom', R).map(r => r.name).join() === 'Bedroom');
t('findRooms("bed") still finds by word start', findRooms(null, 'bed', R).length === 2);
// the primary bedroom shares a wall with a kid's bedroom, so "our bedroom away from the kids' rooms" fails
t('notAdjacent fails when the two rooms share a wall', WISH.notAdjacent(null, {a: 'Primary bedroom', b: 'Bedroom'}, R).pass === false);
t('notAdjacent passes when a room stands between',
  WISH.notAdjacent(null, {a: 'Primary bedroom', b: 'Bedroom'}, [primary, {name: 'Office', level: 0, box: [14.5, 0, 24, 12]},
    {name: 'Bedroom', level: 0, box: [24.5, 0, 36, 12]}]).pass === true);

process.exit(bad ? 1 : 0);
