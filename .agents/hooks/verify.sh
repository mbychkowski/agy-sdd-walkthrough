#!/usr/bin/env bash
set -euo pipefail

echo "🔒 [Hook: verify.sh] Running deterministic test & build verification gate..."
npm test
echo "✅ [Hook: verify.sh] All checks passed!"
