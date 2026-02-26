#!/bin/bash
# Remove generated MCP settings for AI tools.
#
# Clears configs that mcp-setup.sh generated (Gemini, Cursor).
# Does NOT touch .mcp.json (tracked in git, managed manually).
#
# Run: task truck:mcp:teardown

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_NAME="$(bun "$ROOT_DIR/scripts/cf-deploy.ts" config worker.name)"

# --- Gemini CLI (project-level) ---
GEMINI_CFG="$ROOT_DIR/.gemini/settings.json"
if [ -f "$GEMINI_CFG" ]; then
  echo '{}' > "$GEMINI_CFG"
  echo "  Gemini: cleared $GEMINI_CFG"
fi

# Clean stale worker name from Gemini global config
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
CURSOR_CFG="$ROOT_DIR/.cursor/mcp.json"
if [ -f "$CURSOR_CFG" ]; then
  echo '{}' > "$CURSOR_CFG"
  echo "  Cursor: cleared $CURSOR_CFG"
fi

# --- Claude Code ---
# Clean stale local/global overrides that could shadow .mcp.json
if command -v claude &>/dev/null; then
  claude mcp remove "$WORKER_NAME" -s local 2>/dev/null && echo "  Claude: removed local override" || true
  claude mcp remove "$WORKER_NAME" -s user 2>/dev/null && echo "  Claude: removed global override" || true
fi

echo "MCP teardown complete. (.mcp.json untouched — tracked in git)"
