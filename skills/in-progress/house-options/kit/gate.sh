#!/bin/sh
# gate.sh: everything that must pass before the page is final, in one command. Exits 1 on the first failure.
#   1. build.sh
#   2. check.cjs on every option in accepted.txt: no ERROR (warnings are printed, to be read)
#   3. labels.cjs: labels clear of each other, the paper's edge and, on a phone, the walls, with every room named, at 17
#      widths. The first gate writes labels-1320.json, the desktop sheet's labels, which later runs hold the page to.
#   4. fit.cjs: every drawing inside its column, one scale per kind of drawing on every sheet, at 17 widths
# No server: labels.cjs and fit.cjs open the page over file://. Node is brief.json `node`; HO_NODE overrides it.
cd "$(dirname "$0")" || exit 1
NODE=${HO_NODE:-$(sed -n 's/.*"node"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' brief.json 2>/dev/null | head -n 1)}
NODE=${NODE:-node}
[ -f test-wishes.cjs ] && { $NODE test-wishes.cjs || { echo "gate.sh: test-wishes.cjs failed" >&2; exit 1; }; }
sh build.sh || exit 1
bad=0; n=0; : > gate-check.out
for k in $(grep -E '^o[0-9]{2}$' accepted.txt 2>/dev/null | sort -u); do
  out=$($NODE check.cjs "$k" 2>&1); n=$((n+1))
  echo "$out" >> gate-check.out
  echo "$out" | grep -E "^$k: [0-9]+ error"
  echo "$out" | grep -q "^ERROR" && { echo "$out" | grep "^ERROR"; bad=1; }
done
[ "$n" -gt 0 ] || { echo "gate.sh: accepted.txt lists no options" >&2; exit 1; }
[ "$bad" -eq 0 ] || { echo "gate.sh: check.cjs found errors (all output in gate-check.out)" >&2; exit 1; }
echo "check.cjs: $n options, no errors"
if [ ! -f labels-1320.json ]; then
  $NODE labels.cjs --baseline > gate-labels.out 2>&1 || { tail -25 gate-labels.out; echo "gate.sh: labels.cjs --baseline failed" >&2; exit 1; }
  tail -n 1 gate-labels.out
fi
$NODE labels.cjs > gate-labels.out 2>&1 || { tail -25 gate-labels.out; echo "gate.sh: labels.cjs failed" >&2; exit 1; }
tail -n 1 gate-labels.out
$NODE fit.cjs > gate-fit.out 2>&1 || { tail -25 gate-fit.out; echo "gate.sh: fit.cjs failed" >&2; exit 1; }
tail -n 1 gate-fit.out
echo "gate.sh: PASS"
