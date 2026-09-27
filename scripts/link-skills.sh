#!/usr/bin/env bash
# Symlinks each skill in this repo into the local agent skill folders, so a
# `git pull` keeps them current. Skips misc/ and deprecated/. Never replaces a
# real folder of the same name: it warns and moves on, and you decide.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")

for DEST in "${DESTS[@]}"; do
  mkdir -p "$DEST"
  while IFS= read -r -d '' md; do
    src="$(dirname "$md")"
    name="$(basename "$src")"
    target="$DEST/$name"
    if [ -e "$target" ] && [ ! -L "$target" ]; then
      echo "skip $name: $target is a real folder (move it aside to link)" >&2
      continue
    fi
    ln -sfn "$src" "$target"
    echo "linked $name -> $target"
  done < <(find "$REPO/skills" -name SKILL.md -not -path '*/misc/*' -not -path '*/deprecated/*' -print0)
done
