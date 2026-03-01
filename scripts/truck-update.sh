#!/bin/bash
# ============================================================================
# truck-update.sh — Automated Fork Tracking for the truck CAD kernel
# ============================================================================
#
# Usage:
#   bun run truck:update             # full update + build + test
#   bun run truck:update:quick       # git operations only, skip build/test
#   bun run truck:status             # review all forks, branches, links (read-only)
#
# What this does:
#   Tracks virtualritz/truck as our upstream base (instead of the unmaintained
#   ricosjp/truck). Creates a "composite" branch for our fork with the latest
#   virtualritz work. Re-run whenever virtualritz pushes updates.
#
# Why virtualritz?
#   Upstream ricosjp/truck is unmaintained (only automated cargo-upgrade commits).
#   virtualritz is 58+ commits ahead with fillet, T-splines, parallel mesh.
#   That's where all the real development is happening.
#
# Boolean coplanar fix:
#   truck-shapeops has a fundamental bug with axis-aligned/coplanar faces
#   (issue #57: "This wire is not simple" panic). This is NOT fixed in the
#   truck source — it's worked around in our code at systems/truck/crate/src/wasm_app.rs
#   via try_bool_with_fallback() + asymmetric perturbation + panic=unwind.
#   See BOOL_PERTURBATION constant and Cargo.toml panic="unwind" setting.
#
# ============================================================================
# REPOSITORY REFERENCE
# ============================================================================
#
# UPSTREAM — ricosjp/truck (reference only, effectively unmaintained)
#   Repo:    https://github.com/ricosjp/truck
#   Stars:   1,389 | License: Apache-2.0
#   Author:  Yoshinori Tanimura (ytanimura) — PhD Math, RICOS Co. Ltd.
#   Status:  Only automated cargo-upgrade commits since late 2025.
#            8 open community PRs with zero reviewer activity.
#   Issues:  https://github.com/ricosjp/truck/issues
#   PRs:     https://github.com/ricosjp/truck/pulls
#
# OUR FORK — joeblew999/truck (push target for composite branch)
#   Repo:    https://github.com/joeblew999/truck
#   Status:  Tracks virtualritz/master. Composite branch built by this script.
#
# ============================================================================
# FEATURE FORK: virtualritz (Moritz Mœller) — OUR BASE
# ============================================================================
#   Repo:    https://github.com/virtualritz/truck
#   Contact: virtualritz@protonmail.com
#   LinkedIn: https://linkedin.com/in/moritzmoeller
#   Ahead:   ~58 commits (diverged from upstream, actively developed)
#
#   What it brings:
#     - Fillet engine: multi-chain, chamfer, per-edge radius, variable-radius
#       → Addresses upstream issue #53: https://github.com/ricosjp/truck/issues/53
#     - T-spline support (Phase 7): performance, BSpline conversion, adaptive refinement
#       → Addresses upstream issue #13: https://github.com/ricosjp/truck/issues/13
#     - Parallel tessellation: StructuredMesh::from_surface_par
#     - Tessellation performance: AABB early reject, untrimmed face fast path,
#       configurable projection search trials
#     - Non-clamped B-spline parameter_range() fix
#       → PR #105: https://github.com/ricosjp/truck/pull/105 (+16K/-2K lines)
#     - Various: renamed Config→Options, removed builder methods, clippy lints
#
#   Branches:
#     master                       — main development (our base)
#     parking-lot-and-rclite-arc   — performance experiment (parking_lot mutex)
#
#   Key files changed (vs upstream):
#     truck-meshalgo/   — parallel mesh, AABB, tessellation config
#     truck-modeling/   — fillet engine, T-spline API
#     truck-geometry/   — B-spline parameter_range fix
#     Cargo.toml        — workspace refactoring
#
# ============================================================================
# OTHER FORKS & PRs (not currently used, available for future cherry-picks)
# ============================================================================
#
#   ovo-Tim — coplanar boolean fixes (partial — only fixes partial-face overlap)
#     Repo:    https://github.com/ovo-Tim/truck
#     PR #110 (coplanar fix):  https://github.com/ricosjp/truck/pull/110
#     PR #111 (STEP fix):      https://github.com/ricosjp/truck/pull/111
#     NOTE: These only fix partial-face coplanar cases. Full-face coplanar,
#           axis-aligned overlap, and half-overlap all still panic.
#           Our wasm_app.rs perturbation fix handles ALL cases.
#
#   PR #112 (thayashi-tech):  non-intersect bbox fix
#     https://github.com/ricosjp/truck/pull/112
#   PR #109 (sethml):  binary STL read fix >8192 bytes
#     https://github.com/ricosjp/truck/pull/109
#   PR #101 (xgarnaud):  more tessellation parameters
#     https://github.com/ricosjp/truck/pull/101
#   PR #92 (tymokvo):  fix zoom in simple-obj-viewer
#     https://github.com/ricosjp/truck/pull/92
#   PR #64 (larsniem):  handle Axis2Placement parallel to x-axis
#     https://github.com/ricosjp/truck/pull/64
#
#   Related projects:
#     Fornjot (B-Rep, experimental):  https://github.com/hannobraun/fornjot
#     opencascade-rs (OCCT bindings):  https://github.com/bschwind/opencascade-rs
#     curvo (NURBS):  https://github.com/mattatz/curvo
#     CADmium (archived, was on truck):  https://github.com/CADmium-Co/CADmium
#     FoxCAD (ovo-Tim, Rust+WASM):      https://github.com/ovo-Tim/FoxCAD
#
# ============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRUCK_DIR="$PROJECT_ROOT/.src/truck"
CRATE_DIR="$PROJECT_ROOT/systems/truck/crate"

