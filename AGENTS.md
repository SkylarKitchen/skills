Skills live in bucket folders under `skills/`:

- `design/`: visual work (drawings, diagrams, interactive pages)
- `misc/`: kept but rarely used, not promoted
- `in-progress/`: public for feedback, not shipped in the plugin
- `deprecated/`: retired

Only `design/` exists so far; create a bucket when its first skill arrives. `design/` is promoted. Every skill in a promoted bucket needs all of these:

1. An entry in the top-level `README.md` and in its bucket's `README.md`: the name linked to its `SKILL.md`, then a one-line description, grouped under **User-invoked** or **Model-invoked**.
2. A path in the `skills` array of `.claude-plugin/plugin.json`. The plugin ships exactly the promoted set.
3. `agents/openai.yaml` with `interface.display_name` and `interface.short_description`.
4. A docs page at `docs/<bucket>/<skill>.md` with **What it does**, **When to reach for it**, **Common questions** and **It's working if**. Re-sync it whenever the skill's behaviour changes.

Skills in `misc/`, `in-progress/` and `deprecated/` stay out of the top-level `README.md` and `plugin.json` and get no docs page. Their bucket `README.md` is a flat list.

**Invocation.** Skills are model-invoked by default. A user-invoked skill (reachable only when typed) sets `disable-model-invocation: true` in its `SKILL.md` frontmatter and `policy.allow_implicit_invocation: false` in its `agents/openai.yaml`, always both.

**Manifests.** `.claude-plugin/marketplace.json` makes this repo its own one-plugin marketplace. Run `claude plugin validate . --strict` after touching either manifest. Validating `plugin.json` on its own also warns that this file isn't loaded as plugin context; that is intended, since it is for maintainers. Bump `version` in `plugin.json` when a change alters what installs.

**Public repo.** Everything here is public. Skills speak of "the user", never a named person, and carry no private details: home town or region, local businesses that would place someone, personal file paths, names of people, or work content. `scripts/check-private.sh` scans every tracked file for home-directory paths and for the terms in a denylist kept outside the repo (`~/.config/skills/private-terms.txt`, one term per line, since the list itself is private). Run it before every commit; it is also this clone's pre-commit hook (`ln -s ../../scripts/check-private.sh .git/hooks/pre-commit`).

**Local install.** `scripts/link-skills.sh` symlinks every skill outside `misc/` and `deprecated/` into `~/.claude/skills` and `~/.agents/skills`, so a `git pull` updates them. It never replaces a real folder of the same name: it warns and skips. `scripts/list-skills.sh` prints each skill with its bucket.
