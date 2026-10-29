---
name: house-options
description: Use when someone wants design options for a house they plan to build, such as floor plan ideas, layouts or house types for their lot, budget and wish list ("I'm building a house, here's my lot and budget", "what could I build on this lot", "give me some house plan options", "help me lay out a new home"). Draws about 8 genuinely different plan types to scale, each with plan, section, axon, sun study, diagrams, wish checks and a rough cost, rates them against the person's own priorities, and shows them on one local page. Made for a person who is not an architect.
---

# House options

## Overview

A person describes their lot, budget, rooms and wishes in plain words. This skill turns that into a fixed brief (`brief.json`), picks 8 distinct plan types, and has drawing agents draw each one as data with a shared 2D-canvas kit. Checkers measure every option before it reaches the page: areas, setbacks, stairs, labels, sun rays and each wish. Graders then rate every option on five criteria in the order the person chose. The result is one HTML page on the person's own Mac.

The plans are data, not pictures. The kit draws plan, section, axon, site plan and diagrams from that data. So the checkers can measure what the drawings show, and a wish is marked met only when the plan data proves it.

## When to use

- Someone plans to build a new house or cabin and wants to see different ways it could be laid out on their lot.
- Adding options to a run this skill already made (open the run folder's `REGISTRY.md`, `accepted.txt` and `results.json` first).

Not for: furnishing or rearranging one existing room, remodelling an existing house, permit or construction drawings, structural or energy engineering, or a price quote.

## Files

| File | Use |
|---|---|
| `controller.md` | **Read first.** The whole run in order: setup, intake, precedents, registry, the one stop, drawing, acceptance, grading, the page. |
| `intake.md` | How to turn the person's free text into `brief.json`, and which questions to ask. |
| `dispatch.template.md` | The prompt for one drawing agent. |
| `grader.template.md` | The prompt for one grader, per criterion, and the grade file it writes. |
| `kit/BRIEF.md` | The `brief.json` contract, the new option fields, and the `results.json` shape. |
| `kit/DATA.md` | The data format for site, foundation, steps, key and wish checks. |
| `kit/SPEC.md` | The drawing agents' brief. Filled into each run's `SPEC.md`. |
| `kit/REGISTRY.md` | The registry template: one entry per plan type. |
| `kit/setup.sh` | Checks node, Playwright and Chromium; installs them only with `--install`. |
| `kit/` | Drawing kit, checkers, build and gate. `sh kit/new-catalog.sh <dir>` copies it into a run folder. |
| `kit/examples/` | Worked options that teach the data format. |
| `README.md` | Install and first-run steps for the person. |

## Rules that came from failures

- Drawing agents work in small steps: crude rectangles first, then shoot and fix one Edit at a time. Agents that reasoned out a whole house in one reply hit the output limit and drew nothing.
- Each agent writes only its own `opts/oNN.js`, and each grader only its own grade file. Four drawing agents share the folder at a time.
- Agents read PNGs with the Read tool. No drawing agent or grader uses a browser tool.
- No site fact beyond `brief.json` `site.known`. No precedent outside the research notes (`cite.cjs` fails it).
- A wish is met only when `wishes.cjs` measures it. Drawing agents never claim a wish in their text.
- Only options in `accepted.txt` reach the page. `gate.sh` passes before the final build.
- A defect seen twice becomes a checker rule plus one sentence in SPEC.md.
