# Production launch checklist (Lightsail)

## 1. Environment

Copy `deploy/lightsail/.env.production.example` to `.env` on the host and fill secrets.

```bash
./deploy/lightsail/verify-prod-env.sh .env
```

## 2. Payments (launch default: free only)

Keep **`PAYMENTS_ENABLED=false`** and **`NEXT_PUBLIC_PAYMENTS_ENABLED=false`** on the host `.env` (see `.env.production.example`). All gatherings stay free; payment nav and routes are hidden (direct URLs 404). Stripe API code remains for a later re-launch.

When you are ready for paid tickets:

1. Finish Stripe Connect platform setup and host onboarding.
2. Set both payment flags to `true` and **rebuild the frontend** (Next.js bakes `NEXT_PUBLIC_*` at build time).
3. Configure live **`STRIPE_SECRET_KEY`** and **`STRIPE_WEBHOOK_SECRET`** (`https://api.<DOMAIN>/stripe/webhook`).

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
