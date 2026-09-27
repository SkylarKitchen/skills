#!/bin/bash
# holds.sh <film.mp4> <t> [t ...]
# Fails when a camera hold lands on an empty region: edge density of the frame
# (mean of edgedetect) below 2.0 means the push-in is framing blank page.
# Pass the times where the plan's camera holds (a key repeated, e.g. [2.8]..[3.2] -> 3.0).
set -uo pipefail
f=$1; shift; fail=0
for t in "$@"; do
  e=$(ffmpeg -ss "$t" -i "$f" -frames:v 1 -vf "format=gray,edgedetect,signalstats,metadata=print" -f null - 2>&1 | grep -o 'YAVG=[0-9.]*' | head -1 | cut -d= -f2)
  if awk "BEGIN{exit !($e < 2.0)}"; then echo "FAIL t=$t edge density $e (blank framing)"; fail=1; else echo "ok   t=$t edge density $e"; fi
done
exit $fail
