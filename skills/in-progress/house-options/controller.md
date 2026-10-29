# Controller playbook

You run the whole job. You talk to the person, write the brief, the registry and the dispatches, read every result, and accept or return it. Drawing agents draw. Graders grade. The person sees one page at the end.

Names used below:
- `SKILL`: this skill's folder.
- `CAT`: the run folder for this house.
- `NODE`: the command in `brief.json` `node` (`node` on a normal Mac). `NPX` is the same command with `npx` in place of `node`.

Tell the person once, early: after they approve the plan types, the run takes about 1 to 2 hours, and they can watch the page fill in.

## 1. Setup check

The run folder lives in `~/house-options/<slug>/`, where slug is the house's title in lowercase-kebab. Use another place only if the person names one. Never a temp folder: macOS clears it.

Run `sh SKILL/kit/setup.sh ~/house-options`. It checks node 18 or later, Playwright and its Chromium.

- **Exit 0:** go on.
- **Exit 1, something missing:** ask before installing, in the same message as the intake questions. Say what it is in one line: "To draw the plans I need Playwright, a tool that runs a private copy of the Chromium browser. It is a download of a few hundred MB: Playwright goes into ~/house-options and its browser into Playwright's own cache folder. Nothing else on the Mac changes. May I install it?" With a yes, run `sh SKILL/kit/setup.sh --install ~/house-options`, then run the check again.
- **Node itself missing:** setup.sh prints the steps. The person installs Node from nodejs.org with the normal Mac installer. You cannot click through it for them. Wait, then run the check again.
- **Exit 2, node blocked:** some managed Macs stop unsigned programs. Explain that plainly. Ask whether they have another way to run node (a VM, or an allowed copy). Run `sh SKILL/kit/setup.sh --node "<that command>" ~/house-options`, and put the command in `brief.json` `node`.

## 2. Intake

Follow `intake.md`. At most two exchanges: one batch of questions, then one read-back. Then:

1. `sh SKILL/kit/new-catalog.sh CAT`. It copies the kit into the new folder.
2. Write `CAT/brief.json`. If new-catalog.sh did not copy `DATA.md`, copy it from `SKILL/kit`: the agents read it in CAT.
3. If new-catalog.sh lists fields still to fill (for example in `project.js`), fill them from `brief.json`. `kit/DATA.md` says which fields the kit reads.

## 3. Precedent research

