#!/usr/bin/env bash
# scripts/smoke-retainer.sh
# Verifies retainer endpoints return expected status codes.
# Run against local dev server (npm run dev) or a deploy.
# Usage: BASE=https://demandsignals.co ./scripts/smoke-retainer.sh

set -u
BASE="${BASE:-http://localhost:3000}"
pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name ($actual)"
    pass=$((pass+1))
  else
    echo "FAIL  $name (expected $expected, got $actual)"
    fail=$((fail+1))
  fi
}

status() {
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

echo "Smoke-testing retainer endpoints at $BASE"
echo "---"

# Public reads should 200
check "GET /api/quote/retainer-plans"       200 "$(status "$BASE/api/quote/retainer-plans")"
check "GET /api/quote/retainer-menu"        200 "$(status "$BASE/api/quote/retainer-menu")"

# Admin reads should 401 without session
check "GET /api/admin/retainer-plans (no auth)"      401 "$(status "$BASE/api/admin/retainer-plans")"
check "POST /api/admin/quotes/FAKE/launch (no auth)" 401 "$(status -X POST "$BASE/api/admin/quotes/FAKE/launch")"

# Retainer PATCH requires body — empty body should 400
check "PATCH /api/quote/retainer (empty body)" 400 "$(status -X PATCH -H 'Content-Type: application/json' -d '{}' "$BASE/api/quote/retainer")"

# Admin UI should redirect unauthenticated to admin-login (307 from middleware)
check "GET /admin/retainer-plans (no auth)" 307 "$(status "$BASE/admin/retainer-plans")"

echo "---"
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
