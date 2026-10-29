#!/bin/sh
# build.sh: build the page, project.js `out` (house-options.html), from brief.json, costs.json, REGISTRY.md, accepted.txt,
# opts/ and results.json when it exists (build.cjs says what goes in). Only options listed in accepted.txt (one key per
# line, e.g. o05) go in, so a drawing still in progress never reaches the page.
# Node is brief.json `node` ("node" on a normal Mac, or e.g. "orb run node" where native binaries are blocked);
# HO_NODE in the environment overrides it.
cd "$(dirname "$0")" || exit 1
NODE=${HO_NODE:-$(sed -n 's/.*"node"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' brief.json 2>/dev/null | head -n 1)}
NODE=${NODE:-node}
$NODE build.cjs
