# Deploy VelvetKey on AWS Lightsail

Single **Ubuntu + Docker Compose** box: Postgres, Nest backend, Next frontend, **Caddy** for HTTPS.

| URL | Service |
|-----|---------|
| `https://YOUR_DOMAIN` | Frontend |
| `https://www.YOUR_DOMAIN` | Frontend |
| `https://api.YOUR_DOMAIN` | Backend (`/healthz`, Stripe webhooks, etc.) |

## 1. Provision the instance (local machine)

Requires AWS CLI credentials with Lightsail access.

```bash
cd /path/to/epic-sexual
chmod +x deploy/lightsail/provision-lightsail.sh

DOMAIN=epicsexual.com INSTANCE=velvetkey-app \
  LIGHTSAIL_KEY_PAIR=infratest-pilot \
  ./deploy/lightsail/provision-lightsail.sh
```

Defaults: `us-east-1a`, **medium** bundle (4 GB RAM — enough for `docker compose build`).

The script creates a **static IP**, opens **22 / 80 / 443**, and (if `DOMAIN` is set) a **Lightsail DNS zone** with `A` records for `@`, `www`, and `api`.

### Domain at your registrar

If DNS is managed in Lightsail, set the domain’s **nameservers** at your registrar to the four nameservers printed by the script. Propagation can take up to 48 hours; HTTPS certificates from Let’s Encrypt work once `api.` and apex resolve to the static IP.

If the domain stays at **Route 53** (or another DNS host), skip Lightsail DNS and create `A` records for `@`, `www`, and `api` → static IP instead.

### GoDaddy (default nameservers)

In **DNS → DNS Records** for your domain:

| Type | Name | Data |
|------|------|------|
| A | `@` | Lightsail static IP |
| A | `api` | same IP |

`www` can stay a **CNAME** to `@` (or add another A record). GoDaddy may prompt **Verify your identity** before saving DNS changes.

## 2. Configure secrets on the server

```bash
ssh -i ~/.ssh/infratest-pilot.pem ubuntu@STATIC_IP

sudo -u ubuntu git clone https://github.com/YOUR_ORG/epic-sexual.git /home/ubuntu/epic-sexual
cd /home/ubuntu/epic-sexual
cp deploy/lightsail/.env.production.example .env
nano .env   # DOMAIN, ACME_EMAIL, AUTH_SECRET, POSTGRES_PASSWORD, Stripe
```

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
```

## 3. Start the stack

```bash
chmod +x deploy/lightsail/bootstrap-server.sh
sudo APP_DIR=/home/ubuntu/epic-sexual ./deploy/lightsail/bootstrap-server.sh
```

Or manually from repo root on the server:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml \
  -f deploy/lightsail/docker-compose.prod.yml --profile postgres up -d --build
```

## 4. Verify

```bash
curl -fsS "https://api.YOUR_DOMAIN/healthz"
```

In the browser: `https://YOUR_DOMAIN` (Community / Learn / Events).

### Stripe (production)

- Webhook URL: `https://api.YOUR_DOMAIN/stripe/webhook` (confirm path in `stripe.controller.ts`).
- Connect return URLs should use `https://YOUR_DOMAIN`.

## 5. Updates

```bash
cd /home/ubuntu/epic-sexual
git pull
docker compose -f docker-compose.yml -f docker-compose.postgres.yml \
  -f deploy/lightsail/docker-compose.prod.yml --profile postgres up -d --build
```

Backend runs TypeORM migrations on startup when `DATABASE_URL` is set.

## Cost sketch

- Lightsail **medium** (~$24/mo) + static IP (included when attached) + domain registration (registrar).

## Troubleshooting

- **502 / certificate errors:** DNS must point to the box before Caddy can issue certs; check `docker compose logs caddy`.
- **Backend exit on start:** `docker compose logs backend` — usually migration or `DATABASE_URL` / password mismatch.
- **Browser API errors:** Rebuild frontend after changing `DOMAIN` (bakes `NEXT_PUBLIC_API_BASE_URL` at build time).
