# Local MVP Demo

This runbook demonstrates VelvetKey's core paid-event journey on one Mac:

1. A host publishes an invite-only event.
2. An attendee applies with an invite code.
3. The host approves the application.
4. The attendee completes a Stripe test payment.
5. VelvetKey issues a QR ticket.
6. The host checks the attendee in and views updated analytics.

Persona, photo check-in, real email delivery, admin moderation, and public
hosting are intentionally outside this demo.

**Community (M1):** After the stack is up, migration `1738000000011-CommunityModule`
runs automatically on Postgres. Migration `1738000000012-EducationModule` adds
Learn. Try `/community`, `/learn`, `/settings/profile`, and
`/members/{your-user-id}` (profiles are created on first visit).

## 1. Preflight

**Payments:** You can run the full paid-event and paid-course journey in **simulation
mode** (no Stripe keys) or with **Stripe test mode** keys.

Simulation (default when `STRIPE_SECRET_KEY` is unset): Connect and Checkout use
in-app simulated pages; fulfillment still writes `Order`, `Entitlement`, and event
payment records the same way as live Stripe after return URLs confirm the session.

With Stripe test keys, the root `.env` should contain:

```dotenv
AUTH_SECRET=replace-with-at-least-32-characters
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3010
```

Do not commit `.env` or demo passwords. Keep the host and attendee credentials
in a local password manager or temporary note.

Start the Postgres stack:

```bash
cd /path/to/velvetrope
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  --profile postgres \
  up -d --build
```

Confirm the services and API are ready:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  --profile postgres \
  ps

curl -fsS http://localhost:3010/healthz
```

Open two browser profiles:

- Host: a normal window at <http://localhost:3000>
- Attendee: a private/incognito window at <http://localhost:3000>

## 2. Prepare Stable Local Accounts

Create or reuse two local-only accounts:

- Host: register through **Host an event** so the host role is selected.
- Attendee: register through **Sign up** and leave **I host events** off.

Use the same two accounts for rehearsals. If the host is not connected:

1. Log in as the host.
2. Open **Payments**.
3. Start Connect — with simulation, finish on **Simulated payout setup**; with
   Stripe keys, complete Stripe Connect test onboarding.
4. Return to VelvetKey and confirm the page reports the account as connected.

Never enter real identity, bank, or card data in this demo.

## 3. Prepare the Event

As the host:

1. Open **Host dashboard** and create a draft.
2. Use a clear title such as `VelvetKey Demo Night`.
3. Set the start time between now and 48 hours from now so chat is available.
4. Set capacity to `20`.
5. Edit the event and set **Ticket price** to `1.00`.
6. Leave **Require an attendee reference photo** off.
7. Leave **Require Persona identity verification** off.
8. Publish the event.
9. Open **Invites**, generate one code, and copy it.

The home page should now show the published event.

## 4. Demo Script

### Attendee applies

Either path works:

1. Open the event from **Events**, select **Apply**, paste the invite code,
   accept the code of conduct, and submit.
2. Or open **Redeem invite** (from an invite link), enter the code, choose
   **Redeem and apply**, then submit on the application page.

Before any paid ticket demo, the **same host account that owns the event** must
show **Payments** as connected. A Stripe account linked to a different host
will not satisfy checkout for that event.

3. Show **My applications** with the pending status.

### Host approves

1. In the host window, open the event's **Applications** page.
2. Open the attendee application and approve it.
3. Optionally show invite conversion on the **Invites** page.

### Attendee pays and receives a ticket

1. In the attendee window, refresh **My applications** and open **Ticket**.
2. Select **Pay with Stripe** (simulation sends you to the in-app checkout page).
3. With real Stripe test Checkout use:
   - Card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any three digits
   - Postal code: any valid postal code
4. Complete the test payment.
5. Confirm VelvetKey returns to the event and displays one QR ticket.

The return page verifies the Checkout Session with Stripe before recording the
payment or issuing the ticket. Refreshing the return page must not create a
second ticket.

### Host checks in the attendee

1. Copy the token shown below the attendee's QR code.
2. In the host window, open the event's **Check-in** page.
3. Paste the token and verify it.
4. Verify the same token again to demonstrate one-time check-in protection.
5. Open **Analytics** and show the updated paid and attended counts.

## 5. Acceptance Checklist

- [ ] Home page shows the published demo event without raw API errors.
- [ ] Guest signup creates an attendee unless host mode is explicitly chosen.
- [ ] Login returns users to the page they originally requested.
- [ ] Host navigation includes **Host dashboard** and **Payments**.
- [ ] Attendee navigation does not include host-only links.
- [ ] Stripe uses a test key and the host account is connected.
- [ ] Checkout charges exactly `$1.00` in test mode.
- [ ] Payment is recorded as paid.
- [ ] Exactly one QR ticket is issued.
- [ ] First check-in succeeds and the second is rejected as already used.
- [ ] Analytics reflect the application, payment, and attendance.
- [ ] The primary path works at desktop and mobile widths.

## 6. Recovery

View service logs:

```bash
cd /path/to/velvetrope
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  --profile postgres \
  logs --since 10m backend frontend
```

Common recoveries:

- **Unable to reach the service:** confirm both containers are running and
  `curl http://localhost:3010/healthz` succeeds.
- **Host has not connected Stripe:** log in as the host and finish **Payments**
  onboarding before setting a paid ticket price.
- **Stripe reports restricted capabilities:** finish the required test account
  fields in Stripe, then revisit the Payments return page.
- **Application is not eligible for a ticket:** confirm it is approved and the
  attendee is logged into the same account that applied.
- **Identity or photo requirement appears:** turn both options off in the event
  editor for this MVP demo.
- **Chat is unavailable:** move the event start inside the 48-hour chat window.

Stop the application without deleting demo data:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  --profile postgres \
  stop
```

Do not use `down -v`; that deletes the local Postgres and backend volumes.
