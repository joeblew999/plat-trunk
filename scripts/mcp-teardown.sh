#!/bin/bash
# Remove generated MCP settings for AI tools.
#
# Clears configs that mcp-setup.sh generated (Gemini, Cursor).
# Does NOT touch .mcp.json (tracked in git, managed manually).
#
# Run: task truck:mcp:teardown

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# --- Gemini CLI (project-level) ---
GEMINI_CFG="$ROOT_DIR/.gemini/settings.json"
if [ -f "$GEMINI_CFG" ]; then
  echo '{}' > "$GEMINI_CFG"
  echo "  Gemini: cleared $GEMINI_CFG"
fi

# Clean stale truck-cad from Gemini global config
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
CURSOR_CFG="$ROOT_DIR/.cursor/mcp.json"
if [ -f "$CURSOR_CFG" ]; then
  echo '{}' > "$CURSOR_CFG"
  echo "  Cursor: cleared $CURSOR_CFG"
fi

# --- Claude Code ---
# Clean stale local/global overrides that could shadow .mcp.json
if command -v claude &>/dev/null; then
  claude mcp remove truck-cad -s local 2>/dev/null && echo "  Claude: removed local override" || true
  claude mcp remove truck-cad -s user 2>/dev/null && echo "  Claude: removed global override" || true
fi

echo "MCP teardown complete. (.mcp.json untouched — tracked in git)"
