# Brief: draw one option for {{TITLE}}

You are drawing one plan option for {{WHO}}'s house. The run holds {{N}} plan types for one brief, each drawn to the same scale and standard as the worked examples. The person who reads the page is not an architect. Read this whole file, then `DATA.md`, `brief.json`, your entry in `REGISTRY.md` and the worked examples, before writing anything.

`CAT` below means `{{CAT}}`. `NODE` means `{{NODE}}`: run node only this way.

## Work in small steps

Every reply you write, reasoning included, must stay well under the 64,000-token output limit. Drawing agents that tried to work out the whole house in one reply passed the limit and were cut off before writing a line. Reading costs nothing against the limit; long reasoning does.

- Reason for about a page at most, then call a tool. Let the file, the checker and the PNGs carry the geometry, not your head.
- Build `opts/oNN.js` in parts, and run `check.cjs` after each part:
  1. Write the ground-floor plan (`view`, `vols`, `open`, `parts`, `ward`, `idoors`, `floors`, `stairs`, `fx`, `rooms`, `dims`, `na`, `sb`, `roofs`, `monitor`), `site` and `foundation`, with stub text fields, `sect:{view:{y0:-5,y1:40,z0:-4,z1:20},items:[]}`, `mass:[]`, `steps:[]` and a stub `q` holding every key. Then shoot and look at the plan and the site plan.
  2. With Edit, add the upper floor in `levels`, if there is one.
  3. With Edit, add the section.
  4. With Edit, add the axon (`mass`) and `key`, then shoot and look at everything.
  5. With Edit, add `steps`, then the text fields and `q` with its arithmetic comment, then do the final rounds of check and shoot.
- Never put the whole file in one tool call, and never draft the file in prose before writing it.
- A shape that is hard to hold in mind (a pinwheel, a cross, a ring, rooms that slide past each other) is never solved in reasoning. Write a crude seed of plain rectangles in the first reply after reading, then shoot it and fix it one Edit at a time. One agent read everything, tried to work out a pinwheel's rotation in its head, and was cut off before writing a line.

## Files

- Write **only** `CAT/opts/oNN.js` (NN is your number, two digits), defining `OPT.oNN`. Do not edit any other file. If the kit lacks something you need, define a local helper inside your own block and say so in your report.
- Worked examples, read them all: `examples/F.js` (one volume, monitor, porch; the most complete), `examples/D.js` (two bars, a court, a link), `examples/E.js` (several volumes, screens, a porch that links them), `examples/B.js` (a pair of volumes, a screened bay). Copy their data shape, never their rooms or text.
- `DATA.md`: the fields for the site, the foundation, the diagrams (`steps`, `key`), the wish checks and `q`. Where this file and DATA.md differ, DATA.md wins.
- `brief.json`: the lot, setbacks, latitude, rooms, budget and wishes.
- The kit: `lib.js` (plan, section, axon and site drawing, `M` massing helpers, `sunRay`), `sheet.js` (how the text fields are shown), `diagrams.js` (the parti and step diagrams).
- Precedent notes: `sources/`. Cite precedents only with facts from these notes; never invent details about a real building. Cite only from this set: {{PRECEDENT_SET}}. A building from outside that set is not a precedent here, however well it fits. cite.cjs enforces this.

## The brief (fixed)

{{BRIEF}}

The wishes are listed so you can design for them. Never write that a wish is met: `wishes.cjs` measures that from your data, and the page shows the result.

## Site rules (fixed)

{{SITE_RULES}}
- Never state a site feature as fact unless `brief.json` `site.known` lists it. Say what the plan would give where a site has one ("a floor 10 ft up sees over anything low along the edge"). Drawing agents have invented brush, trees and views; check.cjs warns on vegetation and water words in the house's own text.
- The house must sit inside the setback line. check.cjs fails any footprint, porch or deck that leaves it.

## The standard

