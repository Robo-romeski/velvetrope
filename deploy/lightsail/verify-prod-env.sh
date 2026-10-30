#!/usr/bin/env bash
# Run on the Lightsail host from repo root. Prints which launch keys are set (not values).
set -euo pipefail

ENV_FILE="${1:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

check_key() {
  local key="$1"
  local required="${2:-optional}"
  if grep -q "^${key}=" "$ENV_FILE" && [[ -n "$(grep "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d ' \"')" ]]; then
    echo "  [set] $key"
  elif [[ "$required" == "required" ]]; then
    echo "  [MISSING] $key"
    MISSING=1
  else
    echo "  [empty] $key"
  fi
}

MISSING=0
echo "Launch env check ($ENV_FILE)"
echo "Required:"
check_key DOMAIN required
check_key ACME_EMAIL required
check_key AUTH_SECRET required
check_key POSTGRES_PASSWORD required
echo "Payments (required for live ticket/course sales):"
check_key STRIPE_SECRET_KEY
check_key STRIPE_WEBHOOK_SECRET
echo "Email:"
check_key RESEND_API_KEY
check_key EMAIL_FROM
echo "Analytics (optional — pageviews only when set; rebuild frontend after change):"
check_key NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
check_key NEXT_PUBLIC_POSTHOG_HOST
check_key NEXT_PUBLIC_POSTHOG_APP_LABEL
echo "Media (avatars / check-in photos; optional — uses local disk if empty):"
check_key S3_PHOTO_BUCKET
check_key S3_REGION
check_key S3_ACCESS_KEY_ID
check_key S3_SECRET_ACCESS_KEY

if [[ "$MISSING" -eq 1 ]]; then
  exit 1
fi
echo "Core required keys present."
