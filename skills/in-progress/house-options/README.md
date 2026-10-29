# House options

A skill for Claude Code. You describe the house you want to build: your lot, your budget, the rooms you need and what you wish for. Claude draws about 8 genuinely different house plans for it, to scale, and rates each one against your own priorities. You get one page on your Mac that you can open in your browser and share.

You do not need to be an architect, and you do not need to know how to code.

## What you need

- A Mac.
- Claude Code: the Code tab in the Claude desktop app, or the `claude` command in Terminal.
- A Claude plan. Pro works; on Pro the skill grades with a lighter pass to stay inside your usage.
- Node.js 18 or later. If you don't have it, the skill tells you how to get it: a normal Mac installer from nodejs.org.
- About 1 GB of free disk space, and an internet connection.

## Install

Open Terminal and paste these lines:

```
git clone https://github.com/SkylarKitchen/skills.git ~/claude-skills
mkdir -p ~/.claude/skills
ln -s ~/claude-skills/skills/in-progress/house-options ~/.claude/skills/house-options
```

If the Mac asks to install "command line developer tools" when you run `git`, click Install, wait for it to finish, and paste the lines again.

Or start Claude Code and ask: "Install the house-options skill from https://github.com/SkylarKitchen/skills: clone it into ~/claude-skills and link skills/in-progress/house-options into ~/.claude/skills."

Then start a new Claude Code session, so it finds the skill. To update later, run `cd ~/claude-skills && git pull`. `example.html` in the skill folder shows a finished page for a made-up house: open it in a browser to see what you will get.

## Start

Tell Claude about your house in your own words. For example:

> I'm building a house. The lot is about 120 ft wide along the road and 260 ft deep, and the road is on the south side. It's in a small town in Ohio. Budget is $650,000 for the house only. We need three bedrooms, two baths and an office. I'd like a kitchen with morning light, a big porch, and our bedroom away from the kids' rooms. Simple, lots of wood.

Things that help: which way the lot faces, its size, the town, the budget and what it covers, the rooms, and anything you wish for. A photo of your survey or plat is the best way to give the lot: drag it into the chat.

You don't need to know everything. Claude asks a few short questions for what is missing, and never makes up facts about your land. If you don't know your setbacks (how far the house must stay from each lot line), it uses typical ones and marks them as assumed.

## What happens

1. **Setup check, about 5 minutes.** Claude checks that your Mac has what it needs. It may ask to install Playwright, a tool that draws the pages in a private copy of the Chromium browser. It installs nothing without your OK.
2. **A few questions, about 5 minutes.** Then Claude reads your answers back to you, for example each edge of your lot, so you can correct anything.
3. **One stop.** Claude shows you the 8 house types it plans to draw, one line each. Say yes, or swap any of them ("swap 5 for a courtyard house").
4. **About 1 to 2 hours of work.** Claude draws, checks and grades the options on its own. A page opens in your browser. Refresh it to watch each option appear as it is accepted. Keep Claude Code open and your Mac awake.

On a Pro plan the run may pause at your usage limit. The finished options stay on the page. Say "continue" when your usage resets.

## What the page shows

- Your brief in one paragraph, and your five priorities in your order.
- A table of the options, ranked: score, rough cost against your budget, and how many of your wishes each one meets.
- For each option, best first:
  - diagrams of the big idea, and a short sequence showing how your lot and wishes shaped it;
  - the floor plan (both floors if there are two), a section (a slice through the house) with the winter and summer sun drawn for your latitude, and a 3D view;
  - a site plan of the house on your lot, inside the setbacks;
  - its score on each of your priorities, with a one-line reason;
  - each of your wishes, measured from the drawing, or marked "judged" when it can't be measured (like "it should feel calm");
  - a rough cost by category, and its pros and cons.

The files live in `~/house-options/<your house>/`. The page is the HTML file there. It is a single file you can email or put on a shared drive.

## About the costs

The costs are rough. They come from national average building costs, adjusted for your state or country, times each plan's own measured areas. They are not a bid or a quote. Land, design fees and unusual site work are not in them unless you said your budget covers them. Ask a local builder before you decide anything. If you have a builder's figure, give it to Claude and it will use that instead.

## What it does not do

- Permit or construction drawings, or engineering.
- Building code checks, except staying inside your setbacks.
- Curved walls or lots, more than two floors, or basements (a basement is drawn as a crawlspace).
- Sites in the southern hemisphere, for now.

## Afterwards

Ask for more any time, in a new Claude Code session if you like: "draw 4 more house options for my house", "swap option 3 for something with a courtyard". Claude adds the new options and grades all of them again, so the scores stay comparable.

## If something goes wrong

- **"node was stopped" or "BLOCKED":** your Mac blocks programs that are not from an approved developer. Ask whoever manages your Mac to allow Node.js.
- **Chromium did not start:** run the setup check again outside Claude Code's sandbox, or ask Claude to.
- **The page is blank:** wait for the first option to be accepted, then refresh.
