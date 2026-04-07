#!/usr/bin/env bash
# Integration test for auth-zano-worker (port 8791).
# Ported from github.com/GonzaloJeria/zanzojs examples/workspace-d1/test.sh
#
# Architecture under test:
#   auth-zano-worker (port 8791) — permission API + filesystem API
#
# All routes are under /zano/* (plat-router forwards /zano/* here).
#
# Permission API:
#   GET  /zano/check      GET  /zano/snapshot
#   PUT  /zano/grant      DELETE /zano/revoke
#   GET  /zano/tuples     GET  /zano/health
#
# Filesystem API (PermissionedBackend — actor via ?actor= or x-actor header):
#   GET/PUT/DELETE /zano/files/*path
#   POST /zano/append/*path
#   GET  /zano/ls/*path        GET  /zano/exists/*path   GET /zano/stat/*path
#   POST /zano/mkdir/*path     DELETE /zano/rmdir/*path
#   GET  /zano/glob            POST /zano/cp  /zano/mv  /zano/cpdir  /zano/mvdir
#
# Run with: mise run test:integration   (from systems/auth-zano/)
#        or: bash systems/auth-zano/test.sh  (from repo root)
set -euo pipefail

BASE="${ZANO_BASE:-http://localhost:8791}"
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS  $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $desc"
    echo "        expected: $expected"
    echo "        got:      $actual"
    FAIL=$((FAIL+1))
  fi
}

grant()  { curl -s -X PUT    "$BASE/zano/grant"  -H "Content-Type: application/json" -d "$1"; }
revoke() { curl -s -X DELETE "$BASE/zano/revoke" -H "Content-Type: application/json" -d "$1"; }

echo ""
echo "=== auth-zano integration tests (port ${BASE}) ==="
echo ""

# ── Health ────────────────────────────────────────────────────────────────────

echo "-- health --"

R=$(curl -s "$BASE/zano/health")
check "health ok" '"ok":true' "$R"

# ── Bootstrap permissions ─────────────────────────────────────────────────────

echo ""
echo "-- bootstrap --"

R=$(grant '{"subject":"User:alice","relation":"owner","type":"Directory","id":"/projects/demo"}')
check "bootstrap alice projects/demo" '"granted"' "$R"

R=$(grant '{"subject":"User:bob","relation":"owner","type":"Directory","id":"/home/bob"}')
check "bootstrap bob home" '"granted"' "$R"

# ── Permission API ────────────────────────────────────────────────────────────

echo ""
echo "-- permission API --"

R=$(grant '{"subject":"User:alice","relation":"owner","type":"Directory","id":"/zanzo-test"}')
check "grant alice zanzo-test" '"granted"' "$R"

R=$(curl -s "$BASE/zano/check?actor=User:alice&action=read&type=Directory&id=/zanzo-test")
check "alice can read zanzo-test" '"allowed":true' "$R"

R=$(curl -s "$BASE/zano/check?actor=User:bob&action=read&type=Directory&id=/zanzo-test")
check "bob denied zanzo-test" '"allowed":false' "$R"

R=$(curl -s "$BASE/zano/snapshot?actor=User:alice")
check "snapshot has snapshot key" '"snapshot"' "$R"
check "snapshot has actor key" '"actor"' "$R"

R=$(revoke '{"subject":"User:alice","relation":"owner","type":"Directory","id":"/zanzo-test"}')
check "revoke alice zanzo-test" '"revoked"' "$R"

R=$(curl -s "$BASE/zano/check?actor=User:alice&action=read&type=Directory&id=/zanzo-test")
check "alice denied zanzo-test after revoke" '"allowed":false' "$R"

# ── Filesystem ────────────────────────────────────────────────────────────────

echo ""
echo "-- filesystem --"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/notes.txt?actor=User:alice" -d "hello from alice")
check "alice writes file" '"written"' "$R"

python3 -c "import sys; sys.stdout.buffer.write(b'x' * 2097152)" > /tmp/zanzo-big.bin
R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/big.bin?actor=User:alice" --data-binary @/tmp/zanzo-big.bin)
check "alice writes 2MB file (spills to R2)" '"written"' "$R"
rm -f /tmp/zanzo-big.bin

R=$(curl -s "$BASE/zano/files/projects/demo/notes.txt?actor=User:alice")
check "alice reads file" "hello from alice" "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/notes.txt?actor=User:bob")
check "bob denied before share" '"error"' "$R"

R=$(grant '{"subject":"User:bob","relation":"viewer","type":"File","id":"/projects/demo/notes.txt"}')
check "alice grants bob viewer" '"granted"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/notes.txt?actor=User:bob")
check "bob reads after grant" "hello from alice" "$R"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/notes.txt?actor=User:bob" -d "bob writes")
check "bob denied write" '"error"' "$R"

R=$(curl -s -X DELETE "$BASE/zano/files/projects/demo/notes.txt?actor=User:bob")
check "bob denied delete" '"error"' "$R"

