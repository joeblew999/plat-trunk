#!/bin/bash
# Configure MCP settings for AI tools that use the STDIO BRIDGE.
#
# truck-cad uses scripts/mcp-bridge.ts — a standalone stdio MCP server that:
#   - Reads cad-schema.json locally (works even if dev server is down)
#   - Proxies tool calls as HTTP to the dev server with retry/backoff
#   - Survives server restarts (AI never loses MCP connection)
#
# This script generates configs for: Gemini CLI, Cursor.
# Claude Code uses .mcp.json (tracked in git) — NOT managed by this script.
#
# Run: task truck:mcp:setup   (also runs automatically via task truck:gui:serve)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_URL="$(bun "$ROOT_DIR/scripts/cf-deploy.ts" config local.worker)"
WORKER_NAME="$(bun "$ROOT_DIR/scripts/cf-deploy.ts" config worker.name)"

echo "MCP setup: $WORKER_NAME bridge → $LOCAL_URL (from cf-deploy.json)"

# --- Gemini CLI (project-level) ---
GEMINI_CFG="$ROOT_DIR/.gemini/settings.json"
mkdir -p "$(dirname "$GEMINI_CFG")"
cat > "$GEMINI_CFG" << EOF
{
  "mcpServers": {
    "$WORKER_NAME": {
      "command": "$(which bun)",
      "args": ["$ROOT_DIR/scripts/mcp-bridge.ts"]
    },
    "playwright": {
      "command": "$(which bunx)",
      "args": ["-y", "@playwright/mcp@latest", "--config", "$ROOT_DIR/scripts/playwright-mcp-gemini.config.json"]
    }
  }
}
EOF
echo "  Gemini: $GEMINI_CFG (bridge + playwright)"

# Clean stale worker name from Gemini global config (~/.gemini/settings.json).
# Project-level config wins; global entry causes stale-port confusion.
GEMINI_GLOBAL="$HOME/.gemini/settings.json"
if [ -f "$GEMINI_GLOBAL" ] && python3 -c "import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if sys.argv[2] in d.get('mcpServers',{}) else 1)" "$GEMINI_GLOBAL" "$WORKER_NAME" 2>/dev/null; then
  python3 -c "
import json,sys
p=sys.argv[1]; k=sys.argv[2]
d=json.load(open(p))
d.get('mcpServers',{}).pop(k,None)
json.dump(d,open(p,'w'),indent=2)
" "$GEMINI_GLOBAL" "$WORKER_NAME"
  echo "  Gemini: removed stale $WORKER_NAME from $GEMINI_GLOBAL"
fi

# --- Cursor ---
CURSOR_DIR="$ROOT_DIR/.cursor"
if [ -d "$CURSOR_DIR" ]; then
  CURSOR_CFG="$CURSOR_DIR/mcp.json"
  cat > "$CURSOR_CFG" << EOF
{
  "mcpServers": {
    "$WORKER_NAME": {
      "command": "$(which bun)",
      "args": ["$ROOT_DIR/scripts/mcp-bridge.ts"]
    },
    "playwright": {
      "command": "$(which bunx)",
      "args": ["-y", "@playwright/mcp@latest", "--config", "$ROOT_DIR/scripts/playwright-mcp-gemini.config.json"]
    }
  }
}
EOF
  echo "  Cursor: $CURSOR_CFG (bridge + playwright)"
fi

# --- Claude Code ---
# Register at project scope via `claude mcp add` (absolute paths).
# The project .mcp.json uses relative paths for git portability, but Claude Code
# needs absolute paths to resolve correctly when spawning the bridge process.
# ADR-0020: task infrastructure manages this — never hand-edit ~/.claude/mcp.json.
if command -v claude &>/dev/null; then
  # Clean stale scopes first
  claude mcp remove "$WORKER_NAME" -s local 2>/dev/null || true
  claude mcp remove "$WORKER_NAME" -s user 2>/dev/null || true
  # Remove existing project-scope to avoid duplicates, then re-add
  # Unset CLAUDECODE to avoid "nested session" error when running from inside Claude Code
  env -u CLAUDECODE claude mcp remove "$WORKER_NAME" -s project 2>/dev/null || true
  env -u CLAUDECODE claude mcp add "$WORKER_NAME" -s project -- "$(which bun)" "$ROOT_DIR/scripts/mcp-bridge.ts"
  echo "  Claude: project-scope MCP registered (absolute paths, bridge)"
else
  echo "  Claude: 'claude' CLI not found — skipping (use .mcp.json fallback)"
fi

echo "MCP setup complete."
