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
CAD_URL="${CAD_URL:-http://localhost:8788}"

echo "MCP setup: bridge → $CAD_URL"

# --- Gemini CLI (project-level) ---
GEMINI_CFG="$ROOT_DIR/.gemini/settings.json"
mkdir -p "$(dirname "$GEMINI_CFG")"
cat > "$GEMINI_CFG" << EOF
{
  "mcpServers": {
    "truck-cad": {
      "command": "$(which bun)",
      "args": ["$ROOT_DIR/scripts/mcp-bridge.ts"],
      "env": { "CAD_URL": "$CAD_URL" }
    },
    "playwright": {
      "command": "$(which bunx)",
      "args": ["-y", "@playwright/mcp@latest", "--config", "$ROOT_DIR/scripts/playwright-mcp-gemini.config.json"]
    }
  }
}
EOF
echo "  Gemini: $GEMINI_CFG (bridge + playwright)"

# Clean stale truck-cad from Gemini global config (~/.gemini/settings.json).
# Project-level config wins; global truck-cad causes stale-port confusion.
GEMINI_GLOBAL="$HOME/.gemini/settings.json"
if [ -f "$GEMINI_GLOBAL" ] && python3 -c "import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if 'truck-cad' in d.get('mcpServers',{}) else 1)" "$GEMINI_GLOBAL" 2>/dev/null; then
  python3 -c "
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d.get('mcpServers',{}).pop('truck-cad',None)
json.dump(d,open(p,'w'),indent=2)
" "$GEMINI_GLOBAL"
  echo "  Gemini: removed stale truck-cad from $GEMINI_GLOBAL"
fi

# --- Cursor ---
CURSOR_DIR="$ROOT_DIR/.cursor"
if [ -d "$CURSOR_DIR" ]; then
  CURSOR_CFG="$CURSOR_DIR/mcp.json"
  cat > "$CURSOR_CFG" << EOF
{
  "mcpServers": {
    "truck-cad": {
      "command": "$(which bun)",
      "args": ["$ROOT_DIR/scripts/mcp-bridge.ts"],
      "env": { "CAD_URL": "$CAD_URL" }
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
# Claude Code uses .mcp.json (tracked in git) with the SAME stdio bridge as Gemini/Cursor.
# The bridge reads cad-schema.json locally → tools load instantly at session start,
# even if the dev server is down. Calls proxy to HTTP with retry/backoff.
# .mcp.json uses relative paths (no absolute paths) so it's machine-independent.
#
# Clean stale local overrides: if someone ran `claude mcp add truck-cad -s local`
# it writes to ~/.claude.json which can hold stale config. Remove it so .mcp.json wins.
if command -v claude &>/dev/null; then
  if claude mcp get truck-cad -s local 2>/dev/null | grep -q "truck-cad"; then
    claude mcp remove truck-cad -s local 2>/dev/null || true
    echo "  Claude: removed stale local override (truck-cad) from ~/.claude.json"
  fi
  # Also clean global — truck-cad should NEVER be in global config
  if claude mcp get truck-cad -s user 2>/dev/null | grep -q "truck-cad"; then
    claude mcp remove truck-cad -s user 2>/dev/null || true
    echo "  Claude: removed stale global override (truck-cad) from ~/.claude/settings.json"
  fi
fi
echo "  Claude: .mcp.json (tracked, single source of truth)"

echo "MCP setup complete."
