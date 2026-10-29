# DATA.md: the run folder, the option data and the measuring tools

Where this file and SPEC.md differ, this file wins. `brief.json` is described in BRIEF.md; this file says how the kit reads it and what an option file holds beyond the worked examples.

## The run folder (CAT)

| File | What it is | Who writes it |
|---|---|---|
| `brief.json` | the house: lot, setbacks, sun, budget, rooms, wishes, criteria, `node` | the controller (BRIEF.md) |
| `costs.json` | dated national-average rates, markups and the location factors | the kit; edit only with a dated source |
| `project.js` | page and tool settings only: `out`, `title`, `text`, `card`, `siteWords`, `cite` | the controller fills `cite.regional` |
| `REGISTRY.md` | the plan types; the page reads it directly (each `**NN Name.**` line and its first sentence), so there is no second copy to keep in step | the controller |
| `opts/oNN.js` | one option, `OPT.oNN = {...}` | a drawing agent |
| `accepted.txt` | the option keys on the page, one per line | the controller |
| `results.json` | the grades (BRIEF.md, "Added by playbook"); the page ranks by it when it exists | merge-grades.cjs |
| `sources/` | the precedent notes cite.cjs searches | the controller |
| `examples/` | worked examples B, D, E and F, and a filled-in `brief.json`; never on the page | the kit |
| `house-options.html` | **the page** (project.js `out`) | build.sh |

The cite setting the controller fills is `project.js` → `cite.regional`: a RegExp of the region's traditional house types that may be cited without a note, for example `/\b(saltbox|cape cod|ranch house)\b/i`, or `null`.

## Running the tools

`NODE` is brief.json `node` (`node`, or for example `orb run node` where native binaries are blocked); `HO_NODE` in the environment overrides it for build.sh and gate.sh. No tool needs a server: the page and each preview open over `file://`. Playwright comes from the run's own `node_modules` (or `NODE_PATH`), else the global install beside that node; setup.sh installs it.

| Command | Does |
|---|---|
| `sh CAT/build.sh` | writes the page from brief.json, costs.json, REGISTRY.md, accepted.txt, opts/ and results.json |
| `NODE CAT/check.cjs oNN` | data, geometry, setback, foundation, stair, sun-ray and text checks; ERROR fails |
| `NODE CAT/wishes.cjs oNN [--json]` | each wish YES, NO (with the measured value) or JUDGED |
| `NODE CAT/shoot.cjs oNN` | `shots/oNN-plan0.png` (and `-plan1` for an upper floor), `-sect`, `-axon`, `-site`, `-diagrams`, `-page` |
| `NODE CAT/cite.cjs oNN` | the source lines behind each `borrowed` precedent |
| `sh CAT/gate.sh` | build, check every accepted option, labels.cjs and fit.cjs at 17 widths |

A worked example's key works with check, wishes and shoot (`check.cjs F`).

## Coordinates

- **Plan** (everything in the option file): ft, x to the house's own east, y to its own south, z up from the finished ground floor (z = 0). Plan, section and axon are drawn in these axes.
- **Lot** (brief.json): ft, x east, y north, true north.
- `site: {rotation, at}`: the house turned `rotation` degrees counter-clockwise from true north-up, its plan origin (0, 0) at lot point `at`. Plan north then faces true bearing `360 − rotation`; `trueBearing(o, b)` turns a plan bearing into a true one, and `toLot(o, x, y)` a plan point into a lot point.
- The plan's north arrow (`na`) is turned for you. The section's ends are named by their true compass points. The axon looks from the house's own south-west corner. The site plan is north-up.
- In text, "south" means true south. check.cjs warns when a house turned more than 30° names north or south.

## Option fields beyond the worked examples

Copy the shape of `examples/F.js`. Open it first: its top lines show `ROT`, `SUN`, `site` and `foundation` in use.

- `site: {rotation, at}`: as above. Place the house so every room, porch and deck is inside the setback line (the lot inset by `site.setbacks`): check.cjs fails anything outside it and warns on steps and roof edges outside it. The site plan shows the line dashed.
- `foundation`: `'slab'`, `'crawl'` or `'piers'`. Follow `program.foundation` unless it is `'any'`.
  - Section: one `['found', y0, y1]` item for each run of floor between exterior wall faces, and `['found', y0, y1, 'porch']` under a porch or deck. The kit draws a slab with thickened edges, a crawlspace with stem walls and footings, or a framed floor on piers. Write `['ground', y0, y1]` with no height: it sits at the foundation's grade (`gradeOf(o)`: slab −0.67 ft, crawl and piers −2.5 ft). Exterior wall cuts start at z = 0.
  - Axon: `...M.plinth(x0, y0, x1, y1)` under each floor rect. It draws the slab edge, the stem wall or the piers, as the foundation is.
