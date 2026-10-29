# Intake: from the person's words to brief.json

The person tells you about their lot, budget, rooms and wishes in their own words. You turn that into `brief.json` (the contract is in `kit/BRIEF.md`). Every script, agent and grader reads that file, so it must hold only what the person said, plus defaults they agreed to.

Rules:
- Never invent a site fact. A slope, a view, a tree line, a road side or a setback that the person did not give stays out, or goes in as an assumption they agreed to and stays out of `site.known`.
- Ask only for what is missing. Ask in one short batch, in plain words, with the default in the question so "fine" is an answer.
- North and lot size come first. Nothing can be drawn without them.
- Intake has at most two exchanges: the question batch, then one read-back to confirm. Then go on to the controller's next step.

## 1. Read what they gave

Pull every fact out of their message into these fields. Write down which ones are still empty.

| Field | Listen for | If missing |
|---|---|---|
| `site.lot` | lot size, shape, frontage, acreage, a survey or plat image | **ask** (essential) |
| north | which way the road side faces, a compass direction, a map | **ask** (essential) |
| `site.setbacks` | "setback", "must stay 25 ft from the road" | ask; if unknown, offer assumed values |
| `site.lat`, `region`, `climate` | the town, state or country | **ask for the town** (essential) |
| `budget` | a total, and what it covers | **ask** (essential) |
| `program.rooms` | bedrooms, baths, office, mudroom, garage | **ask** (essential: bedrooms and baths at least) |
| `program.areaRange` | "about 2,000 square feet" | derive (step 5) |
| `program.storeys` | "one floor", "no stairs", "two storeys is fine" | default 2 (up to two) |
| `program.foundation` | slab, crawlspace, basement, piers | default `any` |
| `site.arrival` | where the driveway comes in | default: the road edge, middle |
| `site.slope`, `site.views` | "slopes down to the south", "view of the hills to the west" | leave out; never ask leading questions about them |
| `wishes` | anything they want the house to be or do | keep every one, in their words |
| `style` | "simple", "modern farmhouse", "lots of wood" | leave empty |
| `criteria`, `weights` | none yet | **ask** (step 7) |
| `lite` | which Claude plan they use | **ask** (step 8) |

A basement is not one of the kit's foundations. If they ask for one, say the drawings will show a crawlspace and the cost will be low for a basement, and note it.

## 2. Ask for what is missing, in one batch

Number the questions. One line each. No architect words: say "how far the house must stay from each lot line", not "setbacks" alone. Give the person an easy way to answer.

Ask about north and lot size first, in this form:

1. **Which way does the lot face?** Stand at the road and look at the lot. Which direction are you facing? (The iPhone Compass app tells you. Or find the lot in a map app, where north is up.)
2. **How big is the lot?** Width along the road and depth, in feet. Or the acreage and rough shape. A photo of the survey or plat works best.

Then only the other gaps, for example:

3. **How far must the house stay from each lot line?** The plat or the county's zoning rules list these as setbacks. If you don't know yet, I'll use 25 ft front, 10 ft sides and 25 ft back, and the page will say they are assumed.
4. **Which town is it in?** I use it for the sun angles, the climate and rough building costs.
5. **What is the budget, and what does it cover?** For example: the house only, or also the driveway, well and septic.
6. **Which rooms do you need?** Bedrooms, baths, and anything else (office, mudroom, garage, a room for guests).
7. **Which matters most to you?** Put these in order: (a) the house does what I wished for, (b) good sun and suits the climate, (c) cost against my budget, (d) easy daily life: short walks, quiet bedrooms, storage, (e) a strong, clear idea. If you have no preference, I'll use that order.
8. **Which Claude plan do you use: Pro, Max, Team or Enterprise?** On Pro I run a lighter grading pass so you stay inside your usage.

Skip any question their message already answers.

## 3. The lot as a polygon

`site.lot` is in true-north coordinates: x east, y north, in feet. Edge i runs from point i to point i+1. `site.setbacks` has one value per edge, same order. Round to 0.1 ft.

