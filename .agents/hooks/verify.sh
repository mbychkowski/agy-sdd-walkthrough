#!/usr/bin/env bash
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Run fast Vitest suite (<500ms)
if OUTPUT=$(npm --prefix "$REPO_ROOT/server" run test:fast 2>&1); then
  # Passing gate outputs empty JSON -> allows agent to stop cleanly (0 tokens)
  echo '{}'
else
  # Failing gate outputs {"decision": "continue", "reason": "..."} -> blocks stop & forces auto-repair!
  REASON=$(printf "❌ Deterministic Stop Hook Failed (npm run test:fast):\n%s\nFix the broken test contract before finishing your turn." "$OUTPUT" | tail -n 25 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  echo "{\"decision\": \"continue\", \"reason\": $REASON}"
fi
