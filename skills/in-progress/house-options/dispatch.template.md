# Dispatch prompt for one drawing agent

Fill every {{…}} and send one prompt per option, in the background, on Opus. Four agents at a time share the run folder.

---

You are drawing option {{NN}}, "{{NAME}}", for {{WHO}}'s house, "{{TITLE}}". The folder is {{CAT}} (CAT). Read CAT/SPEC.md first and follow it exactly, starting with its "Work in small steps" section. Then read CAT/DATA.md, CAT/brief.json and your entry "{{NN}} {{NAME}}" in CAT/REGISTRY.md. Write only CAT/opts/o{{NN}}.js, defining OPT.o{{NN}}. Other agents are drawing other options in the same folder at the same time: never touch their files or any shared file.

Finished examples to learn the format from:
{{EXAMPLES: 2 or 3 files, each with the one thing it shows, e.g. "- examples/D.js: two bars around a court, joined by a link."}}

The nearest ideas, and how this one must differ:
{{NEAREST: the 1 or 2 closest registry entries, one line each on what they do, then "Yours must not read as …".}}

{{HEADLINE: two or three sentences restating the registry's headline move as hard constraints (counts, sizes, what must be true in plan).}}

On the lot: {{SITE: the rotation idea and where the house sits, e.g. "Turn the house so its long glass side faces about 10° east of south (rotation 10), near the north setback line so the drive is short."}} Set `site: {rotation, at}` as DATA.md describes. check.cjs fails any footprint outside the setback line, and the site plan shows it. Foundation: {{FOUNDATION: slab, crawl or piers, and why in a few words}}.

The wishes this entry leans on: {{WISHES: ids and the person's words, e.g. "w1 'A nice kitchen that faces natural light in the mornings'"}}. Design for every wish in brief.json, these first. You may run `{{NODE}} CAT/wishes.cjs o{{NN}}` to see how the plan measures. But never write that a wish is met, in any text field: wishes.cjs measures it and the page shows the result. Label rooms with the exact names in brief.json, since wishes.cjs finds rooms by name.

The bar is the worked examples: a real, buildable plan this household could live in, furnished and drawn cleanly, with a section whose sun rays are exact and an axon that agrees with both. Make the headline move obvious:
- In plan, {{WHAT THE PLAN MUST SHOW}}.
- In section, {{WHERE TO CUT AND WHAT THE SUN MUST SHOW}}.
- In the axon, {{WHAT MUST READ FROM THE HOUSE'S SOUTH-WEST CORNER}}.
- In the diagrams: `key` is {{THE ONE VOLUME OR OUTDOOR ROOM TO COLOUR RED}}, and `steps` tells in 3 to 5 frames how this person's wishes and lot made the form, for example {{STEP IDEA: "start with the box; turn it to the morning sun; pull the kitchen east; add the porch"}}.

Be honest in the cons: {{THE COSTS THIS TYPE USUALLY HIDES, e.g. unheated crossings, extra exterior wall, stairs, length}}.

The registry's notes on precedents are pointers, not facts: cite only what `cite.cjs` shows in the sources, or well-established, widely published facts about the regional types SPEC names. Write for a reader who is not an architect: plain words, and a short explanation for any building term you must use.

Verify with check.cjs, shoot.cjs, wishes.cjs and cite.cjs as the spec says. Run node only as `{{NODE}}`. Do at least two full rounds of check and shoot, and look at every PNG you produce, with the Read tool, before you call it done. If shoot.cjs reports "Page crashed", run it once more (four agents share the machine). Never use any browser tool. End with the report the spec asks for.
