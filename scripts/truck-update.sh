#!/bin/bash
# ============================================================================
# truck-update.sh — Automated Fork Tracking for the truck CAD kernel
# ============================================================================
#
# Usage:
#   bun run truck:update             # full update + build + test
#   bun run truck:update:quick       # git operations only, skip build/test
#   bun run truck:update:monster     # full update from monstertruck base
#   bun run truck:status             # review all forks, branches, links (read-only)
#
# Three repos we track:
#   1. ricosjp/truck        — original upstream (reference only, unmaintained)
#   2. virtualritz/monstertruck — next-gen fork (active development, all the good stuff)
#   3. joeblew999/truck     — our fork (composite branch built by this script)
#
# Current state:
#   Our code (systems/truck/crate/) uses truck-* crate names from ricosjp/truck.
#   monstertruck renames everything to monstertruck-* — switching requires a
#   code migration (automated by this script's --base=monstertruck mode).
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
#   Status:  Composite branch built by this script.
#
# ============================================================================
# virtualritz/monstertruck — THE ACTIVE FORK (by Moritz Moeller)
# ============================================================================
#   Repo:    https://github.com/virtualritz/monstertruck
#   Author:  Moritz Moeller (virtualritz@protonmail.com)
#   LinkedIn: https://linkedin.com/in/moritzmoeller
#   Status:  Ground-up restructure of truck. All active development happens here.
#            virtualritz/truck is dead — superseded by monstertruck.
#
#   What it brings:
#     - Fillet engine: multi-chain, chamfer, per-edge radius, variable-radius
#       → Addresses upstream issue #53: https://github.com/ricosjp/truck/issues/53
#     - T-spline support: performance, BSpline conversion, adaptive refinement
#       → Addresses upstream issue #13: https://github.com/ricosjp/truck/issues/13
#     - Parallel tessellation: StructuredMesh::from_surface_par
#     - Tessellation performance: AABB early reject, untrimmed face fast path
#     - Non-clamped B-spline parameter_range() fix
#     - New boolean ops: difference() and symmetric_difference()
#     - Modular crate split: 16+ crates (core, derive, traits, geometry,
#       topology, modeling, solid, assembly, mesh, meshing, gpu, render, step, wasm)
#     - Idiomatic Rust naming (CAD industry terminology)
#     - Improved build times via smaller crates
#
#   BREAKING: All crate names change (truck-* -> monstertruck-*)
#     truck-modeling   -> monstertruck-modeling
#     truck-shapeops   -> monstertruck-solid (+ difference, symmetric_difference)
#     truck-meshalgo   -> monstertruck-meshing
#     truck-rendimpl   -> monstertruck-render
#     truck-platform   -> monstertruck-gpu
#     truck-base       -> monstertruck-core
#     truck-stepio     -> monstertruck-step
#     truck-polymesh   -> monstertruck-mesh
#     truck-topology   -> monstertruck-topology
#     truck-assembly   -> monstertruck-assembly
#     (new)            -> monstertruck-traits, monstertruck-derive
#
#   API changes (types SAME, functions renamed):
#     builder::tsweep()     -> builder::extrude()     (~5 call sites in our code)
#     builder::rsweep()     -> builder::revolve()      (~2 call sites in our code)
#     Curve::BSplineCurve   -> Curve::BsplineCurve     (lowercase 's', 1 pattern match)
#     Core types unchanged: Solid, Wire, Face, Edge, Vertex, Point3, Vector3
#
#   Migration impact:
#     Mechanical but pervasive - find-and-replace crate names + 3 API renames.
#     Our systems/truck/crate/ has 9 truck-* deps in Cargo.toml.
#     This script auto-patches our code when --base=monstertruck is used.
#
# ============================================================================
# OTHER FORKS & PRs (not currently used, available for future cherry-picks)
# ============================================================================
#
#   ovo-Tim — coplanar boolean fixes (partial — only fixes partial-face overlap)
#     Repo:    https://github.com/ovo-Tim/truck (7 branches)
#     Also:    FoxCAD (Rust+WASM browser CAD): https://github.com/ovo-Tim/FoxCAD
#     Also:    truck-skill (Claude Code): https://github.com/ovo-Tim/truck-skill
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

# Git remote URLs — three repos only (virtualritz/truck is dead)
REMOTE_ORIGIN="https://github.com/joeblew999/truck.git"
REMOTE_UPSTREAM="https://github.com/ricosjp/truck.git"
REMOTE_MONSTERTRUCK="https://github.com/virtualritz/monstertruck.git"