R=$(curl -s -X DELETE "$BASE/zano/files/projects/demo/notes.txt?actor=User:alice")
check "alice deletes file" '"deleted"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/notes.txt?actor=User:alice")
check "alice read after delete is 404" '"error"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/notes.txt?actor=User:bob")
check "bob read after delete denied" '"error"' "$R"

R=$(curl -s "$BASE/zano/ls/projects/demo?actor=User:alice")
check "alice lists projects/demo" '"entries"' "$R"
check "alice ls contains big.bin" 'big.bin' "$R"

R=$(curl -s "$BASE/zano/ls/projects/demo?actor=User:bob")
check "bob denied ls projects/demo" '"error"' "$R"

R=$(curl -s "$BASE/zano/ls/home/bob?actor=User:bob")
check "bob lists home/bob" '"entries"' "$R"

R=$(curl -s "$BASE/zano/ls/home/bob?actor=User:alice")
check "alice denied ls home/bob" '"error"' "$R"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/intruder.txt?actor=User:carol" -d "hack")
check "carol denied write to alice dir" '"error"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/ghost.txt?actor=User:alice")
check "alice read nonexistent file is 404" '"error"' "$R"

# ── exists / stat ─────────────────────────────────────────────────────────────

echo ""
echo "-- exists / stat --"

R=$(curl -s "$BASE/zano/exists/projects/demo/big.bin?actor=User:alice")
check "alice exists big.bin (true)" '"exists":true' "$R"

R=$(curl -s "$BASE/zano/exists/projects/demo/nope.txt?actor=User:alice")
check "alice exists nope.txt (false)" '"exists":false' "$R"

R=$(curl -s "$BASE/zano/exists/projects/demo/big.bin?actor=User:bob")
check "bob denied exists" '"error"' "$R"

R=$(curl -s "$BASE/zano/stat/projects/demo/big.bin?actor=User:alice")
check "alice stat big.bin has size" '"size"' "$R"
check "alice stat big.bin is file type" '"file"' "$R"

R=$(curl -s "$BASE/zano/stat/projects/demo/big.bin?actor=User:bob")
check "bob denied stat" '"error"' "$R"

# ── mkdir ─────────────────────────────────────────────────────────────────────

echo ""
echo "-- mkdir --"

R=$(curl -s -X POST "$BASE/zano/mkdir/projects/demo/newdir?actor=User:alice")
check "alice mkdir newdir" '"created"' "$R"

R=$(curl -s "$BASE/zano/exists/projects/demo/newdir?actor=User:alice")
check "newdir exists after mkdir" '"exists":true' "$R"

R=$(curl -s -X POST "$BASE/zano/mkdir/projects/demo/bobdir?actor=User:bob")
check "bob denied mkdir in alice dir" '"error"' "$R"

# ── appendFile ────────────────────────────────────────────────────────────────

echo ""
echo "-- appendFile --"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/log.txt?actor=User:alice" -d "line1")
check "alice writes log.txt" '"written"' "$R"

R=$(curl -s -X POST "$BASE/zano/append/projects/demo/log.txt?actor=User:alice" -d $'\nline2')
check "alice appends to log.txt" '"appended"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/log.txt?actor=User:alice")
check "log.txt contains both lines" 'line2' "$R"

R=$(curl -s -X POST "$BASE/zano/append/projects/demo/log.txt?actor=User:bob")
check "bob denied append" '"error"' "$R"

# ── glob ──────────────────────────────────────────────────────────────────────

echo ""
echo "-- glob --"

R=$(curl -s "$BASE/zano/glob?pattern=projects/demo/**&actor=User:alice")
check "alice glob finds files" '"matches"' "$R"
check "alice glob includes log.txt" 'log.txt' "$R"

R=$(curl -s "$BASE/zano/glob?pattern=**/*&actor=User:bob")
check "bob can glob (paths only, no content)" '"matches"' "$R"

# ── copyDir / moveDir ─────────────────────────────────────────────────────────

echo ""
echo "-- copyDir / moveDir --"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/newdir/a.txt?actor=User:alice" -d "aaa")
check "alice writes newdir/a.txt" '"written"' "$R"