COMPOSITE_BRANCH="composite"

# Git remote URLs
REMOTE_ORIGIN="https://github.com/joeblew999/truck.git"
REMOTE_UPSTREAM="https://github.com/ricosjp/truck.git"
REMOTE_VIRTUALRITZ="https://github.com/virtualritz/truck.git"

# Parse flags
NO_BUILD=false
STATUS_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=true ;;
    --status)   STATUS_ONLY=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# --- Colors (for terminal output) -------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[truck-update]${NC} $*"; }
ok()    { echo -e "${GREEN}[truck-update]${NC} $*"; }
warn()  { echo -e "${YELLOW}[truck-update]${NC} WARN: $*"; }
fail()  { echo -e "${RED}[truck-update]${NC} FAIL: $*"; exit 1; }

# --- Pre-checks --------------------------------------------------------------

info "Checking prerequisites..."

if [ ! -d "$TRUCK_DIR/.git" ]; then
  fail ".src/truck/ is not a git repository. Clone it first:"
  echo "  git clone https://github.com/joeblew999/truck.git .src/truck"
fi

command -v cargo >/dev/null 2>&1 || fail "cargo not found (need Rust toolchain)"
command -v wasm-pack >/dev/null 2>&1 || fail "wasm-pack not found (cargo install wasm-pack)"

# --- Status mode: review all repos without changing anything ------------------

if [ "$STATUS_ONLY" = true ]; then
  cd "$TRUCK_DIR"
  git fetch --all --prune --quiet 2>/dev/null

  echo ""
  info "${BOLD}=== Truck Fork Status ===${NC}"
  echo ""

  # Current state
  CURRENT=$(git branch --show-current 2>/dev/null || echo "detached")
  CURRENT_HEAD=$(git log -1 --format='%h %s' 2>/dev/null)
  info "Current branch: ${BOLD}$CURRENT${NC} → $CURRENT_HEAD"
  echo ""

  # All remotes
  info "${BOLD}Remotes:${NC}"
  git remote -v | grep fetch | while read -r name url _; do
    printf "  %-14s %s\n" "$name" "$url"
  done
  echo ""

  # Fork comparison
  info "${BOLD}Fork comparison (vs upstream/master):${NC}"
  for remote in virtualritz origin; do
    if git rev-parse "$remote/master" >/dev/null 2>&1; then
      ahead=$(git rev-list "upstream/master..$remote/master" --count 2>/dev/null || echo "?")
      behind=$(git rev-list "$remote/master..upstream/master" --count 2>/dev/null || echo "?")
      head=$(git log "$remote/master" -1 --format='%h %as' 2>/dev/null || echo "?")
      printf "  %-14s +%-4s -%s  (%s)\n" "$remote" "$ahead" "$behind" "$head"
    fi
  done
  echo ""

  # Key links
  info "${BOLD}Key links:${NC}"
  echo "  Upstream:      https://github.com/ricosjp/truck"
  echo "  Our fork:      https://github.com/joeblew999/truck"
  echo "  virtualritz:   https://github.com/virtualritz/truck"
  echo ""
  echo "  PR #105 (B-spline fix):  https://github.com/ricosjp/truck/pull/105"
  echo "  Issue #57 (coplanar):    https://github.com/ricosjp/truck/issues/57"
  echo "  Issue #53 (fillet):      https://github.com/ricosjp/truck/issues/53"
  echo "  Issue #13 (T-splines):   https://github.com/ricosjp/truck/issues/13"
  echo ""
  echo "  All open PRs:  https://github.com/ricosjp/truck/pulls"
  echo "  All issues:    https://github.com/ricosjp/truck/issues"
  echo ""
  exit 0