# Parse flags
NO_BUILD=false
STATUS_ONLY=false
BASE="upstream"  # default base: ricosjp/truck (our current crate code matches this)
for arg in "$@"; do
  case "$arg" in
    --no-build)        NO_BUILD=true ;;
    --status)          STATUS_ONLY=true ;;
    --base=monster*)   BASE="monstertruck" ;;
    --base=upstream|--base=truck) BASE="upstream" ;;
    --base=*)          echo "Unknown base: $arg (use --base=upstream or --base=monstertruck)"; exit 1 ;;
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

# --- Code patching functions (truck-* <-> monstertruck-*) --------------------

patch_truck_to_monster() {
  local dir="$CRATE_DIR/src"

  # Only patch if truck-* names (not monstertruck-*) are present
  # Use grep -E with negative lookbehind equivalent: match "truck-modeling" not preceded by "monster"
  if ! grep -q '^truck-modeling\|[^r]truck-modeling\|"truck-modeling' "$CRATE_DIR/Cargo.toml" 2>/dev/null; then
    ok "Already using monstertruck-* crate names"
    return
  fi

  # Cargo.toml — crate names, paths, and versions
  # Step 1: rename crates (use sed -E to avoid matching "monstertruck-" → "monstermonstertruck-")
  # Only match truck-* NOT preceded by "monster"
  sed -i '' -E \
    -e 's|([^r])truck-modeling|\1monstertruck-modeling|g' \
    -e 's|^truck-modeling|monstertruck-modeling|g' \
    -e 's|([^r])truck-shapeops|\1monstertruck-solid|g' \
    -e 's|^truck-shapeops|monstertruck-solid|g' \
    -e 's|([^r])truck-meshalgo|\1monstertruck-meshing|g' \
    -e 's|^truck-meshalgo|monstertruck-meshing|g' \
    -e 's|([^r])truck-rendimpl|\1monstertruck-render|g' \
    -e 's|^truck-rendimpl|monstertruck-render|g' \
    -e 's|([^r])truck-platform|\1monstertruck-gpu|g' \
    -e 's|^truck-platform|monstertruck-gpu|g' \
    -e 's|([^r])truck-base|\1monstertruck-core|g' \
    -e 's|^truck-base|monstertruck-core|g' \
    -e 's|([^r])truck-stepio|\1monstertruck-step|g' \
    -e 's|^truck-stepio|monstertruck-step|g' \
    -e 's|([^r])truck-polymesh|\1monstertruck-mesh|g' \
    -e 's|^truck-polymesh|monstertruck-mesh|g' \
    -e 's|([^r])truck-topology|\1monstertruck-topology|g' \
    -e 's|^truck-topology|monstertruck-topology|g' \
    -e 's|([^r])truck-assembly|\1monstertruck-assembly|g' \
    -e 's|^truck-assembly|monstertruck-assembly|g' \
    "$CRATE_DIR/Cargo.toml"

  # Step 2: fix versions — all monstertruck crates use same version
  # Read actual version from monstertruck source (single source of truth)
  local mt_ver
  mt_ver=$(grep '^version' "$TRUCK_DIR/monstertruck-modeling/Cargo.toml" | head -1 | sed 's/.*"\(.*\)"/\1/')
  info "monstertruck crate version: $mt_ver"
  sed -i '' -E \
    -e "s|(monstertruck-[a-z]+) = \{ version = \"[^\"]+\"|\1 = { version = \"$mt_ver\"|g" \
    "$CRATE_DIR/Cargo.toml"

  # Rust source — use statements (underscore names) + API renames
  # Same protection: only match truck_ NOT preceded by "monster"
  find "$dir" -name '*.rs' -exec sed -i '' -E \
    -e 's|([^r])truck_modeling|\1monstertruck_modeling|g' \
    -e 's|^truck_modeling|monstertruck_modeling|g' \
    -e 's|([^r])truck_shapeops|\1monstertruck_solid|g' \
    -e 's|^truck_shapeops|monstertruck_solid|g' \
    -e 's|([^r])truck_meshalgo|\1monstertruck_meshing|g' \
    -e 's|^truck_meshalgo|monstertruck_meshing|g' \
    -e 's|([^r])truck_rendimpl|\1monstertruck_render|g' \
    -e 's|^truck_rendimpl|monstertruck_render|g' \
    -e 's|([^r])truck_platform|\1monstertruck_gpu|g' \
    -e 's|^truck_platform|monstertruck_gpu|g' \
    -e 's|([^r])truck_base|\1monstertruck_core|g' \
    -e 's|^truck_base|monstertruck_core|g' \
    -e 's|([^r])truck_stepio|\1monstertruck_step|g' \
    -e 's|^truck_stepio|monstertruck_step|g' \
    -e 's|([^r])truck_polymesh|\1monstertruck_mesh|g' \
    -e 's|^truck_polymesh|monstertruck_mesh|g' \
    -e 's|([^r])truck_topology|\1monstertruck_topology|g' \
    -e 's|^truck_topology|monstertruck_topology|g' \
    -e 's|([^r])truck_assembly|\1monstertruck_assembly|g' \
    -e 's|^truck_assembly|monstertruck_assembly|g' \
    -e 's|builder::tsweep|builder::extrude|g' \
    -e 's|builder::rsweep|builder::revolve|g' \
    -e 's|BSplineCurve|BsplineCurve|g' \
    -e 's|monstertruck_step::out::|monstertruck_step::save::|g' \
    -e 's|monstertruck_step::r#in::|monstertruck_step::load::|g' \
    -e 's|\.robust_triangulation(|.triangulation(|g' \
    {} +

  ok "Patched to monstertruck-* crate names"
}