- **One clear idea**: your entry's headline move, legible at a glance in the plan, the axon and the diagrams. It must not turn into any other entry.
- **Real rooms at real sizes**: queen bed 5 × 6.667, twin 3.25 × 6.5, sofa 3 × 7, dining table 3.2 deep, counters 2.083 deep, fridge 2.5 to 2.7 square, WC 2.333 × 2.5, tub 5 × 2.5, shower 3 × 3 to 3 × 5, 2 ft wardrobes in each bedroom. Doors swing clear of fixtures; every room is reachable; the bath is reachable without passing through a bedroom; a stove's flue has a clear path up. Each room is at least the minimum size in `brief.json`, and is labelled with the exact room name used there.
- **Clean sheet**: labels never sit on each other, a wall or a fixture. Dimensions along the main runs (overall length and depth at least), the north arrow (`na`) and the scale bar (`sb`), all inside `view`.
- **Two storeys**: the stair is drawn on both floors in the same place, the upper floor has its own plan in `levels`, and the section cuts through the stair or the stairwell.
- **Section** cut along the house's own north–south axis, looking east, through the main living space and through the idea (the court, the loft, the lantern). Floor slabs, walls 0.667 thick, glass, roofs 0.8 ft thick, the ground and the foundation as DATA.md gives them for your `foundation`. Both solstice rays come from `sunRay` through a real edge point (an eave tip, the head of a glass band), at the angles the kit gives for your rotation (DATA.md names the helper). Never type a sun angle by hand. The caption says only what the rays show.
- **Axon** from the house's own south-west corner, consistent with the plan and the section heights.
- **Text**: plain, concrete sentences a person who is not an architect follows. Explain a building term the first time in a few words ("a clerestory, a band of high windows"). No em-dash asides, no "not X but Y", no colon-then-reveal, no stock phrases ("worth noting", "honest caveat"). Numbers where they help. No cost figures: the page shows the checker's rough cost.

## Data format

Copy the shape of `examples/F.js`. The fields DATA.md owns (`site`, `foundation`, `steps`, `key`, and the keys of `q`) are described there. The rest:

```js
{
  const zAt = y => ...;                    // local helpers for roof heights are fine
  OPT.o07 = {
    no:'07', name:'The ell', storeys:1,    // storeys: 1, 1.5 or 2
    bed:'indoors',                         // the way to bed: 'indoors', 'upstairs', 'across the porch', ...
    sub:`One or two plain sentences on the plan.`,
    plan:[`How you arrive, how the rooms sit, the section idea and the sun.`, `Optional second paragraph.`],
    borrowed:[['Precedent name (architect)','what this plan takes from it'], ...],   // 3 to 5
    pros:['specific to this plan and this household'], cons:['a real cost or limit of this plan'],   // 3 each
    sectCap:`Section looking east through ... At noon on 21 December ...; in June ...`,
    site:{rotation, at}, foundation:'slab', key, steps:[...],   // DATA.md
    view:{x0,y0,x1,y1},                    // plan extent in feet, room for dims, arrow and scale bar
    floors, stairs, vols, cuts, ward, parts, open, idoors, screens, posts, fx, roofs, monitor, rooms, notes, dims, na, sb,
    levels:[{ label:'Upper floor', vols, parts, ward, open, idoors, fx, floors, stairs, rooms, notes, dims, roofs, posts }],  // storeys > 1 only
    sect:{view:{y0,y1,z0,z1}, items:[...]},
    mass:[...],
    q:{...}                                // DATA.md lists the keys
  };
}
```

**Pros and cons.** Each pro is a specific gain for this household that the drawing shows: a route, a room's light, a quiet bedroom, a simple roof. Each con is a real cost or limit: extra wall, a stair, an unheated crossing, length, a room that gets no winter sun. Do not compare with other options (the page does that), quote costs, or claim a wish.