**A rectangle.** Let W be the width along the road, D the depth, and F the bearing the road side faces (looking out from the lot to the road: 0 north, 90 east, 180 south, 270 west). Edge 0 is the road edge, then the right side, the back, the left side (right and left as seen standing at the road, looking into the lot).

```
ux = -cos F,  uy =  sin F      (along the road, to the right)
vx = -sin F,  vy = -cos F      (from the road into the lot)
point(u, v) = [u*ux + v*vx, u*uy + v*vy]
lot = [point(0,0), point(W,0), point(W,D), point(0,D)]
setbacks = [front, right side, back, left side]
```

Example: road on the south side (F = 180), 120 ft wide, 260 ft deep gives `[[0,0],[120,0],[120,260],[0,260]]`.

**Only acreage.** Ask for the frontage, or the rough shape. Do not assume a square without saying so and getting a yes.

**A survey or plat image.** Read it with the Read tool. Find the north arrow, each boundary line's bearing and length, the road, and any setback lines or zoning table. Convert each bearing to a compass bearing: N θ E is θ; S θ E is 180 − θ; S θ W is 180 + θ; N θ W is 360 − θ. Walk the edges from one corner: x += length × sin(bearing), y += length × cos(bearing). The walk must close within about 1 ft. If it does not, or a line is hard to read, ask about that line.

- If the plat's north arrow is magnetic, add the town's magnetic declination (east is plus) so the lot is in true north. Say that you did.
- Easements, well and septic areas, and steep zones are not modelled. If the plat shows one, ask whether to treat it as a larger setback on that edge.

**Repeat it back.** In the read-back, say each edge in plain words and ask the person to confirm. For example: "Edge 1: 120 ft along the road, on the south side; the house stays 25 ft back. Edge 2: 260 ft on the east side; 10 ft back." Wait for a yes before you write `site.known` with `lot` and `setbacks`.

## 4. Latitude, region and climate

- `site.lat`: the town's latitude to 0.1°, from what you know or a web search. Say it in the read-back.
- Southern hemisphere: stop. Tell the person the kit draws northern-hemisphere sun only for now.
- `site.region`: the US state code, for the cost table's location factor (`kit/costs.json`). Outside the US, write the country: the table then uses the US national average, and you tell the person the costs are a US figure.
- `site.climate`: one line on the town's general climate: winters, summers, snow, humidity. This is regional knowledge, not a site fact. Say "general climate for <town>" in the read-back.

## 5. Program

`program.rooms`: one entry per kind of room, `{"name", "minSf", "count"}`. Use plain names, one word where possible: Kitchen, Living, Dining, Bedroom, Primary bedroom, Bath, Powder, Laundry, Office, Mudroom, Entry, Porch. Wish checks and `wishes.cjs` find rooms by these exact names, and the drawing agents label rooms with them.

Add the rooms every house has (Kitchen, Living, Dining, Bath, Laundry, Entry) even if the person did not list them. If they gave no sizes, use these minimums and list them in the read-back:

| Room | min sf | Room | min sf |
|---|---|---|---|
| Primary bedroom | 180 | Kitchen | 150 |
| Bedroom | 120 | Living | 220 |
| Bath (full) | 45 | Dining | 120 |
| Powder | 20 | Laundry | 40 |
| Office | 100 | Mudroom | 50 |

`program.areaRange`: the person's figure ±10% if they gave one. Otherwise the low end is the room minimums times 1.4 (halls, walls, stairs), and the high end is the low end times 1.3. Then check the budget. The `kit/costs.json` rates come to about $230 to $250 per sf for a plain one-storey house of about 2,000 sf at the national average, site allowance, markup and contingency included (work it out again if the rates change; smaller houses cost more per sf). Multiply by the region's location factor in `costs.json`, and divide the budget by it. If that area is below the low end, tell the person plainly that the rooms may not fit the budget, and that the options will show by how much.

## 6. Wishes into checks

Keep every wish in the person's own words as `text`. Give it an id: w1, w2, and so on. Then turn it into checks that `wishes.cjs` can measure from the plan data, or `null`.

