#!/usr/bin/env bash
# Create private S3 bucket + IAM user for avatars, check-in photos, and 3D assets.
# Usage: ./deploy/lightsail/provision-s3-bucket.sh [bucket-name]
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${1:-epicsexual-private-media-${ACCOUNT_ID}}"
IAM_USER="${IAM_USER:-epicsexual-s3-photos}"
ORIGINS="${CORS_ORIGINS:-https://epicsexual.com,https://www.epicsexual.com}"

echo "Region:  $REGION"
echo "Bucket:  $BUCKET"
echo "IAM user: $IAM_USER"

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket already exists: $BUCKET"
else
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi
  echo "Created bucket $BUCKET"
fi

aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

IFS=',' read -ra ORIGIN_ARR <<< "$ORIGINS"
CORS_ORIGINS_JSON="$(printf '"%s",' "${ORIGIN_ARR[@]}")"
CORS_ORIGINS_JSON="[${CORS_ORIGINS_JSON%,}]"

aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "{
  \"CORSRules\": [{
    \"AllowedHeaders\": [\"*\"],
    \"AllowedMethods\": [\"GET\", \"PUT\", \"HEAD\"],
    \"AllowedOrigins\": $CORS_ORIGINS_JSON,
    \"ExposeHeaders\": [\"ETag\"],
    \"MaxAgeSeconds\": 3600
  }]
}"

POLICY_DOC="$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${BUCKET}/*"
    }
  ]
}
EOF
)"

POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${IAM_USER}-policy"
if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  VERSION="$(aws iam create-policy-version --policy-arn "$POLICY_ARN" \
    --policy-document "$POLICY_DOC" --set-as-default --query 'PolicyVersion.VersionId' --output text)"
  echo "Updated IAM policy $POLICY_ARN ($VERSION)"
else
  POLICY_ARN="$(aws iam create-policy --policy-name "${IAM_USER}-policy" \
    --policy-document "$POLICY_DOC" --query 'Policy.Arn' --output text)"
  echo "Created IAM policy $POLICY_ARN"
fi

if ! aws iam get-user --user-name "$IAM_USER" >/dev/null 2>&1; then
  aws iam create-user --user-name "$IAM_USER" >/dev/null
  echo "Created IAM user $IAM_USER"
fi

aws iam attach-user-policy --user-name "$IAM_USER" --policy-arn "$POLICY_ARN" 2>/dev/null || true

echo ""
echo "=== Add to server .env ==="
echo "S3_PHOTO_BUCKET=$BUCKET"
echo "S3_ASSET_BUCKET=$BUCKET"
echo "S3_REGION=$REGION"
echo ""
echo "Creating a new access key for $IAM_USER (save secret — shown once):"

KEY_JSON="$(aws iam create-access-key --user-name "$IAM_USER" --output json)"
echo "$KEY_JSON" | python3 -c 'import json,sys; k=json.load(sys.stdin)["AccessKey"]; print("S3_ACCESS_KEY_ID="+k["AccessKeyId"]); print("S3_SECRET_ACCESS_KEY="+k["SecretAccessKey"])'

echo ""
echo "Then redeploy backend: docker compose ... up -d --build backend"
echo "Verify: curl -sS https://api.epicsexual.com/healthz/integrations"