Pick 6 to 10 real buildings that suit the region's climate and the person's style words. Between them they should show several plan types: bars, courts, pairs of volumes, compact two-storey houses. Prefer published houses with plans online (the architect's site, a monograph, a known magazine).

Write the notes in `CAT/sources/precedents.md`. cite.cjs finds lines by the building's name, so:
- One heading per building: `## Name (architect, place, year)`.
- Every line starts with the building's short name: "Example House: two bars joined by a glass link; bedrooms in the north bar."
- Every fact comes from a source you read. One `Name: source <url>` line per building.
- Nothing from memory that you could not confirm. If web search is not available, use only famous houses and widely published facts, and say so at the top of the notes.

Also list the region's traditional house types that agents may cite without a note (for example a saltbox, a ranch, a Cape Cod). They go in the kit's cite setting (`regional`; DATA.md says where).

## 4. Registry: 8 distinct plan types

Write `CAT/REGISTRY.md` from its template, entries 01 to 08. Keep any copy of the registry the page reads in step with it (build.sh refuses a mismatch).

Choose from these types, or others, to suit the lot, the sun, the storeys allowed and the wishes:

| Type | The move |
|---|---|
| Bar | one room deep, long side to the sun |
| Ell | a bar with a short wing |
| Court or U | wings around an outdoor room |
| Two pavilions | living and sleeping apart, joined by a link or a breezeway |
| Compact two-storey | a simple box, bedrooms upstairs |
| Offset bars | two bars sliding past each other |
| Tower and wing | a tall part beside a low part |
| Great room | one wide gable, a big central room, side rooms like aisles |
| Gallery house | a long hall or sunroom along the sun side |
| Cluster | small gabled volumes around a porch |
| Split level | half levels down a slope (only when slope is known) |

- Every entry is a distinct plan type. Test each pair: could one become the other by stretching, mirroring or turning? Then cut one.
- Every entry fits the buildable area (the lot inset by the setbacks), the storeys allowed and the area range. Turn the house on the lot when that helps the sun or the fit; plans can sit at any angle.
- Each entry names the wishes it leans on. Across the 8, every wish is served by several entries.
- The headline move must be visible in the plan, the axon and the diagrams.
- Check each entry's geometry against the compass before you dispatch it: sketch where every wing, corner and porch ends up, and which way it faces. A wing running north from a bar makes a corner that faces north, never south. A contradiction here costs a full redraw.
- Say where the house turns as a true bearing ("the tower's glass faces about 285°"), never as a rotation number or "clockwise": the sign convention is easy to get backwards, and the drawing agent works the rotation out from DATA.md.
- Precedent notes in entries are pointers. The agents verify them with cite.cjs.

## 5. The one stop

Show the person the 8 types, one plain line each: "A long, narrow house one room deep, with every main room facing the winter sun." Ask: "Shall I draw these 8? You can swap any of them, for example 'swap 5 for a courtyard house'."

Also say: after this you work without stopping for about 1 to 2 hours; keep this window open and the Mac awake; the page will open in their browser, and refreshing it shows each option as it is accepted.

After their answer, update the registry. From here, do not stop again until the page is done, unless something blocks you (setup, usage limits).

## 6. Fill SPEC.md and start the page

Fill every `{{…}}` in `CAT/SPEC.md` (new-catalog.sh already filled `{{CAT}}`). `grep -o '{{[A-Z_]*}}' CAT/SPEC.md` must print nothing.

| Token | Value |
|---|---|
| `TITLE`, `WHO`, `N` | `brief.json` title and who; the number of options |
| `BRIEF` | bullets: rooms with minimum sizes, area range, storeys, foundation, budget and what it covers, each wish with its id in the person's words |
| `SITE_RULES` | bullets: the lot and setbacks in words, north, arrival, the general climate, slope and views only if in `site.known`, and a line naming what is not known |
| `LAT` | `site.lat` |
| `PRECEDENT_SET` | the buildings in `CAT/sources/precedents.md` |
| `REGIONAL` | the traditional types from step 3, or "none" |
| `NODE` | `brief.json` `node` |

Then `sh CAT/build.sh` and open the page for the person: `open CAT/<page>` (DATA.md names the file). It shows the 8 entries as in progress.

## 7. Draw in two batches of four

1. Fill `SKILL/dispatch.template.md` for 01 to 04.
2. Send the four agents in one message, in the background, on Opus.
3. Wait for the notifications. Do not poll.
4. When all four have reported, send 05 to 08 the same way. Review batch 1 while batch 2 draws.

## 8. Accept or return each option

For each finished option:

1. Run `NODE CAT/check.cjs oNN` yourself. Any ERROR, including a footprint outside the setback line, means return it.
2. Run `NODE CAT/wishes.cjs oNN`. A failed wish is not a defect by itself: the grade shows it. Return it only when the registry entry promised that wish. Check that the rooms the checks found are the real rooms: a bedroom labelled "Kitchen" would fool the checker.
3. Read every PNG in `CAT/shots/oNN-*` with the Read tool: plans, section, axon, site plan, diagrams, page. Look for overlaps, doors that hit furniture, labels on walls, faces in the wrong order, a roof that disagrees with its section, a north arrow that disagrees with the site plan, a red key volume that is not the headline move, and step frames that do not build to the final massing.
4. Run `NODE CAT/cite.cjs oNN`. Read each claim against its source lines.
5. Read the text. Plain words a non-architect follows. No site fact outside `site.known`. No wish claimed as met. No cost figures. Each pro and con true to the drawing.
6. **Pass:** append `oNN` to `CAT/accepted.txt`, then `sh CAT/build.sh`. The person's page now shows it.
7. **Before grading:** when an accepted drawing differs from its registry entry (a return changed the geometry, or the agent found a better arrangement), rewrite the entry to match the drawing. Graders read the registry and mark down any mismatch.
8. **Fail:** SendMessage to that agent with the exact defects. Fix it yourself only when the defect is one line. After two returns that still fail, start a fresh agent on the same entry and give it the defect list.

## 9. Grade

Start when all 8 are accepted.

1. Run `NODE CAT/metrics.cjs`. It writes `CAT/grades/metrics.md`: one block per accepted option with storeys, foundation, rotation, areas, rough cost against budget, each wish's measured result, and the option's PNG paths.
2. Fill `SKILL/grader.template.md` once per criterion and seat. Each grader scores all the options for one criterion, so the scale is the same across options.
   - Full (`lite: false`): seats 1 and 2 for each of the 5 criteria, 10 agents, on the session's model.
   - Light (`lite: true`): seat 1 only, 5 agents, on Sonnet.
3. Send them in one message, in the background. Wait for the notifications.
4. Each grader writes `CAT/grades/<criterion>-<seat>.json`. Check each file parses and scores every accepted option.
5. Where two seats differ by more than 30 points on one option, read both reasons. If one grader misread the evidence (a wrong PNG, a misread number), run that seat again for that criterion.
6. Merge the grades into `CAT/results.json` (shape in `kit/BRIEF.md`): `NODE CAT/merge-grades.cjs CAT`. It exits 1 and names any missing grade.

## 10. Final build and the page

1. `sh CAT/gate.sh`. It builds, then runs the checkers on every accepted option. Fix until it prints PASS.
2. Open the page for the person: `open CAT/<page>`.
3. Take a capture of the finished page, the way the person's browser shows it: `cd CAT && NPX playwright screenshot --full-page --viewport-size=1320,1000 file://CAT/<page> shots/final-1320.png`, and again at `390,844` into `final-390.png`. Read both. Check the ranked table, every option's diagrams and drawings, and no blank canvas. If you cannot take a capture, say "render unverified".
4. Tell the person, in plain words: where the page is; the top three, one line each (name, score, rough cost against budget); that costs are rough, a national average adjusted for the region and not a bid; and that they can ask for more options or a swap.

## 11. More options later

"Draw 4 more" or "swap option 3": add registry entries from 09 (distinct from every accepted one), show them in one stop, draw, accept, then grade all options again so the scale stays the same, and rebuild.

## 12. Compound

When the same defect shows up in two options, add a check to the run's `check.cjs` (or labels or fit) where it can be measured, and one sentence to the run's `SPEC.md`. Tell the drawing agents still working.

## Rules that came from failures

- Drawing agents work in small steps: crude rectangles first, then shoot and fix one Edit at a time. Agents that reasoned out a whole house in one reply hit the output limit and drew nothing.
- Each agent writes only its own `opts/oNN.js`, and each grader only its own grade file. Four drawing agents share the folder at a time.
- Agents read PNGs with the Read tool. No drawing agent or grader uses a browser tool.
- No site fact beyond `site.known`. No precedent outside the notes (`cite.cjs` fails it).
- A wish is met only when wishes.cjs measures it. Graders judge the wishes that have no checks.
- Only options in `accepted.txt` reach the page. `gate.sh` passes before the final build.
- A defect seen twice becomes a checker rule plus one SPEC sentence.

## When something goes wrong

- shoot.cjs says "Page crashed": run it once more. Four agents share the machine.
- Playwright fails with a sandbox or "operation not permitted" error: run that command outside the sandbox. The person approves it.
- A usage limit stops the run: tell the person the accepted options are already on the page, and the run goes on when they say "continue".
- node is killed in the middle of the run: run setup.sh again and follow its advice.
