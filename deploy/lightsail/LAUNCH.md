# Production launch checklist (Lightsail)

## 1. Environment

Copy `deploy/lightsail/.env.production.example` to `.env` on the host and fill secrets.

```bash
./deploy/lightsail/verify-prod-env.sh .env
```

## 2. Stripe (live)

1. Create **live** restricted API key → `STRIPE_SECRET_KEY` in `.env`.
2. Add webhook endpoint: `https://api.<DOMAIN>/stripe/webhook` (events: `checkout.session.completed`, `charge.refunded`, Connect account updates as used by the app).
3. Set `STRIPE_WEBHOOK_SECRET` from the Stripe dashboard.
4. Hosts complete Connect at `/host/stripe` (or `/settings/payouts`).

Until keys are set, paid checkout uses simulation when `stripeConfigured` is false.

## 3. Email (Resend)

1. Verify sending domain in Resend.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `epicsexual <hello@epicsexual.com>`).

Without Resend, password reset and application emails are captured/logged only.

## 4. S3 (avatars & private check-in photos)

1. Create a **private** bucket; block public access.
2. CORS: allow `PUT` from `https://<DOMAIN>` (and `https://www.<DOMAIN>` if used).
3. Set `S3_PHOTO_BUCKET`, `S3_REGION`, and credentials (or instance role if added later).

Without S3, avatars use direct upload to the API and persist under `/app/data` (see `backend-media` volume in prod compose).

## 5. Deploy

```bash
git pull --ff-only origin main
sudo docker compose -f docker-compose.yml -f docker-compose.postgres.yml \
  -f deploy/lightsail/docker-compose.prod.yml --profile postgres up -d --build
```

## 6. Verify

```bash
curl -sS "https://api.<DOMAIN>/healthz/integrations"
ATTENDEE_EMAIL=... ATTENDEE_PASSWORD=... ./scripts/tier2-prod-smoke.sh
```
