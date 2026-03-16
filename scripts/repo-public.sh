#!/usr/bin/env bash
# scripts/repo-public.sh — pre-flight check then make repo public
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${CYAN}[repo:public]${NC} $*"; }
ok()   { echo -e "${GREEN}[repo:public]${NC} ✓ $*"; }
fail() { echo -e "${RED}[repo:public]${NC} ERROR: $*"; exit 1; }

info "Scanning tracked files for secrets..."

# Patterns that must never appear in tracked files
FOUND=$(git grep -l "ghp_\|CLOUDFLARE_ACCOUNT_ID.*=.*[0-9a-f]\{32\}\|CLOUDFLARE_API_TOKEN.*=.*[A-Za-z0-9]\{40\}" \
  -- . ':!.mise.local.toml.example' ':!.gitignore' 2>/dev/null || true)

if [ -n "$FOUND" ]; then
  fail "potential secrets found in tracked files:\n$FOUND\nFix before going public."
fi
ok "no secrets in tracked files"

info "Making repo public..."
gh repo edit joeblew999/plat-trunk --visibility public --accept-visibility-change-consequences
ok "repo is now public — CI runs on free GitHub Actions tier"