- A check must capture the wish truly. Never stretch a check to cover a feeling. "It should feel calm" is `null`: graders judge it.
- A wish can have a measurable part and a judged part. "A bright kitchen that opens to the porch" gets two checks (glass facing the sun; Kitchen next to Porch), and the page still shows the wish as measured.
- Directions in the person's words become bearings: morning sun is east (90), evening sun is west (270), winter sun is south (180), steady daylight is north (0). Use `within` 30 to 45.
- A check that needs a site fact (a view, a slope) is allowed only when that fact is in `site.known`. Otherwise the wish is `null`, and the read-back says why.

**Vocabulary.** `kit/DATA.md` is the source of truth for check names and fields; this table matches it.

| Check | Means | Example |
|---|---|---|
| `glassFacing` | a room has glass facing a bearing | `{"type":"glassFacing","room":"Kitchen","dir":90,"within":35,"minFt":8}` |
| `roomMinSf` | a room is at least this big | `{"type":"roomMinSf","room":"Living","sf":300}` |
| `roomOnFloor` | a room is on a given floor (`ground` or `upper`) | `{"type":"roomOnFloor","room":"Primary bedroom","floor":"ground"}` |
| `adjacent` | two rooms share a wall or an opening | `{"type":"adjacent","a":"Kitchen","b":"Porch"}` |
| `notAdjacent` | two rooms share no wall | `{"type":"notAdjacent","a":"Primary bedroom","b":"Living"}` |
| `separatedBy` | at least `min` rooms lie between two rooms (different floors pass) | `{"type":"separatedBy","a":"Primary bedroom","b":"Bedroom","min":1}` |
| `viewFrom` | a room has glass toward a known view | `{"type":"viewFrom","room":"Living","view":0}` |
| `countOf` | at least this many of a room (`bedroom`, `bath` or a room name) | `{"type":"countOf","what":"bath","min":2}` |
| `porchFacing` | a porch or deck faces a bearing | `{"type":"porchFacing","dir":180,"within":45,"minSf":150}` |
| `storeys` | the number of floors (`is`, `min` or `max`) | `{"type":"storeys","max":1}` |

More examples:

- "Everything on one floor as we get older" → `storeys` max 1, or `roomOnFloor` Primary bedroom on floor `ground` with a Bath on floor `ground`, if they allowed two storeys.
- "The kids' rooms away from ours" → `notAdjacent` Primary bedroom and Bedroom.
- "A big porch for summer evenings" → `porchFacing` with `dir` 270 (evening) and a size.
- "Lots of storage" → `null`. Graders judge it from the plans.

## 7. Criteria and weights

`criteria` uses these keys, most important first: `wishes`, `sun`, `cost`, `life`, `idea`. `weights` are always `[30, 25, 20, 15, 10]` in that order. If the person did not choose, use `["wishes", "sun", "cost", "life", "idea"]` and say so.

## 8. Claude plan

`lite: true` on Pro: one grader per criterion, on Sonnet. Max, Team or Enterprise: `lite: false`, two graders per criterion. If they do not know, use `lite: true`.

## 9. node

`"node": "node"` unless `kit/setup.sh` found node blocked and the person gave a command that works. Then use that command.

## 10. Read back once, then write

Show a short summary, about 12 lines, in plain words:
- the lot, edge by edge, with each setback (assumed ones marked "assumed");
- which way north is, the town and its latitude, and the general climate;
- the budget and what it covers, with any warning from step 5;
- the rooms with their minimum sizes;
- each wish, and whether it will be measured or judged by graders;
- the criteria order, and the plan (full or light grading).

Ask "Is this right?" Fix what they correct. Then write `brief.json` in the run folder.

- `site.known` lists only what the person confirmed: `lot`, `setbacks`, `arrival`, `slope`, `views`, as given. Assumed setbacks are in `setbacks` but not in `known`.
- `title`: the person's name for the house, or "New house".
- `who`: how the page names the household: the person's name if they gave one, otherwise "the owner".
- `style`: their words, as given.
