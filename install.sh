#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SHARED_DIR="${HOME}/.agents/skills"

link_skill() {
  source_path=$1
  destination=$2
  mkdir -p "$(dirname "$destination")"

  if [ -L "$destination" ]; then
    rm "$destination"
  elif [ -e "$destination" ]; then
    echo "Refusing to replace existing non-symlink: $destination" >&2
    exit 1
  fi

  ln -s "$source_path" "$destination"
  echo "Linked $destination -> $source_path"
}

mkdir -p "$SHARED_DIR"

for skill_path in "$ROOT"/skills/*; do
  [ -f "$skill_path/SKILL.md" ] || continue
  skill_name=$(basename "$skill_path")
  shared_path="$SHARED_DIR/$skill_name"

  link_skill "$skill_path" "$shared_path"

  if [ -d "${HOME}/.codex" ]; then
    link_skill "$shared_path" "${HOME}/.codex/skills/$skill_name"
  fi
  if [ -d "${HOME}/.claude" ]; then
    link_skill "$shared_path" "${HOME}/.claude/skills/$skill_name"
  fi
done
