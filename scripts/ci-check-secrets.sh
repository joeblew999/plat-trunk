#!/usr/bin/env bash
# Fail fast if Cloudflare deploy secrets are missing.
# Called by: mise run ci:check-secrets
set -euo pipefail

missing=()
[ -z "${CLOUDFLARE_API_TOKEN:-}" ]  && missing+=("CLOUDFLARE_API_TOKEN")
[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] && missing+=("CLOUDFLARE_ACCOUNT_ID")

if [ ${#missing[@]} -gt 0 ]; then
  for s in "${missing[@]}"; do echo "::error::$s secret is not set"; done
  exit 1
fi

echo "✓ All required secrets present"
