#!/bin/sh
# new-catalog.sh <dest-dir>: start a run folder (CAT) for one house brief from this kit.
# Copies the kit into <dest-dir> (new, or empty) with an empty opts/, shots/, grades/ and sources/ and an empty
# accepted.txt, and writes the folder's path into SPEC.md as CAT. Next: write brief.json (BRIEF.md), the precedent notes
# in sources/, REGISTRY.md and every {{TOKEN}} left in SPEC.md (controller.md lists them), then build.sh.
set -e
[ $# -eq 1 ] || { echo "usage: new-catalog.sh <dest-dir>" >&2; exit 1; }
kit=$(cd "$(dirname "$0")" && pwd)
if [ -e "$1" ] && [ -n "$(ls -A "$1")" ]; then echo "new-catalog.sh: $1 is not empty" >&2; exit 1; fi
mkdir -p "$1/opts" "$1/shots" "$1/examples" "$1/grades" "$1/sources" "$1/fonts"
dest=$(cd "$1" && pwd)
for f in project.js head.html body.html style.css lib.js sheet.js catalog.js preview.html preview-init.js \
         build.sh build.cjs gate.sh check.cjs wishes.cjs metrics.cjs merge-grades.cjs cite.cjs shoot.cjs labels.cjs fit.cjs \
         costs.json DATA.md BRIEF.md REGISTRY.md setup.sh; do
  cp "$kit/$f" "$dest/$f"
done
# the diagrams, when this kit has them
for f in diagrams.js diagrams.cjs diagrams-preview.html test-wishes.cjs; do [ -f "$kit/$f" ] && cp "$kit/$f" "$dest/$f"; done
cp "$kit"/fonts/* "$dest/fonts/"
cp "$kit"/examples/*.js "$dest/examples/"
[ -f "$kit/examples/brief.json" ] && cp "$kit/examples/brief.json" "$dest/examples/brief.json"
sed "s|{{CAT}}|$dest|g" "$kit/SPEC.md" > "$dest/SPEC.md"
: > "$dest/accepted.txt"
chmod +x "$dest/build.sh" "$dest/gate.sh" "$dest/setup.sh"
echo "new run folder in $dest"
echo "next: write $dest/brief.json (BRIEF.md; examples/brief.json is a filled-in one), sources/precedents.md, REGISTRY.md, the SPEC.md tokens; then sh $dest/build.sh"