R=$(curl -s -X POST "$BASE/zano/cpdir?actor=User:alice" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/newdir","to":"/projects/demo/copydir"}')
check "alice copies directory" '"copied"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/copydir/a.txt?actor=User:alice")
check "copydir/a.txt has correct content" 'aaa' "$R"

R=$(curl -s -X POST "$BASE/zano/mvdir?actor=User:alice" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/copydir","to":"/projects/demo/moveddir"}')
check "alice moves directory" '"moved"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/moveddir/a.txt?actor=User:alice")
check "moveddir/a.txt has correct content" 'aaa' "$R"

R=$(curl -s "$BASE/zano/exists/projects/demo/copydir?actor=User:alice")
check "copydir gone after moveDir" '"exists":false' "$R"

R=$(curl -s -X POST "$BASE/zano/cpdir?actor=User:bob" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/newdir","to":"/projects/demo/bobcopy"}')
check "bob denied copyDir" '"error"' "$R"

R=$(curl -s -X POST "$BASE/zano/mvdir?actor=User:bob" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/newdir","to":"/projects/demo/bobmove"}')
check "bob denied moveDir" '"error"' "$R"

# ── cp (copyFile) ─────────────────────────────────────────────────────────────

echo ""
echo "-- cp (copyFile) --"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/original.txt?actor=User:alice" -d "original content")
check "alice writes original.txt" '"written"' "$R"

R=$(curl -s -X POST "$BASE/zano/cp?actor=User:alice" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/original.txt","to":"/projects/demo/copy.txt"}')
check "alice copies file" '"copied"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/copy.txt?actor=User:alice")
check "copied file has correct content" "original content" "$R"

R=$(grant '{"subject":"User:bob","relation":"viewer","type":"File","id":"/projects/demo/original.txt"}')
check "grant bob viewer on original.txt" '"granted"' "$R"

R=$(curl -s -X POST "$BASE/zano/cp?actor=User:bob" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/original.txt","to":"/projects/demo/bob-copy.txt"}')
check "bob denied cp (no write on dest)" '"error"' "$R"

# ── mv (moveFile) ─────────────────────────────────────────────────────────────

echo ""
echo "-- mv (moveFile) --"

R=$(curl -s -X POST "$BASE/zano/mv?actor=User:alice" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/copy.txt","to":"/projects/demo/moved.txt"}')
check "alice moves file" '"moved"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/moved.txt?actor=User:alice")
check "moved file has correct content" "original content" "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/copy.txt?actor=User:alice")
check "old path gone after mv" '"error"' "$R"

R=$(curl -s -X POST "$BASE/zano/mv?actor=User:bob" -H "Content-Type: application/json" \
  -d '{"from":"/projects/demo/original.txt","to":"/projects/demo/bob-moved.txt"}')
check "bob denied mv (no delete on src)" '"error"' "$R"

# ── deleteDir ─────────────────────────────────────────────────────────────────

echo ""
echo "-- deleteDir --"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/subdir/file1.txt?actor=User:alice" -d "file1")
check "alice writes subdir/file1.txt" '"written"' "$R"

R=$(curl -s -X PUT "$BASE/zano/files/projects/demo/subdir/file2.txt?actor=User:alice" -d "file2")
check "alice writes subdir/file2.txt" '"written"' "$R"

R=$(curl -s -X DELETE "$BASE/zano/rmdir/projects/demo/subdir?actor=User:bob")
check "bob denied deleteDir" '"error"' "$R"

R=$(curl -s -X DELETE "$BASE/zano/rmdir/projects/demo/subdir?actor=User:carol")
check "carol denied deleteDir" '"error"' "$R"

R=$(curl -s -X DELETE "$BASE/zano/rmdir/projects/demo/subdir?actor=User:alice")
check "alice deletes subdir recursively" '"deleted"' "$R"

R=$(curl -s "$BASE/zano/files/projects/demo/subdir/file1.txt?actor=User:alice")
check "file1.txt gone after deleteDir" '"error"' "$R"

# ── Domain permissions (CadModel, Drone, Project) ─────────────────────────────

echo ""
echo "-- domain permissions (CadModel, Drone, Project) --"

R=$(grant '{"subject":"Agent:claude-mcp","relation":"editor","type":"CadModel","id":"abc123"}')
check "grant agent editor on cadmodel" '"granted"' "$R"

R=$(curl -s "$BASE/zano/check?actor=Agent:claude-mcp&action=execute_command&type=CadModel&id=abc123")
check "agent can execute_command" '"allowed":true' "$R"

R=$(curl -s "$BASE/zano/check?actor=Agent:claude-mcp&action=delete&type=CadModel&id=abc123")
check "agent cannot delete" '"allowed":false' "$R"

R=$(grant '{"subject":"User:gerard","relation":"operator","type":"Drone","id":"123"}')
check "grant gerard operator on drone" '"granted"' "$R"

R=$(curl -s "$BASE/zano/check?actor=User:gerard&action=execute_command&type=Drone&id=123")
check "gerard can execute drone command" '"allowed":true' "$R"

R=$(revoke '{"subject":"Agent:claude-mcp","relation":"editor","type":"CadModel","id":"abc123"}')
check "revoke agent editor" '"revoked"' "$R"

R=$(curl -s "$BASE/zano/check?actor=Agent:claude-mcp&action=execute_command&type=CadModel&id=abc123")
check "agent denied after revoke" '"allowed":false' "$R"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "=== $PASS passed, $FAIL failed ==="
echo ""
[ "$FAIL" -eq 0 ]
