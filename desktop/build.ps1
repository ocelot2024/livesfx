$ErrorActionPreference = "Stop"

$ROOT = Resolve-Path (Join-Path $PSScriptRoot "..")
$DESKTOP = Join-Path $ROOT "desktop"

Set-Location $ROOT

pnpm build-bin

Remove-Item (Join-Path $DESKTOP "dist") -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $ROOT "dist") (Join-Path $DESKTOP "dist") -Recurse

Set-Location $DESKTOP

cargo build --release --target x86_64-pc-windows-msvc