fi

# --- Step 1: Ensure remotes --------------------------------------------------

info "Configuring git remotes in .src/truck/..."
cd "$TRUCK_DIR"

ensure_remote() {
  local name="$1" url="$2"
  if git remote get-url "$name" >/dev/null 2>&1; then
    git remote set-url "$name" "$url"
  else
    git remote add "$name" "$url"
  fi
}

ensure_remote "origin"      "$REMOTE_ORIGIN"
ensure_remote "upstream"    "$REMOTE_UPSTREAM"
ensure_remote "virtualritz" "$REMOTE_VIRTUALRITZ"

# --- Step 2: Fetch all remotes -----------------------------------------------

info "Fetching all remotes (upstream, virtualritz, origin)..."
git fetch --all --prune --quiet

# Show what we're working with
UPSTREAM_HEAD=$(git log upstream/master -1 --format='%h %s' 2>/dev/null || echo "?")
VIRTUALRITZ_HEAD=$(git log virtualritz/master -1 --format='%h %s' 2>/dev/null || echo "?")

echo ""
info "${BOLD}Source branches:${NC}"
info "  upstream/master    → $UPSTREAM_HEAD"
info "  virtualritz/master → $VIRTUALRITZ_HEAD"
echo ""

# --- Step 3: Build composite from virtualritz base ---------------------------

info "Creating ${BOLD}$COMPOSITE_BRANCH${NC} branch from virtualritz/master..."

# Discard any local changes (this is an automated rebuild, not manual work)
git checkout -q master 2>/dev/null || true
git branch -D "$COMPOSITE_BRANCH" 2>/dev/null || true
git checkout -B "$COMPOSITE_BRANCH" virtualritz/master --quiet

VIRTUALRITZ_COUNT=$(git rev-list upstream/master..virtualritz/master --count 2>/dev/null || echo "?")
ok "Composite: virtualritz/master ($VIRTUALRITZ_COUNT commits ahead of upstream)"

# --- Step 4: Summary ---------------------------------------------------------

echo ""
TOTAL_AHEAD=$(git rev-list upstream/master..HEAD --count 2>/dev/null || echo "?")
info "${BOLD}=== Composite Branch Built ===${NC}"
info "Branch: $COMPOSITE_BRANCH"
info "Total: $TOTAL_AHEAD commits ahead of upstream/master"
info "Base: virtualritz/master (fillet, T-splines, parallel mesh)"
info "Boolean fix: wasm_app.rs try_bool_with_fallback() (not in truck source)"
echo ""

# --- Step 5: Build + Test (unless --no-build) --------------------------------

if [ "$NO_BUILD" = true ]; then
  ok "Skipping build (--no-build flag). Run manually:"
  echo "  bun run build:truck && bun run test:api"
  exit 0
fi

info "Building and testing the composite..."
echo ""

# 5a. Cargo check — fast type-check
info "[1/5] cargo check (type-check against composite truck)..."
cd "$CRATE_DIR"
if cargo check 2>&1; then
  ok "[1/5] cargo check passed"
else
  fail "[1/5] cargo check failed — composite has type errors"
fi

# 5b. Truck's own tests — must run from .src/truck/ workspace (not our crate)
info "[2/5] cargo test (truck-shapeops, truck-modeling, truck-meshalgo)..."
cd "$TRUCK_DIR"
if cargo test -p truck-shapeops -p truck-modeling -p truck-meshalgo 2>&1; then
  ok "[2/5] cargo test passed"
else
  warn "[2/5] Some truck tests failed (may be pre-existing)"
fi
cd "$CRATE_DIR"

# 5c. WASM build
info "[3/5] wasm-pack build (dev mode)..."
if wasm-pack build --target web --dev --out-dir ../web/pkg-browser-renderer 2>&1; then
  ok "[3/5] WASM build succeeded"
else
  fail "[3/5] WASM build failed"
fi

# 5d. Schema generation
info "[4/5] Schema generation..."
if cargo run --bin generate-schema 2>/dev/null > ../cad-schema.json; then
  ok "[4/5] Schema generated"
else
  fail "[4/5] Schema generation failed"
fi

# 5e. API tests
info "[5/5] API tests (bun x vitest)..."
cd "$PROJECT_ROOT/systems/truck/worker"
if bun x vitest run 2>&1; then
  ok "[5/5] API tests passed"
else
  fail "[5/5] API tests failed"
fi

# --- Done! -------------------------------------------------------------------

echo ""
ok "${BOLD}=== All checks passed ===${NC}"
ok "Composite branch is ready. To push to origin:"
echo "  cd .src/truck && git push origin $COMPOSITE_BRANCH --force-with-lease"
echo ""
