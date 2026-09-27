#!/usr/bin/env bash
# Fails when a tracked file carries private details: a home-directory path, or a
# term from a denylist kept outside this public repo (the list itself is private).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"   # the tree being committed: a hook resolved by its symlink would scan the main checkout from a linked worktree

LIST="${SKILLS_PRIVATE_TERMS:-$HOME/.config/skills/private-terms.txt}"
found=0

# Tracked and new files. The author's name belongs in the license and manifests, nowhere else.
files() { git ls-files -z --cached --others --exclude-standard -- . ':!LICENSE' ':!.claude-plugin'; }
[ -n "$(files | tr -d '\0')" ] || { echo "no files to check" >&2; exit 1; }

if files | xargs -0 grep -nIE '/(Users|home)/[A-Za-z0-9._-]+/'; then found=1; fi

if [ -f "$LIST" ]; then
  terms="$(grep -v '^[[:space:]]*$' "$LIST" | paste -sd'|' -)"
  if [ -n "$terms" ] && files | xargs -0 grep -nIiwE "$terms"; then found=1; fi
  # Commits are published too, so the author email must not be a work or private address.
  email="$(git var GIT_AUTHOR_IDENT | sed 's/.*<\(.*\)>.*/\1/')"
  if [ -n "$terms" ] && printf 'author: %s\n' "$email" | grep -iwE "$terms"; then found=1; fi
else
  echo "note: no denylist at $LIST, so only paths were checked" >&2
fi

if [ "$found" = 1 ]; then echo "private details above; remove them before committing" >&2; exit 1; fi
echo "clean"
