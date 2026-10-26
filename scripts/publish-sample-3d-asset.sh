#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3010}"
MODEL_FILE="${MODEL_FILE:-samples/3d/neutral-cube.glb}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo "Set ADMIN_EMAIL and ADMIN_PASSWORD for an administrator account." >&2
  exit 1
fi
if [[ ! -f "$MODEL_FILE" ]]; then
  echo "Model file not found: $MODEL_FILE" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

login_body="$(jq -n \
  --arg email "$ADMIN_EMAIL" \
  --arg password "$ADMIN_PASSWORD" \
  '{email: $email, password: $password}')"
login="$(curl --fail-with-body \
  -H 'Content-Type: application/json' \
  -d "$login_body" \
  "$API_BASE_URL/auth/login")"
token="$(jq -r '.token // empty' <<<"$login")"
if [[ -z "$token" ]]; then
  echo "Login succeeded but no token was returned." >&2
  exit 1
fi

title="Neutral Cube $(date +%Y%m%d-%H%M%S)"
create_body="$(jq -n --arg title "$title" '{
  title: $title,
  description: "Neutral animated sample for verifying the 3D asset workflow.",
  category: "Reference",
  tags: ["neutral", "sample", "animated"]
}')"
asset="$(curl --fail-with-body \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "$create_body" \
  "$API_BASE_URL/admin/assets-3d")"
asset_id="$(jq -r '.id' <<<"$asset")"

size_bytes="$(wc -c <"$MODEL_FILE" | tr -d ' ')"
filename="$(basename "$MODEL_FILE")"
upload_body="$(jq -n \
  --arg filename "$filename" \
  --argjson sizeBytes "$size_bytes" \
  '{
    kind: "model",
    filename: $filename,
    contentType: "model/gltf-binary",
    sizeBytes: $sizeBytes
  }')"
signed="$(curl --fail-with-body \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "$upload_body" \
  "$API_BASE_URL/admin/assets-3d/$asset_id/uploads")"
upload_url="$(jq -r '.url' <<<"$signed")"
object_key="$(jq -r '.objectKey' <<<"$signed")"

curl --fail-with-body \
  -X PUT \
  -H 'Content-Type: model/gltf-binary' \
  --data-binary "@$MODEL_FILE" \
  "$upload_url"

complete_body="$(jq -n \
  --arg objectKey "$object_key" \
  --arg filename "$filename" \
  --argjson sizeBytes "$size_bytes" \
  '{
    kind: "model",
    objectKey: $objectKey,
    filename: $filename,
    contentType: "model/gltf-binary",
    sizeBytes: $sizeBytes
  }')"
completed="$(curl --fail-with-body \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "$complete_body" \
  "$API_BASE_URL/admin/assets-3d/$asset_id/uploads/complete")"
if [[ "$(jq -r '.modelFilename // empty' <<<"$completed")" != "$filename" ]]; then
  echo "Upload completed but the API did not accept the model." >&2
  exit 1
fi
echo "Validated model: $filename ($size_bytes bytes)"

published="$(curl --fail-with-body \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d '{}' \
  "$API_BASE_URL/admin/assets-3d/$asset_id/publish")"

slug="$(jq -r '.slug' <<<"$published")"
echo "Published sample asset: $slug"
echo "Catalog API: $API_BASE_URL/assets-3d/$slug"
