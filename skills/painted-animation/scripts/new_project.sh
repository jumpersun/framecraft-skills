#!/usr/bin/env bash
# new_project.sh <target-dir> [--keep-demo]
# Scaffolds a painted-animation project from the skill's template, installs deps and checks the toolchain.
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET=""; KEEP_DEMO=0; SKIP_INSTALL=0; CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --keep-demo) KEEP_DEMO=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) [ -z "$TARGET" ] || { echo 'Only one target directory is accepted' >&2; exit 1; }; TARGET="$arg" ;;
  esac
done
for tool in node npm rsync ffmpeg; do
  command -v "$tool" >/dev/null || { echo "MISSING: $tool; select a suitable toolchain before scaffolding" >&2; exit 1; }
done
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22 || (a===22 && b<12)){console.error("Node >=22.12.0 required; found "+process.version);process.exit(1)}'
FOUND=0
for c in "${CHROME_PATH:-}" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser; do
  if [ -n "$c" ] && [ -x "$c" ]; then FOUND=1; break; fi
done
[ "$FOUND" = 1 ] || { echo 'MISSING: Chrome; set CHROME_PATH to an executable browser' >&2; exit 1; }
echo "Toolchain OK: node $(node -v), npm, rsync, ffmpeg, Chrome"
[ "$CHECK_ONLY" = 1 ] && exit 0
[ -n "$TARGET" ] || { echo 'Usage: new_project.sh <new-directory> [--keep-demo] [--skip-install], or --check' >&2; exit 1; }
# Require a new directory so template copying cannot overwrite an existing project.
if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then echo "Target already exists: $TARGET; choose a new directory" >&2; exit 1; fi
mkdir -p "$TARGET"
rsync -a "$SKILL_DIR/template/" "$TARGET/"
mkdir -p "$TARGET/assets" "$TARGET/out/check"

# The demo is an example, not a template: unless asked, unhook it so the new video starts clean.
if [ "$KEEP_DEMO" != 1 ]; then
  sed -i.bak 's|<script src="src/scenes/demo.js"></script>|<!-- <script src="src/scenes/demo.js"></script>  (example only) -->|' "$TARGET/studio.html"
  rm -f "$TARGET/studio.html.bak"
fi

cd "$TARGET"
if [ "$SKIP_INSTALL" = 1 ]; then
  echo "Scaffold created; dependencies not installed: $TARGET"
else
  if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
  echo "Ready: $TARGET"
fi