**Plan keys** (feet, in the house's own axes: x toward plan east, y toward plan south; `site.rotation` turns the whole house on the lot, and the north arrow turns with it):
- `vols` [[x0,y0,x1,y1]]: conditioned rooms; exterior walls (0.667) are drawn inside each rect. Where two vols share a wall, cover the double wall with a `cuts` rect in the opening or draw one vol and use `parts`.
- `open` [{v, w:'N'|'S'|'E'|'W', a, b, k, h, s}]: openings in vol v's wall from a to b (x along N/S walls, y along E/W walls). k: 'glass' fixed full height, 'win' window, 'hi' high window, 'door' (h:'a'|'b' hinge end, s:'out' to swing out), 'slide', 'screen', 'pocket', 'open'.
- `parts` [[x0,y0,x1,y1]] partitions 0.333 thick; `ward` wardrobes; `idoors` [{r, d:1|-1, h, k}] interior doors (k:'open' for a cased opening, 'pocket').
- `floors` [{r, k:'deck'|'porch'|'court'|'yard'|'bare'|'void', dir}]: 'void' marks open-to-below on an upper floor. 'bare' is blank paper (a roof seen from above), never framed floor.
- A gallery or loft floor open to a room below is an upper-level vol like any other, with a `cuts` rect over each side that has no wall (the rail side, and a side against a neighbouring vol's wall); then it counts in `floorArea` and the checker sees it. A gallery drawn as a 'bare' floor drops out of floorArea and the totals stop matching the vols.
- `stairs` [{r, dir:'N'|'S'|'E'|'W', n, label:'UP'|'DN'}]: steps down to grade default to 'DN'; an interior stair is 'UP' on the ground floor and 'DN' on the upper floor, about 3 × 11 ft with n 13. Interior stairs meet code: treads (the run over n) of at least 10 in, risers of at most 7¾ in, 36 in wide. A floor 9 ft up takes 14 risers and 13 treads, about 10'-10" of run, straight or turned at a landing. check.cjs warns on short treads and narrow flights; a flight cut short on one floor's plan is checked where it is drawn in full.
- `fx` [[kind, x, y, w, d, orient]]: counter, sink, range, fridge, tall, dw, wd, shower, tub, basin, wc (orient = tank wall), bed (orient = head wall), sofa (orient = back side), chair, table ('v' = long side north–south), hearth, stove, desk, bench, shelf, wood, tank, chain.
- `screens` [[x0,y0,x1,y1]] lines; `posts` [[x,y]]; `roofs` and `monitor`: flat [x,y,x,y,...] outlines drawn dashed.
- `rooms` [[name ('|' breaks a line), x, y, area or 0, halo]]: halo 'paper' for outdoor rooms. `notes` [[text, x, y, {rot, align, size}]]. `dims` [[ax,ay,bx,by,offset]]. `na` [x,y] north arrow, `sb` [x,y] scale bar. Place every label where it reads best on the desktop sheet. `lib.js` keeps it there unless it runs into another label or off the paper, and moves labels only as the drawing shrinks on smaller screens. On a phone no note or room name may cross a wall: a note that cannot fit its room is dropped, and a room whose name cannot fit gets a number listed under the plan. So keep notes short: a six-word note is dropped on phones.

**Section items** (y runs plan north on the left to plan south on the right, z up): `['fill', pts]` interior tint (first), `['ground', y0, y1, z]`, `['cut', pts]` solid (use `box(y0,z0,y1,z1)`), `['glass', y, z0, z1]`, `['beyond', pts, close, dash]`, `sunRay(yp, zp, deg, zEnd, back, label, dashed)`, `['label', text, y, z, {col:'pencil', align, size}]`. The site is at {{LAT}}° N. The December ray carries the label '21 Dec, <angle>°' and the June ray, dashed, '21 Jun, <angle>°', with the angles the kit gives for your rotation.

**Axon** (`mass`): from the house's south-west corner only its south and west faces show. Use `M.plinth`, `M.deck(x0,y0,x1,y1,screen,z)`, `M.shed` (roof sloping north–south), `M.shedX` (sloping east–west), `M.gable` (ridge east–west), `M.gableY` (ridge north–south, south gable end), `M.hip(x0,y0,x1,y1,ze,zr)`, `M.roof`, `M.wall(pts,'wallS'|'wallW',glass)`, `M.plane(pts,k,L)`, `M.posts(pts,zOf,z0)`, and the foundation helper DATA.md names. Glass on a face is a list of [a, b, z0, z1] along it. Where a court or notch exposes a south-facing wall of a northern volume or a west-facing wall of an eastern one, add that face yourself. Layers draw in ascending order (0 decks, 1 walls and posts, 2 roofs), far to near within a layer; when a taller volume stands in front of a lower roof, lift its faces with `M.layer(faces, 3)` and its roof with `M.layer(roofFaces, 4)`. Check the PNG for faces painted in the wrong order.

**Diagrams** (`key`, `steps`): `key` is the one volume or outdoor room the diagrams colour red: the headline move. `steps` are 3 to 5 frames that build the form: start from a plain box at the brief's size, then one change per frame, each caused by this person's lot, sun or wishes, ending at your final massing. Each frame's `says` is one short plain sentence in the person's terms ("Turn the kitchen to the morning sun"). Never name a site fact outside `site.known`.

## Quantities (`q`)

Show your arithmetic in a comment above `q`. DATA.md lists the keys the cost model prices. These are measured as follows:

- `platform`: sf of floor built at floor level over the foundation: the conditioned footprint plus decks, porches and screened rooms at floor level (not courts or patios at grade).
- `footprint`: gross ground-floor conditioned footprint. `floorArea`: gross framed floor, all storeys (the sum of every vol's w × d).
- `roofPlan`: roof in plan, overhangs and porch roofs included.
- `perim`: ft of exterior wall, each wall counted once: the ground floor's, plus every upper-floor outside wall that does not stand on a ground-floor exterior wall, whether it overhangs the footprint or rises from a lower roof. Say so in the comment. The checker measures this and warns beyond 12%. A wall above a lower roof is exterior wall even with no floor behind it: a clerestory wall where one roof meets a taller wall, a sawtooth riser, a lantern, a tall room through a lower roof. The checker cannot see these unless the tall part declares its outline as `rise:[[x0,y0,x1,y1], ...]`, one rect per tall part. Each rect is measured on its own, so a roof that steps up twice gives each step the rect from its riser to the high end.
- `wallArea`: sf of opaque exterior wall, all storeys: the sum of wall length × average height from the floor to the roof at that wall, minus glass.
- `glass`: sf of all glazing (glass walls, clerestories, glazed doors, windows: width × height).
- `porch`, `porchRoofed`: decks, porches and screened rooms at floor level, and the roofed part.
- `cond`: conditioned sf inside the exterior walls, all storeys, less each stairwell or void in an upper floor, taken off once: the stair counts on the floor it starts from, so an upper floor loses its opening. Say so in the comment; the checker warns when an upper floor has an opening and no comment on cond takes it off.
- `baths`: a full bath is 1, a powder room 0.4. `stairs`: interior stairs.
- `unpriced` (on the option beside `bed`, not in `q`): when the plan needs work the cost table does not price, such as steel beams, a lift or a retaining wall, name it in a short phrase, for example `unpriced:'two 48 ft steel beams and their footings'`. The page then reads "not counting …" after the cost.

## Verify: required, at least two rounds

1. `NODE CAT/check.cjs oNN`. Fix every ERROR. Fix every WARN or give the reason in your report.
2. `NODE CAT/shoot.cjs oNN`, then Read every PNG it lists in `CAT/shots/oNN-*`: the plans, section, axon, site plan, diagrams and page. Look hard: overlaps, doors hitting furniture, labels on walls, rooms that make no sense, faces in the wrong order, roofs that disagree with the section, rays that disagree with the caption, a house outside the setback line, steps that do not end at your massing. Fix, re-check, re-shoot.
3. `NODE CAT/wishes.cjs oNN`. It shows how your plan measures against each wish. Improve the plan where your entry promised a wish. Do not quote its results in your text.
4. Once, when `borrowed` is written: `NODE CAT/cite.cjs oNN`. It prints the research lines that name each precedent. Read every claim against its lines: a claim may say only what its source says, so paraphrase it and never extend it. A precedent found in no source is allowed only if it is one of the regional house types the brief names ({{REGIONAL}}); keep only a well-established, widely published fact about it, and say which in your report. Anything else is marked OUTSIDE THE PRECEDENT SET and cite.cjs exits 1: remove it.

Rules: run node only as `NODE`, never npm or python. Edit text with the Edit tool. If a checker's output misses your last edit, touch the file and run it again. Do not use any browser tool: look at a PNG with the Read tool, and for a closer look render a larger one in your own scratch folder. Do not publish anything, do not touch other files.

## Report (your final message, under 200 words)

The file written and the headline move in one sentence; the rotation and foundation; the `q` values and the rough cost from the checker; the wishes.cjs results in one line; anything unresolved and any warning you left, with the reason.