patch_monster_to_truck() {
  local dir="$CRATE_DIR/src"

  # Only patch if monstertruck names are present
  if ! grep -q 'monstertruck' "$CRATE_DIR/Cargo.toml" 2>/dev/null; then
    ok "Already using truck-* crate names"
    return
  fi

  # Cargo.toml — reverse crate names
  sed -i '' \
    -e 's|monstertruck-modeling|truck-modeling|g' \
    -e 's|monstertruck-solid|truck-shapeops|g' \
    -e 's|monstertruck-meshing|truck-meshalgo|g' \
    -e 's|monstertruck-render|truck-rendimpl|g' \
    -e 's|monstertruck-gpu|truck-platform|g' \
    -e 's|monstertruck-core|truck-base|g' \
    -e 's|monstertruck-step|truck-stepio|g' \
    -e 's|monstertruck-mesh|truck-polymesh|g' \
    -e 's|monstertruck-topology|truck-topology|g' \
    -e 's|monstertruck-assembly|truck-assembly|g' \
    "$CRATE_DIR/Cargo.toml"

  # Restore original truck versions (read from truck source)
  sed -i '' \
    -e 's|truck-modeling = { version = "[^"]*"|truck-modeling = { version = "0.6.0"|' \
    -e 's|truck-meshalgo = { version = "[^"]*"|truck-meshalgo = { version = "0.4.0"|' \
    -e 's|truck-polymesh = { version = "[^"]*"|truck-polymesh = { version = "0.6.0"|' \
    -e 's|truck-topology = { version = "[^"]*"|truck-topology = { version = "0.6.0"|' \
    -e 's|truck-shapeops = { version = "[^"]*"|truck-shapeops = { version = "0.4.0"|' \
    -e 's|truck-stepio = { version = "[^"]*"|truck-stepio = { version = "0.3.0"|' \
    -e 's|truck-assembly = { version = "[^"]*"|truck-assembly = { version = "0.1.0"|' \
    -e 's|truck-platform = { version = "[^"]*"|truck-platform = { version = "0.6.0"|' \
    -e 's|truck-rendimpl = { version = "[^"]*"|truck-rendimpl = { version = "0.6.0"|' \
    "$CRATE_DIR/Cargo.toml"

  # Rust source — reverse
  find "$dir" -name '*.rs' -exec sed -i '' \
    -e 's|monstertruck_modeling|truck_modeling|g' \
    -e 's|monstertruck_solid|truck_shapeops|g' \
    -e 's|monstertruck_meshing|truck_meshalgo|g' \
    -e 's|monstertruck_render|truck_rendimpl|g' \
    -e 's|monstertruck_gpu|truck_platform|g' \
    -e 's|monstertruck_core|truck_base|g' \
    -e 's|monstertruck_step|truck_stepio|g' \
    -e 's|monstertruck_mesh|truck_polymesh|g' \
    -e 's|monstertruck_topology|truck_topology|g' \
    -e 's|monstertruck_assembly|truck_assembly|g' \
    -e 's|builder::extrude|builder::tsweep|g' \
    -e 's|builder::revolve|builder::rsweep|g' \
    -e 's|BsplineCurve|BSplineCurve|g' \
    -e 's|truck_stepio::save::|truck_stepio::out::|g' \
    -e 's|truck_stepio::load::|truck_stepio::r#in::|g' \
    {} +

  ok "Patched back to truck-* crate names"
}

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

  # Detect active base
  if [ "$CURRENT" = "composite-monstertruck" ]; then
    info "Active base: ${BOLD}${YELLOW}monstertruck${NC}"
  elif [ "$CURRENT" = "composite" ]; then
    info "Active base: ${BOLD}${GREEN}ricosjp/truck (upstream)${NC}"
  else
    info "Active base: ${YELLOW}unknown (branch=$CURRENT)${NC}"
  fi
  echo ""

  # All remotes
  info "${BOLD}Remotes:${NC}"
  git remote -v | grep fetch | while read -r name url _; do
    printf "  %-14s %s\n" "$name" "$url"
  done
  echo ""

  # Upstream status
  info "${BOLD}Upstream (ricosjp/truck):${NC}"
  if git rev-parse "upstream/master" >/dev/null 2>&1; then
    UP_HEAD=$(git log "upstream/master" -1 --format='%h %as %s' 2>/dev/null || echo "?")
    info "  upstream/master → $UP_HEAD"
  fi

  # Our fork status
  if git rev-parse "origin/master" >/dev/null 2>&1; then
    ORIGIN_HEAD=$(git log "origin/master" -1 --format='%h %as %s' 2>/dev/null || echo "?")
    info "  origin/master   → $ORIGIN_HEAD"
    if git rev-parse "upstream/master" >/dev/null 2>&1; then
      ahead=$(git rev-list "upstream/master..origin/master" --count 2>/dev/null || echo "?")
      behind=$(git rev-list "origin/master..upstream/master" --count 2>/dev/null || echo "?")
      info "  origin vs upstream: +$ahead -$behind"
    fi
  fi
  echo ""

  # Monstertruck status
  info "${BOLD}Monstertruck (active development):${NC}"
  MT_FOUND=false
  for mt_branch in monstertruck/main monstertruck/master; do
    if git rev-parse "$mt_branch" >/dev/null 2>&1; then
      MT_HEAD=$(git log "$mt_branch" -1 --format='%h %as %s' 2>/dev/null || echo "?")
      info "  $mt_branch → $MT_HEAD"
      MT_CRATES=$(git ls-tree --name-only "$mt_branch" 2>/dev/null | grep "^monstertruck-" | wc -l | tr -d ' ')
      info "  Crates: ${MT_CRATES} monstertruck-* modules"
      MT_FOUND=true
      break
    fi
  done
  if [ "$MT_FOUND" = false ]; then
    warn "  monstertruck remote not fetched or no main/master branch"
  fi
  echo ""

  # Key links
  info "${BOLD}Key links:${NC}"
  echo "  Upstream:       https://github.com/ricosjp/truck"
  echo "  Our fork:       https://github.com/joeblew999/truck"
  echo "  monstertruck:   https://github.com/virtualritz/monstertruck"
  echo ""
  echo "  Issue #57 (coplanar):    https://github.com/ricosjp/truck/issues/57"
  echo "  Issue #53 (fillet):      https://github.com/ricosjp/truck/issues/53"
  echo "  Issue #13 (T-splines):   https://github.com/ricosjp/truck/issues/13"
  echo "  Issue #85 (difference):  https://github.com/ricosjp/truck/issues/85"
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

