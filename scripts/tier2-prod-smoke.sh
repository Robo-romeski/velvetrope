#!/usr/bin/env bash
# Tier 2 production smoke (API). Requires ATTENDEE_EMAIL, ATTENDEE_PASSWORD env vars.
set -euo pipefail

API="${API_BASE:-https://api.epicsexual.com}"
SITE="${SITE_BASE:-https://epicsexual.com}"

echo "== integrations =="
curl -fsS "$API/healthz/integrations" | head -c 500
echo

if [[ -z "${ATTENDEE_EMAIL:-}" || -z "${ATTENDEE_PASSWORD:-}" ]]; then
  echo "Skip authed checks: set ATTENDEE_EMAIL and ATTENDEE_PASSWORD"
  exit 0
fi

TOKEN="$(
  curl -fsS "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ATTENDEE_EMAIL\",\"password\":\"$ATTENDEE_PASSWORD\"}" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["accessToken"])'
)"

auth() { curl -fsS "$@" -H "Authorization: Bearer $TOKEN"; }

echo "== feed =="
auth "$API/social/feed?limit=3" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("items", len(d.get("items") or []))'

echo "== groups discover =="
auth "$API/social/discover?limit=3" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("groups", len(d.get("groups") or []))'

echo "== messages =="
auth "$API/messages/conversations" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("conversations", len(d) if isinstance(d,list) else 0)'

echo "== home public =="
curl -fsS "$API/events" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("events", len(d) if isinstance(d,list) else 0)'
curl -fsS "$API/learn" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("learn", len(d) if isinstance(d,list) else 0)'

echo "Tier 2 API smoke OK ($SITE)"
