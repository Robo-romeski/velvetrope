#!/usr/bin/env bash
# Run on a fresh Ubuntu Lightsail instance (as root or with sudo).
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker ubuntu || true
fi

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin || true
fi

APP_DIR="${APP_DIR:-/home/ubuntu/epic-sexual}"
if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Clone the repo into $APP_DIR first, then re-run."
  echo "  sudo -u ubuntu git clone <your-repo-url> $APP_DIR"
  exit 1
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "Create $APP_DIR/.env from deploy/lightsail/.env.production.example"
  exit 1
fi

cd "$APP_DIR"
docker compose -f docker-compose.yml -f docker-compose.postgres.yml \
  -f deploy/lightsail/docker-compose.prod.yml --profile postgres up -d --build

echo "Stack started. After DNS propagates, check https://${DOMAIN:-your-domain}/ and https://api.${DOMAIN:-your-domain}/healthz"
