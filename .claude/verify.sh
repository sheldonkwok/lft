#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."
exec 1>&2

echo "==> build"
pnpm tsc -b || exit 2
pnpm vite build || exit 2

echo "==> lint"
pnpm biome check . || exit 2
pnpm biome format --write . || exit 2

echo "==> test"
pnpm playwright test || exit 2