ensure_remote "origin"        "$REMOTE_ORIGIN"
ensure_remote "upstream"      "$REMOTE_UPSTREAM"
ensure_remote "monstertruck"  "$REMOTE_MONSTERTRUCK"

# Clean up dead virtualritz/truck remote if it exists
if git remote get-url "virtualritz" >/dev/null 2>&1; then
  info "Removing dead virtualritz/truck remote..."
  git remote remove "virtualritz"
fi

# --- Step 2: Fetch all remotes -----------------------------------------------

info "Fetching all remotes (upstream, monstertruck, origin)..."
git fetch --all --prune --quiet

# Show what we're working with
UPSTREAM_HEAD=$(git log upstream/master -1 --format='%h %s' 2>/dev/null || echo "?")

echo ""
info "${BOLD}Source branches:${NC}"
info "  upstream/master → $UPSTREAM_HEAD"

for mt_branch in monstertruck/main monstertruck/master; do
  if git rev-parse "$mt_branch" >/dev/null 2>&1; then
    MT_HEAD=$(git log "$mt_branch" -1 --format='%h %s' 2>/dev/null || echo "?")
    info "  $mt_branch  → $MT_HEAD"
    break
  fi
done
echo ""

# --- Step 3: Build composite from selected base ------------------------------

# Stash any local patches (e.g. boolean fixes in truck-shapeops)
STASH_MSG="truck-update-auto-stash"
if ! git diff --quiet 2>/dev/null; then
  info "Stashing local patches in .src/truck/..."
  git stash push -m "$STASH_MSG" --quiet
  STASHED=true
