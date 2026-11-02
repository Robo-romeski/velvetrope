# Resend / outbound email security

## Where Resend is called

EpicSexual has **one** code path that talks to Resend: `backend/src/email/email.service.ts` (`POST https://api.resend.com/emails`).

There are **no** cron jobs, workers, or Resend webhooks in this repo.

### HTTP entry points that can trigger email

| Trigger | Route | Auth | Recipient | From |
|--------|--------|------|-----------|------|
| Password reset | `POST /auth/forgot-password` | **Public** (via Next `/api/auth/forgot-password`) | **Account email from DB only** (never from client body as `to`) | `EMAIL_FROM` env |
| Application decision | `PATCH /applications/:id/decision` | **Host** (JWT + role) | **Applicant email from DB** | `EMAIL_FROM` |
| Trust report alert | `POST /trust/reports` | **Signed-in user** (JWT) | **`TRUST_REPORT_NOTIFY_EMAIL` env only** | `EMAIL_FROM` |

The contact page (`/contact`) is **mailto only** — it does not call Resend.

### Controls (code)

- No public API accepts arbitrary `to`, `from`, `subject`, or HTML.
- Recipients validated (`email-recipient.ts`): single address, no `,;<>`, length cap.
- Content length caps; `from` is always `resolveEmailFrom()` (env).
- Rate limits: per-email + per-IP password reset; per-host / per-application decision; per-reporter trust alerts; Nest throttling on public forgot-password and trust reports.
- Production refuses to send if `EMAIL_FROM` is missing or uses `@resend.dev`.

## Rotate `epicsexual-prod` API key

Assume the key **may** have leaked if it ever appeared in chat, logs, git, screenshots, or a shared `.env`.

1. [Resend Dashboard](https://resend.com/api-keys) → **Create API key** (name: `epicsexual-prod-YYYYMMDD`, sending access only).
2. On Lightsail: update `/home/ubuntu/epic-sexual/.env` → `RESEND_API_KEY=re_...` (do not commit).
3. Restart backend:  
   `sudo docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f deploy/lightsail/docker-compose.prod.yml --profile postgres up -d backend`
4. Send one test (forgot-password on a test account); confirm in Resend **Logs**.
5. **Revoke** the old key in Resend.

Use a **dedicated key per app**. Do not share one Resend key across Strat Edu, VettedForge, etc.

## Is junk mail from EpicSexual?

Resend attributes each send to the **API key** used.

1. Open **Logs** / **Emails** in Resend.
2. Open a suspicious message → check metadata (time, `from`, subject, recipient).
3. Compare with the key name/id for `epicsexual-prod`:
   - If sends **stop** after revoking only the EpicSexual key, those messages were this app (or anything else using that key).
   - If junk **continues** after revoking EpicSexual’s key, another key on the same Resend account (another project) is the source.

EpicSexual subjects today: password reset, application decision, `[epicsexual] New trust report (...)`.

## Verification

```bash
./deploy/lightsail/verify-prod-env.sh .env   # EMAIL_FROM + RESEND_API_KEY present; FROM not resend.dev
curl -sS https://api.epicsexual.com/healthz/integrations
```

After deploy, abusive forgot-password attempts should return **429** once limits are hit.
