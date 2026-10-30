#!/usr/bin/env bash
# Full free gathering journey on production (API).
#
# Required:
#   HOST_EMAIL, HOST_PASSWORD, ATTENDEE_EMAIL, ATTENDEE_PASSWORD
#
# Optional:
#   API_BASE, RUN_SIGNUP_SMOKE=1 (registers a throwaway account with legal fields)
#
set -euo pipefail

API="${API_BASE:-https://api.epicsexual.com}"

if [[ "${RUN_SIGNUP_SMOKE:-}" == "1" ]]; then
  TS="$(date +%s)"
  TERMS_VERSION="${TERMS_VERSION:-2026-10-30}"
  NEW_EMAIL="pilot-journey-${TS}@example.com"
  echo "== signup smoke =="
  curl -fsS -X POST "$API/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"PilotJourney9!secure\",\"name\":\"Pilot Journey\",\"host\":false,\"confirmedAdult\":true,\"acceptedTermsVersion\":\"$TERMS_VERSION\"}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("token"); print("signup_ok", d["user"]["id"])'
fi

export HOST_EMAIL="${HOST_EMAIL:?HOST_EMAIL required}"
export HOST_PASSWORD="${HOST_PASSWORD:?HOST_PASSWORD required}"
export ATTENDEE_EMAIL="${ATTENDEE_EMAIL:?ATTENDEE_EMAIL required}"
export ATTENDEE_PASSWORD="${ATTENDEE_PASSWORD:?ATTENDEE_PASSWORD required}"

exec "$(dirname "$0")/tier2-prod-smoke.sh"
