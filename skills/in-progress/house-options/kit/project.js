// project.js: the page's and the tools' settings for one run. The house itself (lot, budget, rooms, wishes, the node
// command) lives in brief.json, the cost rates in costs.json and the grades in results.json; nothing here repeats them.
// Paths are relative to the run folder unless absolute. new-catalog.sh copies this file; the defaults work as they are.
'use strict';
const PROJECT = {
  // ---------------------------------------------------------------- the page
  out: 'house-options.html',        // the page build.sh writes; open it with `open CAT/house-options.html`
  title: null,                      // the page's <title>; null takes brief.json `title`
  // the page's own words, as HTML; null takes the default, which build.cjs writes from brief.json
  text: {h1: null, lede: null},
  card: {allDrawn: 'All options drawn.'},
  // the options to draw, [number, name, one line], in step with REGISTRY.md (build.sh refuses a mismatch); number NN is opts/oNN.js
  registry: [],

  // ---------------------------------------------------------------- checks
  // words the house's own text may not name as if they were on the site, unless brief.json site.known lists the topic
  // (check.cjs warns): each key is a word of site.known, each value the words it allows
  siteWords: {
    trees: /\b(brush|trees?|woods|woodland|forest|orchard|hedgerow)\b/i,
    water: /\b(creek|stream|river|pond|lake|shore|waterfront)\b/i,
    neighbours: /\b(neighbou?rs?'? (?:house|houses|windows))\b/i
  },

  // ---------------------------------------------------------------- tools only (never on the page)
  cite: {
    // the research notes cite.cjs searches for each precedent: a folder (its .md files) or a file
    sources: ['sources'],
    // the region's traditional house types agents may cite without a note, as a RegExp, e.g. /\b(saltbox|cape cod|ranch)\b/i;
    // null for none. The controller fills it after the precedent research.
    regional: null
  }
};
if (typeof module !== 'undefined') module.exports = PROJECT;