- `steps` and `key`: the diagrams' frames and the one move coloured red. Forms and rules: BRIEF.md, "Added by diagrams". The worked examples push their last frame as the option's own `mass`.
- `levels`: upper floors, each `{vols, open, parts, ward, idoors, floors, stairs, fx, rooms, notes, dims, roofs, zones}` on the ground floor's `view` (or its own `view`), with `storeys: 2`. Draw the stair on both floors in the same rect: `label:'UP'` below, `'DN'` above. Count a stairwell in `cond` once, on the floor its stair starts from, and say so in the comment over `q`. Cut the section through the stair or the double-height room so both floors show.
- `zones` (optional, on the option or a level): `[['Kitchen', x0, y0, x1, y1], ...]`. The wish checks find a room's extent from walls, partitions and doors around its label; in an open plan, where nothing separates kitchen, dining and living, give their extents here.
- `unpriced`: work the cost table cannot see, in a short phrase (for example `'a 40 ft steel beam'`). The page then says "not counting …".

## The sun in the section

The section is cut along the plan's north–south axis, plan north on the left. On a turned house the noon sun is not in that plane, so the rays show its profile angle: `tan p = tan(altitude) / cos(rotation)`.

```js
const ROT = 20, SUN = sunProfile(ROT);   // {dec, jun, decLabel, junLabel}
sunRay(yEdge, zEdge, SUN.dec, zEnd, back, SUN.decLabel)          // 21 December, through a real edge point
sunRay(yEdge, zEdge, SUN.jun, zEnd, back, SUN.junLabel, true)    // 21 June, dashed
```

Never type an angle. Above 90° the sun comes from the plan-north side, and `sunRay` draws it from the left. check.cjs warns on a ray at any other angle and fails a ray through a solid cut.

## `q`: the quantities the cost reads

Show the arithmetic in a comment over `q`. Every key is a number.

| Key | Measure | Priced as |
|---|---|---|
| `footprint` | ground-floor vols, gross sf | foundation, by `foundation` |
| `floorArea` | all floors' vols, gross sf | framed floor (less the footprint on a slab) |
| `roofPlan` | roof outlines in plan, overhangs in, sf | roof |
| `perim` | exterior wall length, ft (check.cjs measures it) | (checks only) |
| `wallArea` | net opaque exterior wall, all floors, sf | walls |
| `glass` | glazing, sf | windows and glazed doors |
| `porch`, `porchRoofed` | porch and deck sf, and the roofed part | porch |
| `cond` | conditioned sf, inside the exterior walls | services and finishes |
| `baths` | full baths, a powder room as 0.4 | baths |
| `stairs` | interior stairs | stairs |

`platform` and `heads` may stay from older files; the cost no longer reads them.

## The rough cost

`costOf(o)` = the sum of each rate in `costs.json` times its quantity (plus one kitchen, base plumbing and site work per house), times the location factor for `site.region`, plus the builder's overhead, plus the contingency. It returns the lines, `total`, `perSf`, `budget` and `gap` (total − budget). Every rate carries a dated source line, shown on the page. It is a planning figure, labelled rough everywhere; the option's own text never quotes a cost.

## Wish checks (`brief.json` `wishes[].checks`)

A wish is YES when every check passes, NO when one fails, and JUDGED when it has no checks or a check cannot be measured. Rooms are found by name: every word of `room` must start a word of the room's label (`"bed"` finds "Bedroom"), and `"bedroom"` finds every sleeping room (Bedroom, BR2, Primary, Bunk room, Guest room, Nursery). Directions are true bearings (0 north, 90 east), measured with the house turned on its lot.

| `type` | Fields | Passes when |
|---|---|---|
| `glassFacing` | `room, dir, within` (45), `minFt` (0) | the room's glass in outside walls facing within `within`° of `dir` is at least `minFt` wide |
| `roomMinSf` | `room, sf, all` | one (or, with `all`, every) matching room has at least `sf`: the area written on the plan, else its measured extent |
| `roomOnFloor` | `room, floor` (`'ground'`, `'upper'` or a level index), `all` | a matching room (or every one) is on that floor |
| `adjacent` | `a, b` | two such rooms share a wall or are one open room |
| `notAdjacent` | `a, b` | they share no wall |
| `separatedBy` | `a, b, min` (1) | at least `min` rooms lie between them, counted room to room on one floor; different floors pass |
| `viewFrom` | `room`, then `view` (an index into `site.views`) or `dir`, `within` (45) | the room has glass facing within `within`° of the view |
| `countOf` | `what` (`'bedroom'`, `'bath'` or a room name), `min, max, full` | the count is in range; baths come from `q.baths`, whole baths only with `full` |
| `porchFacing` | `dir, within` (45), `minSf` (0) | a porch or deck on that side of the house, by its bearing from the house's middle, of at least `minSf` |
| `storeys` | `is, min, max` | `storeys` matches |

## What the page reads from `results.json`

For each accepted option: `options.oNN.total` and `rank` for the order and the summary table, and for each criterion `criteria.<c>.score` and every `grades[].reason`. Before results.json exists the page shows the options in number order and reloads itself each minute.

## For diagrams.js and other page scripts

The page sets `window.OPT`, `window.BRIEF` and `window.RESULTS`, puts `<div class="diagrams" data-opt="oNN">` at the top of each sheet, loads `diagrams.js` after the kit when the file exists, and exposes the kit's geometry as `window.HOKIT` (`massOf`, `levelsOf`, `toLot`, `footprints`, `buildable`, `sunProfile`, `costOf`, `evalWishes` and others).