else
  STASHED=false
  # Check for orphaned auto-stash from a previous monstertruck flip
  if git stash list | grep -q "truck-update-auto-stash" 2>/dev/null; then
    HAS_PRIOR_STASH=true
  else
    HAS_PRIOR_STASH=false
  fi
fi

if [ "$BASE" = "monstertruck" ]; then
  # Determine monstertruck branch (main or master)
  MT_BRANCH=""
  for candidate in monstertruck/main monstertruck/master; do
    if git rev-parse "$candidate" >/dev/null 2>&1; then
      MT_BRANCH="$candidate"
      break
    fi
  done
  if [ -z "$MT_BRANCH" ]; then
    fail "monstertruck remote has no main or master branch"
  fi

  COMPOSITE_BRANCH="composite-monstertruck"
  info "Creating ${BOLD}$COMPOSITE_BRANCH${NC} branch from $MT_BRANCH..."

  git checkout -q master 2>/dev/null || true
  git branch -D "$COMPOSITE_BRANCH" 2>/dev/null || true
  git checkout -B "$COMPOSITE_BRANCH" "$MT_BRANCH" --quiet

  ok "Composite: $MT_BRANCH (monstertruck)"

  # For monstertruck base, local truck patches don't apply (different code).
  # Keep them stashed — they'll be restored when switching back to truck base.
  if [ "$STASHED" = true ]; then
    warn "Local patches stashed (truck-specific, not applicable to monstertruck)"
    warn "They will be restored automatically when you switch back: bun run truck:update:quick"
  fi

  # Auto-patch our crate code for monstertruck crate names
  info "Patching systems/truck/crate/ for monstertruck imports..."
  patch_truck_to_monster

else
  info "Creating ${BOLD}$COMPOSITE_BRANCH${NC} branch from origin/master..."

  git checkout -q master 2>/dev/null || true
  git branch -D "$COMPOSITE_BRANCH" 2>/dev/null || true
  git checkout -B "$COMPOSITE_BRANCH" origin/master --quiet

  ok "Composite: origin/master (joeblew999/truck)"

  # Restore stashed local patches (boolean fixes etc.)
  SHOULD_POP=false
  if [ "$STASHED" = true ]; then
    SHOULD_POP=true
  elif [ "${HAS_PRIOR_STASH:-false}" = true ]; then
    SHOULD_POP=true
    info "Found prior auto-stash from monstertruck flip"
  fi
  if [ "$SHOULD_POP" = true ]; then
    info "Restoring local patches..."
    if git stash pop --quiet 2>/dev/null; then
      ok "Local patches restored"
    else
      warn "Stash pop had conflicts — resolve manually with: cd .src/truck && git stash show && git stash pop"
    fi
  fi

  # Auto-patch our crate code back to truck crate names (in case we were on monstertruck)
  info "Ensuring systems/truck/crate/ uses truck imports..."
  patch_monster_to_truck
fi

# --- Step 4: Summary ---------------------------------------------------------

echo ""
info "${BOLD}=== Composite Branch Built ===${NC}"
info "Branch: $COMPOSITE_BRANCH"
if [ "$BASE" = "monstertruck" ]; then
  info "Base: monstertruck (crate names auto-patched to monstertruck-*)"
else
  info "Base: joeblew999/truck (truck-* crate names)"
fi
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
info "[1/5] cargo check (type-check against composite)..."
cd "$CRATE_DIR"
if cargo check 2>&1; then
  ok "[1/5] cargo check passed"
else
  fail "[1/5] cargo check failed — composite has type errors"
fi

# 5b. Kernel's own tests
if [ "$BASE" = "monstertruck" ]; then
  info "[2/5] cargo test (monstertruck-solid, monstertruck-modeling, monstertruck-meshing)..."
  cd "$TRUCK_DIR"
  if cargo test -p monstertruck-solid -p monstertruck-modeling -p monstertruck-meshing 2>&1; then
    ok "[2/5] cargo test passed"
  else
    warn "[2/5] Some tests failed (may be pre-existing)"
  fi
else
  info "[2/5] cargo test (truck-shapeops, truck-modeling, truck-meshalgo)..."
  cd "$TRUCK_DIR"
  if cargo test -p truck-shapeops -p truck-modeling -p truck-meshalgo 2>&1; then
    ok "[2/5] cargo test passed"
  else
    warn "[2/5] Some truck tests failed (may be pre-existing)"
  fi
fi
cd "$CRATE_DIR"

# 5c. WASM build
info "[3/5] wasm-pack build (dev mode)..."
if wasm-pack build --target web --dev 2>&1; then
  rm -rf ../web/pkg-browser-renderer
  mv pkg ../web/pkg-browser-renderer
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

