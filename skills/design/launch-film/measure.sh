#!/bin/bash
# measure.sh <film.mp4> [opener_end_s]
# Fails (exit 1) when the cut rhythm leaves the launch-film grammar, calibrated
# on seven published product-launch films (20-90 s each):
#   - after the opener, median of the non-burst shots >= 3.5 s (refs: 4.8-8.7 s);
#   - rapid shots (<1.5 s) after the opener sit in <= 2 bursts of <= 5 s each.
# Threshold 0.08 catches every planned cut in the pilot except a same-colour
# swap (cream card -> cream card); cuts < 0.2 s apart count once.
set -euo pipefail
f=$1 op=${2:-0}
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
cuts=$(ffmpeg -v info -i "$f" -vf "select='gt(scene,0.08)',metadata=print" -an -f null - 2>&1 | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 | tr '\n' ' ')
python3 - "$d" "$op" $cuts <<'PY'
import sys, statistics as st
d, op = float(sys.argv[1]), float(sys.argv[2])
det = [float(x) for x in sys.argv[3:]]
# A hard cut spikes for 1-3 frames; a camera whip over dense content spikes for a
# run of consecutive frames. Runs of >= 3 detections (gaps <= 0.1 s) detections are moves, not cuts.
runs = []
for x in det:
    if runs and x - runs[-1][-1] <= 0.1: runs[-1].append(x)
    else: runs.append([x])
moves = [r for r in runs if len(r) >= 3]
# a lone spike within 0.3 s of a move is its tail, not a cut
raw = [r[0] for r in runs if len(r) < 3 and not any(0 < r[0] - m[-1] <= 0.3 for m in moves)]
raw = [x for i, x in enumerate(raw) if i == 0 or x - raw[i - 1] > 0.2]
c = [0.0] + raw + [d]
shots = [(a, b) for a, b in zip(c, c[1:]) if b - a > 0.08]
body = [(a, b) for a, b in shots if a >= op - 0.1]
bursts = []
for a, b in body:
    if b - a < 1.5:
        if bursts and a - bursts[-1][1] < 0.1: bursts[-1][1] = b
        else: bursts.append([a, b])
calm = [b - a for a, b in body if b - a >= 1.5]
med = st.median(calm) if calm else 0
for a, b in shots: print(f"  {a:6.2f}-{b:6.2f}  {b-a:5.2f}s")
print(f"{len(shots)} shots / {d:.1f}s; calm-shot median {med:.1f}s; bursts {[(round(a,1), round(b,1)) for a, b in bursts]}")
fails = []
if med < 3.5: fails.append(f"calm-shot median shot {med:.1f}s < 3.5s")
if len(bursts) > 2: fails.append(f"{len(bursts)} rapid bursts > 2")
fails += [f"burst {a:.1f}-{b:.1f} longer than 5s" for a, b in bursts if b - a > 5]
print("\n".join("FAIL: " + x for x in fails) or "PASS"); sys.exit(1 if fails else 0)
PY
