# brief.json and the new option fields (shared contract)

Intake writes `brief.json` in the catalog folder. Every script and the page read it. Units are feet, degrees and dollars.

```json
{
  "title": "Hilltop house",
  "who": "the owner",
  "site": {
    "lot": [[0,0],[120,0],[120,260],[0,260]],
    "setbacks": [25, 15, 30, 15],
    "lat": 44.3,
    "region": "VT",
    "climate": "cold winters, snow load; humid summers",
    "slope": {"down": 180, "pct": 6},
    "views": [{"dir": 200, "note": "long view south-west"}],
    "arrival": {"edge": 0, "at": 0.5},
    "known": ["lot", "setbacks", "arrival"]
  },
  "budget": {"total": 650000, "covers": "house only, no land"},
  "program": {
    "rooms": [{"name": "Primary bedroom", "minSf": 180}, {"name": "Bedroom", "minSf": 120, "count": 2}],
    "areaRange": [1800, 2400],
    "storeys": 2,
    "foundation": "any"
  },
  "wishes": [
    {"id": "w1", "text": "A nice kitchen that faces natural light in the mornings",
     "checks": [{"type": "glassFacing", "room": "Kitchen", "dir": 90, "within": 35, "minFt": 8}]},
    {"id": "w2", "text": "It should feel calm", "checks": null}
  ],
  "criteria": ["wishes", "sun", "cost", "life", "idea"],
  "weights": [30, 25, 20, 15, 10],
  "style": ["simple gables", "wood", "big windows"],
  "lite": false,
  "node": "node"
}
```

- `site.lot`: the lot polygon, straight edges, in true-north coordinates: x east, y north, ft. Edge i runs from point i to point i+1.
- `site.setbacks`: one value per lot edge, same order. The buildable area is the lot inset by these.
- Directions (`dir`, `down`, `view.dir`) are compass bearings: 0 north, 90 east, 180 south, 270 west.
- `site.arrival`: the edge the drive comes from and where along it (0 to 1).
- `site.known`: which site facts the person gave. Nothing outside it may be stated as fact.
- `program.foundation`: `slab`, `crawl`, `piers` or `any`.
- `wishes[].checks`: measurable predicates (vocabulary in DATA.md, owned by `wishes.cjs`), or null when a wish can only be judged; null wishes are shown as "judged by graders", never as a pass.
- `criteria`: the person's order, most important first. `weights` match it.
- `lite`: true on a Pro plan: one grader per criterion, Sonnet graders.
- `node`: the command that runs node: `node` on a normal Mac, `orb run node` where native binaries are blocked.

## New fields on each option (`OPT.oNN`)

- `site: {rotation, at}`: the house sits on the lot turned `rotation` degrees counter-clockwise from true north-up (0 = house plan north is true north), with the house origin (plan 0,0) at lot point `at` [x, y].
- `foundation`: `slab`, `crawl` or `piers`.
- `steps`: 3 to 5 frames for the step-sequence diagram, each `{says: 'Turn the kitchen to the morning sun', mass: [...]}` where `mass` uses the same box format as `mass` on the option.
- `key`: the one volume or outdoor room the diagrams colour red: an index into `mass`, or a rect.

## Added by playbook: grades and `results.json`

Graders write one file each, `grades/<criterion>-<seat>.json` (seat 1 or 2; light runs have seat 1 only). The controller merges them into `results.json` in the run folder (the merge code is in controller.md, step 9). The page reads `results.json`; before grading it does not exist, and the page shows the options unranked.

A grade file:

```json
{
  "criterion": "sun",
  "seat": 1,
  "model": "opus",
  "scores": {
    "o01": {"score": 72, "reason": "One plain sentence naming what the grader saw.", "evidence": ["shots/o01-sect.png", "glass within 30° of south: 180 sf"]}
  }
}
```

`results.json`:

```json
{
  "version": 1,
  "criteria": ["wishes", "sun", "cost", "life", "idea"],
  "weights": [30, 25, 20, 15, 10],
  "graders": 2,
  "graded": "2026-10-28T21:40:00.000Z",
  "options": {
    "o01": {
      "criteria": {
        "wishes": {"score": 68, "grades": [
          {"seat": 1, "model": "opus", "score": 65, "reason": "…", "evidence": ["…"]},
          {"seat": 2, "model": "opus", "score": 70, "reason": "…", "evidence": ["…"]}
        ]},
        "sun": {"score": 74, "grades": ["…"]},
        "cost": {"score": 81, "grades": ["…"]},
        "life": {"score": 60, "grades": ["…"]},
        "idea": {"score": 77, "grades": ["…"]}
      },
      "total": 71.8,
      "rank": 2
    }
  }
}
```

