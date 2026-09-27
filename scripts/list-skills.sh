#!/usr/bin/env bash
# Prints each skill as bucket/name.
set -euo pipefail
cd "$(dirname "$0")/../skills"
find . -name SKILL.md | sed -e 's|^\./||' -e 's|/SKILL\.md$||' | sort
