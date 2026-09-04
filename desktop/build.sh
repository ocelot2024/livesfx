#!/usr/bin/env bash

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP="$ROOT/desktop"

cd "$ROOT"

pnpm build-bin

rm -rf "$DESKTOP/dist"
cp -r dist "$DESKTOP/dist"

cd "$DESKTOP"

for t in \
    x86_64-unknown-linux-musl \
    aarch64-unknown-linux-musl
do
    cross build --release --target "$t"
done