- `criteria` and `weights`: copied from `brief.json`, most important first. Weights sum to 100.
- `graders`: grades per criterion per option: 2, or 1 when `lite`.
- `options`: keyed by option key, accepted options only.
- `criteria.<c>.score`: the mean of that criterion's grades, rounded to a whole number, 0 to 100.
- `criteria.<c>.grades`: each grader's score, one-line reason and evidence, for the page to show.
- `total`: the sum of each criterion's score times its weight over 100, to one decimal: 0 to 100.
- `rank`: 1 is the highest total. Ties go to the higher score on the first criterion, then the next.

## Added by diagrams: what `diagrams.js` reads

`diagrams.js` draws the parti, the step sequence and the site plan from these fields only. It adds no new field; it pins down the two above that were loose.

- `mass` (on the option and on each step) is the kit's **face list**, built with the `M` helpers in lib.js (`M.shed`, `M.gable`, `M.roof`, `M.deck`, `M.plinth`, ...), not a list of boxes. A step's `mass` is a face list of the same kind; the last step may be the option's own `mass`.
- `key` takes one of these forms:
  - a rect `[x0, y0, x1, y1]` in plan ft. Every face whose plan centre is in the rect and whose extent is within 4 ft of it belongs to the key (a wall counts for the volume behind it, so a neighbour's wall on the rect's north or east edge does not). If those faces include a wall, the key is a **volume** and its faces turn solid red. If not, it is an **outdoor room**: a translucent red volume is drawn from its floor to the roof over it.
  - a number, or `{idx: [i, j, ...]}`: indexes into the option's `mass`; those faces turn red. A bare array of four numbers is always read as a rect.
  - an object `{r: [x0, y0, x1, y1], name, sf, as, z0, z1, level}`, where every field but `r` is optional. `name` and `sf` set the label (otherwise they come from the one room in the rect, or its area). `as` (`'mass'` or `'room'`) overrides the volume or outdoor-room choice. `z0` and `z1` set the outdoor room's floor and ceiling. `level` names which entry of `levels` holds the room.
- `steps[].key` (optional) uses the same forms for one frame. Without it, a frame shows the option's rect key: a volume when the frame has faces in the rect, an outdoor room once the frame has the room's floor.
- Also read: `rooms`, `vols`, `floors` and `roofs` on the option and in `levels` (labels, areas, the site footprint); `brief.site.lot`, `setbacks`, `lat`, `arrival`, `views` and `known` (a site fact is drawn only when `known` lists it, or when `known` is absent); `PROJECT.grade` when it is defined, or else a ground height that depends on `foundation`.

## Added by kit core: optional option fields and the page globals

- `zones` (optional, on the option or on one of its `levels`): `[['Kitchen', x0, y0, x1, y1], ...]`, plan ft. The wish checks find a room's extent from the walls, partitions and doors around its label; in an open plan, give the extents of the rooms nothing separates.
- `unpriced` (optional): a short phrase for work the cost table cannot see (`'a 40 ft steel beam'`). The page adds "not counting …" to the rough cost.
- Section item `['found', y0, y1]`, and `['found', y0, y1, 'porch']` under a porch or deck: the foundation drawn as `foundation` says. `['ground', y0, y1]` with no height sits at `gradeOf(o)` (slab −0.67 ft, crawl and piers −2.5 ft).
- `M.plinth(x0, y0, x1, y1)` returns ordinary faces, each tagged `found: [x0, y0, x1, y1]`. The kit's `massOf(o)` swaps them for the slab edge, stem wall or piers; a reader of the raw `mass` sees a plain plinth.
- Page globals: `window.OPT`, `window.BRIEF`, `window.RESULTS` (null until graded) and `window.HOKIT` (`massOf`, `levelsOf`, `rotOf`, `trueBearing`, `toLot`, `footprints`, `buildable`, `foundOf`, `gradeOf`, `sunProfile`, `costOf`, `evalWishes`, `roomsOf`). The page sets `window.__drawn` and fires `houseoptions:drawn` on `window` when its own drawings are done.
