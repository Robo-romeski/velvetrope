# epicsexual

A knowledge-centered community platform for adults (ENM, poly, swinging, kink)—profiles, groups, member-created education, and curated events. Community-led, not a dating product.

**Platform plan (modules, phases, acceptance criteria):** [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)  
**Local event demo runbook:** [docs/DEMO.md](docs/DEMO.md)

Today the repo ships a strong **events module** (applications, invites, payments in test mode, QR check-in, analytics) on local email/password auth, with community and education modules planned as extensions—not replacements.

## Features Implemented

### ✅ Authentication & Authorization
- Email/password register and login
- JWT verification on the backend
- RBAC with host/attendee roles
- HttpOnly session cookie on the Next.js app

### ✅ Event Management
- Full CRUD operations for events
- Event status lifecycle (draft → published → cancelled)
- Host-controlled publish/cancel endpoints
- Event listing and details

### ✅ Application System
- Dynamic application form schema (per event)
- Form validation (required fields)
- Application submission with the signed-in user
- Host review and decision making (approve/reject)
- Paginated application listing

### ✅ Invite Code System
- Generate event-specific invite codes
- Validate invite codes (public endpoint)
- Redeem codes on application submission
- One-time use enforcement

### ✅ Check-in System
- Issue check-in tickets for approved attendees
- QR code display for attendees
- Host verification of check-in tokens
- One-time use enforcement

### ✅ Stripe Connect
- Host onboarding to Stripe Connect
- Account status tracking
- Return and refresh URL handling
- Webhook endpoint with signature verification

## Tech Stack

- **Backend**: NestJS, TypeORM, SQLite (dev), Postgres (planned production)
- **Frontend**: Next.js 15 (App Router), React 19
- **Auth**: Local email/password (JWT + RBAC)
- **Payments**: Stripe Connect
- **Database**: SQLite by default; Postgres via `DATABASE_URL` (TypeORM migrations, no `synchronize` in dev/prod)

## Quick Start with Docker Compose

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` if needed**:
   - `AUTH_SECRET` (32+ characters; a local default works for development)
   - Stripe secret key and webhook secret (optional until payments)

3. **Run the stack**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3010
   - Health check: http://localhost:3010/healthz

For the rehearsed two-user paid-event walkthrough, follow
[docs/DEMO.md](docs/DEMO.md).

**Production on AWS Lightsail:** [docs/DEPLOY_LIGHTSAIL.md](docs/DEPLOY_LIGHTSAIL.md)

### Docker with Postgres (optional)

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml --profile postgres up --build
```

Backend uses `DATABASE_URL=postgres://velvet:velvet@postgres:5432/velvetkey` and runs migrations on startup.

