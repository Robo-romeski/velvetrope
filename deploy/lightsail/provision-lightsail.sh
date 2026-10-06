#!/usr/bin/env bash
# Provision Lightsail VM + static IP + firewall + optional Lightsail DNS zone.
# Usage (from repo root):
#   DOMAIN=epicsexual.com INSTANCE=velvetkey-app ./deploy/lightsail/provision-lightsail.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
AZ="${LIGHTSAIL_AZ:-us-east-1a}"
INSTANCE="${INSTANCE:-velvetkey-app}"
STATIC_IP_NAME="${STATIC_IP_NAME:-${INSTANCE}-ip}"
KEY_PAIR="${LIGHTSAIL_KEY_PAIR:-infratest-pilot}"
BUNDLE="${LIGHTSAIL_BUNDLE:-medium_3_0}"
BLUEPRINT="${LIGHTSAIL_BLUEPRINT:-ubuntu_24_04}"
DOMAIN="${DOMAIN:-}"

echo "Region: $REGION  Instance: $INSTANCE  Bundle: $BUNDLE"

if aws lightsail get-instance --instance-name "$INSTANCE" --region "$REGION" >/dev/null 2>&1; then
  echo "Instance $INSTANCE already exists."
else
  aws lightsail create-instances \
    --region "$REGION" \
    --instance-names "$INSTANCE" \
    --availability-zone "$AZ" \
    --blueprint-id "$BLUEPRINT" \
    --bundle-id "$BUNDLE" \
    --key-pair-name "$KEY_PAIR"
  echo "Waiting for instance to be running..."
  for _ in $(seq 1 60); do
    state="$(aws lightsail get-instance --instance-name "$INSTANCE" --region "$REGION" \
      --query 'instance.state.name' --output text)"
    [[ "$state" == "running" ]] && break
    sleep 5
  done
fi

if ! aws lightsail get-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lightsail allocate-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION"
fi

attached="$(aws lightsail get-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION" \
  --query 'staticIp.isAttached' --output text)"
if [[ "$attached" != "True" ]]; then
  aws lightsail attach-static-ip \
    --static-ip-name "$STATIC_IP_NAME" \
    --instance-name "$INSTANCE" \
    --region "$REGION"
fi

for spec in "22,tcp" "80,tcp" "443,tcp"; do
  port="${spec%,*}"
  proto="${spec#*,}"
  aws lightsail open-instance-public-ports \
    --instance-name "$INSTANCE" \
    --region "$REGION" \
    --port-info "fromPort=${port},toPort=${port},protocol=${proto}" \
    >/dev/null 2>&1 || true
done

IP="$(aws lightsail get-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION" \
  --query 'staticIp.ipAddress' --output text)"
PUBLIC_IP="$(aws lightsail get-instance --instance-name "$INSTANCE" --region "$REGION" \
  --query 'instance.publicIpAddress' --output text)"

echo ""
echo "Instance: $INSTANCE"
echo "Static IP: $IP (public on instance: $PUBLIC_IP)"
echo "SSH: ssh -i ~/.ssh/${KEY_PAIR}.pem ubuntu@${IP}"

if [[ -n "$DOMAIN" ]]; then
  if ! aws lightsail get-domain --domain-name "$DOMAIN" --region "$REGION" >/dev/null 2>&1; then
    aws lightsail create-domain --domain-name "$DOMAIN" --region "$REGION"
    echo "Created Lightsail DNS zone for $DOMAIN"
  fi

  for entry in "@:A" "www:A" "api:A"; do
    name="${entry%%:*}"
    if [[ "$name" == "@" ]]; then
      fqdn="$DOMAIN"
    else
      fqdn="${name}.${DOMAIN}"
    fi
    aws lightsail create-domain-entry \
      --region "$REGION" \
      --domain-name "$DOMAIN" \
      --domain-entry "name=${fqdn},type=A,target=${IP}" \
      2>/dev/null || echo "Domain entry ${fqdn} may already exist (ok)."
  done

  echo ""
  echo "Point your registrar nameservers to Lightsail for $DOMAIN:"
  aws lightsail get-domain --domain-name "$DOMAIN" --region "$REGION" \
    --query 'domain.domainEntries[?type==`NS`].target' --output text | tr '\t' '\n'
fi

echo ""
echo "Next: clone repo on the server, copy deploy/lightsail/.env.production.example to .env, run bootstrap-server.sh"
