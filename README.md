# Skills

Agent skills I use for design work with Claude Code and other coding agents. Each one is a small folder: a `SKILL.md` the agent reads, plus the files it needs to do the job well.

## Install

Two routes. Pick one: installing both gives you every skill twice.

**Claude Code plugin.** Installs the set as one managed bundle that updates when this repo does.

```bash
claude plugin marketplace add SkylarKitchen/skills
claude plugin install skylarkitchen-skills@skylarkitchen
```

Or, from inside a session:

```
/plugin marketplace add SkylarKitchen/skills
/plugin install skylarkitchen-skills@skylarkitchen
```

**skills.sh, for any agent.** Copies the skill files into your project as ordinary files you own and can edit.

```bash
npx skills@latest add SkylarKitchen/skills
```

## Reference

**Model-invoked** skills run when you type them or when the agent sees a task that fits. **User-invoked** skills run only when you type them. Everything here is model-invoked so far.

### Design

Skills for visual work: drawings, diagrams, and interactive pages.

**Model-invoked**

- **[3d-assembly-manual](./skills/design/3d-assembly-manual/SKILL.md)**: Build a phone-first, step-by-step 3D build guide (LEGO-manual pacing, BIG-diagram look) as a single Three.js HTML file, from a starter engine you only configure.
- **[launch-film](./skills/design/launch-film/SKILL.md)**: Make a short, frame-exact product film for X or a portfolio from the real app, site or Three.js scene: an authored camera over the real surface, rendered on a canvas engine instead of cut from a screen recording.
- **[room-from-photos](./skills/design/room-from-photos/SKILL.md)**: Turn a few phone photos of an existing room into a near-photoreal 3D model and plan, with furniture layouts to compare, a library of pieces to add, fit checks, and a gizmo to drag pieces around, as a single Three.js HTML file.

## License

[MIT](./LICENSE)
