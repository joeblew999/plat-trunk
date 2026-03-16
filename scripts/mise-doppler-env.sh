#!/usr/bin/env bash
# Inject secrets from Doppler into the mise environment.
# Sourced by mise via [env] _.source in .mise.toml.
#
# Human devs:   doppler login + doppler setup (one-time) — then this just works
# CI/container: set DOPPLER_TOKEN env var before running mise

if ! command -v doppler &>/dev/null; then
  echo "⚠ doppler not found — install: brew install dopplerhq/cli/doppler" >&2
  exit 0
fi

_project="plat-trunk"
_config="dev"

_download() {
  doppler secrets download --no-file --format env \
    --project "$_project" --config "$_config" "$@" 2>/dev/null
}

if [ -n "${DOPPLER_TOKEN:-}" ]; then
  # CI / container: use service token
  eval "$(_download --token "$DOPPLER_TOKEN")"
elif doppler configure get project --silent 2>/dev/null | grep -q "$_project"; then
  # Human dev: already configured
  eval "$(_download)"
else
  echo "⚠ doppler not set up — run: doppler setup" >&2
fi
