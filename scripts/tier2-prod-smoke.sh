#!/usr/bin/env bash
# Tier 2 production smoke (API).
#
# Required for authed checks:
#   ATTENDEE_EMAIL, ATTENDEE_PASSWORD
#
# Optional for full gathering E2E (create → invite → apply → approve → ticket → verify):
#   HOST_EMAIL, HOST_PASSWORD
#
# Optional overrides:
#   API_BASE (default https://api.epicsexual.com)
#   SITE_BASE (default https://epicsexual.com)
set -euo pipefail

API="${API_BASE:-https://api.epicsexual.com}"
SITE="${SITE_BASE:-https://epicsexual.com}"

login_token() {
  local email=$1 password=$2
  curl -fsS "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("token") or d.get("accessToken",""))'
}

echo "== integrations =="
curl -fsS "$API/healthz/integrations" | python3 -m json.tool

if [[ -z "${ATTENDEE_EMAIL:-}" || -z "${ATTENDEE_PASSWORD:-}" ]]; then
  echo "Skip authed checks: set ATTENDEE_EMAIL and ATTENDEE_PASSWORD"
  exit 0
fi

ATT_TOKEN="$(login_token "$ATTENDEE_EMAIL" "$ATTENDEE_PASSWORD")"
if [[ -z "$ATT_TOKEN" ]]; then
  echo "Attendee login failed"
  exit 1
fi

att_auth() { curl -fsS "$@" -H "Authorization: Bearer $ATT_TOKEN"; }

echo "== feed =="
att_auth "$API/social/feed?limit=3" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("items", len(d.get("items") or []))'

echo "== groups discover =="
att_auth "$API/social/discovery?limit=3" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); g=d.get("groups") if isinstance(d,dict) else d; print("groups", len(g or []))'

echo "== messages =="
att_auth "$API/messages/conversations" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("conversations", len(d) if isinstance(d,list) else 0)'

echo "== home public =="
curl -fsS "$API/events" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("events", len(d) if isinstance(d,list) else 0)'
curl -fsS "$API/learn" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("learn", len(d) if isinstance(d,list) else 0)'

if [[ -z "${HOST_EMAIL:-}" || -z "${HOST_PASSWORD:-}" ]]; then
  echo "Tier 2 API smoke OK ($SITE) — set HOST_EMAIL/HOST_PASSWORD for gathering E2E"
  exit 0
fi

HOST_TOKEN="$(login_token "$HOST_EMAIL" "$HOST_PASSWORD")"
if [[ -z "$HOST_TOKEN" ]]; then
  echo "Host login failed"
  exit 1
fi

host_auth() { curl -fsS "$@" -H "Authorization: Bearer $HOST_TOKEN"; }

EVENT_DATE="$(python3 -c 'from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc)+timedelta(days=14)).strftime("%Y-%m-%dT18:00:00.000Z"))')"
SMOKE_TS="$(date +%s)"

echo "== gathering E2E: create event =="
EVENT_JSON="$(host_auth "$API/events" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"Prod smoke $SMOKE_TS\",\"description\":\"tier2-prod-smoke.sh\",\"date\":\"$EVENT_DATE\",\"capacity\":10,\"ticketPriceCents\":0,\"isDiscoveryVisible\":false}")"
EVENT_ID="$(echo "$EVENT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
echo "event_id=$EVENT_ID"

echo "== gathering E2E: publish =="
host_auth -X POST "$API/events/$EVENT_ID/publish" -H 'Content-Type: application/json' >/dev/null

echo "== gathering E2E: invite =="
INVITE_CODE="$(host_auth -X POST "$API/invites/generate/$EVENT_ID" \
  -H 'Content-Type: application/json' \
  -d '{}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])')"
echo "invite_code=$INVITE_CODE"

echo "== gathering E2E: apply =="
APP_JSON="$(att_auth "$API/applications" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"inviteCode\":\"$INVITE_CODE\",\"acceptedCodeOfConduct\":true,\"answers\":{}}")"
APP_ID="$(echo "$APP_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

echo "== gathering E2E: approve =="
host_auth -X PATCH "$API/applications/$APP_ID/decision" \
  -H 'Content-Type: application/json' \
  -d '{"status":"approved"}' >/dev/null

echo "== gathering E2E: ticket =="
TICKET_JSON="$(att_auth -X POST "$API/checkin/mine/$EVENT_ID")"
CHECKIN_TOKEN="$(echo "$TICKET_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')"

echo "== gathering E2E: verify check-in =="
host_auth -X POST "$API/checkin/verify/$CHECKIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' >/dev/null

echo "== gathering E2E: reject reuse =="
if host_auth -X POST "$API/checkin/verify/$CHECKIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' 2>/dev/null; then
  echo "Expected second verify to fail"
  exit 1
fi
echo "second verify rejected (OK)"

echo "Tier 2 API smoke + gathering E2E OK ($SITE) event_id=$EVENT_ID"
