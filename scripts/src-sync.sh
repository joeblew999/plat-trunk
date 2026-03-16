#!/usr/bin/env bash
# scripts/src-sync.sh — Clone/update all vendored .src repos
#
# Idempotent: clones if missing, pulls latest if already present.
# Used by:
#   mise run src:sync     (local dev + session setup)
#   CI workflow           (single step replaces all ad-hoc clone steps)
#
# .src/ repos (all gitignored, all Cargo path deps for systems/truck/crate/):
#   .src/truck     — virtualritz/monstertruck (B-Rep kernel, permanently on monstertruck)
#   .src/ifc-lite  — louistrue/ifc-lite (BIM/IFC parser, LFS skipped)
#   .src/ezpz      — KittyCAD/ezpz (kcl-ezpz 2D constraint solver)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT_DIR/.src"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
info() { echo -e "${CYAN}[src-sync]${NC} $*"; }
ok()   { echo -e "${GREEN}[src-sync]${NC} ✓ $*"; }
warn() { echo -e "${YELLOW}[src-sync]${NC} WARN: $*"; }

mkdir -p "$SRC_DIR"

# Idempotent clone-or-pull. Extra args passed to git clone only.
sync_repo() {
  local dir="$1" url="$2"; shift 2
  if [ -d "$dir/.git" ]; then
    git -C "$dir" pull --ff-only --quiet 2>/dev/null || \
      warn "$(basename "$dir") — pull skipped (detached HEAD or local changes)"
  else
    info "cloning $(basename "$dir") ..."
    git clone "$@" "$url" "$dir"
  fi
  ok "$(basename "$dir") @ $(git -C "$dir" rev-parse --short HEAD)"
}

# .src/truck — monstertruck B-Rep kernel (permanently on monstertruck)
sync_repo "$SRC_DIR/truck" "https://github.com/virtualritz/monstertruck.git"
# Init submodules — resources/shape contains golden test fixtures (JSON shapes)
git -C "$SRC_DIR/truck" submodule update --init --recursive --quiet 2>/dev/null || \
  warn "truck: submodule init failed (golden test resources may be missing)"
ok "truck submodules initialised"
# Patch resources: rename old BSplineCurve → BsplineCurve (monstertruck renamed the variant)
find "$SRC_DIR/truck/resources" -name "*.json" -exec \
  sed -i 's/"BSplineCurve":/"BsplineCurve":/g' {} \; 2>/dev/null || true
ok "truck resources patched (BSplineCurve → BsplineCurve)"

# .src/ifc-lite — BIM/IFC parser
# GIT_LFS_SKIP_SMUDGE=1: skip large test model downloads, only Rust source needed
GIT_LFS_SKIP_SMUDGE=1 sync_repo "$SRC_DIR/ifc-lite" \
  "https://github.com/louistrue/ifc-lite.git" --depth=1

# .src/ezpz — KittyCAD kcl-ezpz 2D constraint solver
sync_repo "$SRC_DIR/ezpz" "https://github.com/KittyCAD/ezpz.git" --depth=1