## Local Development (without Docker)

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── auth/           # Users, JWT guards, RBAC
│   │   ├── events/         # Event CRUD + status
│   │   ├── applications/   # Application system + forms
│   │   ├── invites/        # Invite code management
│   │   ├── checkin/        # Check-in ticket system
│   │   └── stripe/         # Stripe Connect + webhooks
│   └── test/               # E2E tests
├── frontend/
│   ├── app/
│   │   ├── host/           # Host-only pages
│   │   ├── events/         # Event pages (apply, ticket)
│   │   └── invite/         # Invite redemption
│   └── lib/
│       └── api.ts          # API helpers with session tokens
└── docker-compose.yml
```

## API Endpoints

### Auth
- `POST /auth/register` - Create an account (returns JWT)
- `POST /auth/login` - Sign in (returns JWT)
- `POST /auth/forgot-password` - Request password reset (email when configured; no enumeration)
- `POST /auth/reset-password` - Set new password with reset token
- `GET /auth/me` - Current user (auth required)

### Events
- `GET /events` - List published events
- `GET /events/mine` - List the authenticated host's events
- `GET /events/:id` - Get event details
- `POST /events` - Create event (host only)
- `PATCH /events/:id` - Update event (host only)
- `DELETE /events/:id` - Delete event (host only)
- `POST /events/:id/publish` - Publish event (host only)
- `POST /events/:id/cancel` - Cancel event (host only)

### Trust & safety
- `GET /trust/code-of-conduct` - Platform code of conduct (public)
- `POST /trust/reports` - File a safety report (auth required)
- `GET /trust/reports` - List reports (`admin` role)
- `PATCH /trust/reports/:id/resolve` - Resolve a report (`admin` role)
- `PATCH /trust/reports/:id/review` - Assign, annotate, resolve, or reopen a report (`admin` role)
- `GET /trust/export` - Download JSON export of profile + applications (auth required)
- `POST /trust/delete-account` - Delete account after password confirm (blocked if user hosts events)

Application submit requires `acceptedCodeOfConduct: true`; set `TRUST_REPORT_NOTIFY_EMAIL` for new-report alerts.

### Admin
- `GET /admin/summary` - Platform moderation counts
- `GET /admin/users`, `PATCH /admin/users/:id` - Search users and change roles/status
- `GET /admin/events` - Search all events
- `POST /admin/events/:id/cancel` - Administratively cancel an event
- `GET /admin/audit` - Immutable moderation audit log

Admin registration is intentionally unavailable. Bootstrap the first admin by
adding `"admin"` to an existing user's `roles` JSON directly in the database.
Subsequent role changes are available at `/admin/users`.

### Applications
- `GET /applications/mine` - List the authenticated user's applications (auth required)
- `POST /applications` - Submit application (auth required)
- `GET /applications/event/:eventId` - List applications (host only)
- `PATCH /applications/:id/decision` - Approve/waitlist/reject with optional host note (host only)
- `POST /applications/:id/promote` - Promote the first FIFO waitlisted attendee when capacity is available (host only)
- `PUT /applications/event/:eventId/form` - Set form schema (host only)
- `GET /applications/event/:eventId/form` - Get form schema (public)

### Invites
- `POST /invites/generate/:eventId` - Generate invite code (host only)
- `GET /invites/validate/:code` - Validate code (public)
- `GET /invites/event/:eventId` - List invite codes (event host only)
- `GET /invites/event/:eventId/stats` - Invite metrics for hosts (generated, redeemed, conversion)
- `POST /invites/redeem/:code` - Redeem code (auth required)

### Check-in
- `POST /checkin/issue/:eventId` - Issue ticket for a user (event host only)
- `POST /checkin/mine/:eventId` - Issue/return ticket for the authenticated attendee (approved applications only)
- `GET /checkin/event/:eventId` - List issued tickets without raw tokens (event host only)
- `GET /checkin/photo/mine/:eventId` - Attendee photo requirement/status
- `POST /checkin/photo/mine/:eventId/upload` - Request private signed photo upload
- `POST /checkin/photo/mine/:eventId/complete` - Verify uploaded object metadata
- `GET /checkin/photo/ticket/:token` - Five-minute signed photo read (event host only)
- `POST /checkin/verify/:token` - Verify ticket; opted-in events require explicit host photo confirmation

### Stripe
- `GET /stripe/onboarding` - Get onboarding link for the authenticated host
- `GET /stripe/status` - Get Connect account status for the authenticated host
- `GET /stripe/payment/:eventId` - Ticket payment status for the authenticated attendee
- `POST /stripe/checkout/:eventId` - Start Checkout for an approved application (paid events)
- `POST /stripe/webhook` - Stripe webhook handler (fails closed on bad/missing signature; handles `checkout.session.completed`)

### Analytics
- `GET /analytics/event/:eventId` - Aggregate funnel, revenue, and attendance (event host only)
- `GET /analytics/host/summary` - Aggregate metrics across the authenticated host's events

### Chat and feedback
- `GET/POST /chat/event/:eventId` - Approved-attendee/host chat history and HTTP fallback
- Socket.IO namespace `/chat` - Authenticated event rooms and live message broadcasts
- `DELETE /chat/messages/:id` - Soft-delete a message (event host only)
- `POST /feedback/event/:eventId` - Submit one post-event response
- `GET /feedback/mine/:eventId` - Attendee submission status
- `GET /feedback/event/:eventId` - Aggregate host feedback

Socket.IO uses in-process rooms. Configure a Redis adapter before running more
than one backend instance.

### Identity verification
- `GET /identity/status` - Current Persona configuration/decision status
- `POST /identity/session` - Precreate or resume an embedded Persona inquiry
- `POST /identity/persona/webhook` - Raw-body signed Persona decision webhook

Events may require Persona approval before ticket issuance while still
allowing attendees to apply first.

## Testing

### Backend E2E Tests
```bash
cd backend
npm run test:e2e
```

Tests cover:
- Local JWT login/register
- RBAC enforcement
- Event lifecycle
- Application flow
- Invite code system
- Check-in flow
- Stripe integration

## Environment Variables

See `.env.example` (root), `backend/.env.example`, and `frontend/.env.example`.

### Backend
- `AUTH_SECRET` (32+ characters; optional in development)
- `PORT` (default `3010`)
- `DATABASE_PATH` (SQLite file when `DATABASE_URL` is unset; default `data/dev.sqlite`)
- `DATABASE_URL` (Postgres connection string; enables Postgres driver)
- `RESEND_API_KEY` (optional; sends mail via Resend when set)
- `EMAIL_FROM` (sender address for Resend; default Resend sandbox from)
- `APP_BASE_URL` (links in password reset and application emails)
- `S3_PHOTO_BUCKET`, `S3_REGION` (private attendee reference photos)
- `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` (optional S3-compatible provider)
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (optional with workload identity)
- `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`, `PERSONA_ENVIRONMENT_ID`
- `PERSONA_WEBHOOK_SECRET` (signature verification)

Without `RESEND_API_KEY`, the backend captures outbound mail in memory (e2e) and logs in development.
The private photo bucket must permit browser PUT requests from `APP_BASE_URL`;
objects are never public and host reads use five-minute signed URLs.

### Database migrations

```bash
cd backend
npm run migration:run    # apply pending migrations (CLI)
npm run migration:show   # status
```

Nest runs pending migrations automatically on startup when not in `NODE_ENV=test`. E2e tests use in-memory SQLite with `synchronize` for speed.

### Security

- Helmet security headers on the API (`configureHttpApp` in `main.ts`)
- CORS: `CORS_ORIGINS` (comma-separated) or `APP_BASE_URL` in production; localhost frontend in dev
- Host mutation audit logs (`HostAudit` logger): method, path, user id — no passwords or tokens

If local SQLite fails after upgrading from auto-sync, delete `backend/data/dev.sqlite` and restart.

### Frontend
- `APP_BASE_URL` (default `http://localhost:3000`)
- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3010`)

### PWA / offline ticket

Production builds generate a Serwist service worker. An approved attendee
ticket that has been opened online is stored in IndexedDB and can be shown
offline until one day after the event. Logout clears cached tickets. Host
check-in and all authenticated mutations remain online-only.

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Roadmap status

**Shipped:** refined PRD tasks 1–10 plus FIFO waitlist and persisted
application decisions, privacy-safe host analytics, and an audited admin
console. The Next 16 PWA keeps approved attendee QR tickets available offline;
host verification remains online. Opted-in events can require private,
host-confirmed reference photos with seven-day retention. Approved attendees
and hosts have bounded real-time event chat plus optional-anonymous post-event
feedback. Opted-in events can gate QR ticket issuance on Persona approval.

Real sandbox inquiry/webhook/redaction requires vendor credentials and legal
sign-off.

Real S3 upload/read/delete remains an environment acceptance check because
sandbox credentials were not provided.

**Deferred:** Redis caching and Socket.IO adapter before horizontal backend
scaling.

`npm audit --omit=dev` reports zero production vulnerabilities. Serwist's
build-time dependency tree currently reports two `browserslist` advisories;
npm offers only a forced Serwist downgrade, so no forced audit fix is applied.

## License

MIT
