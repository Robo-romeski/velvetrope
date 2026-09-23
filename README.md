# VelvetKey

A sophisticated event management platform for exclusive events with local email/password authentication, Stripe Connect payments, and application management.

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
- **Database**: SQLite (in-memory for tests, file-based for dev)

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

### Applications
- `POST /applications` - Submit application (auth required)
- `GET /applications/event/:eventId` - List applications (host only)
- `PATCH /applications/:id/decision` - Approve/reject (host only)
- `PUT /applications/event/:eventId/form` - Set form schema (host only)
- `GET /applications/event/:eventId/form` - Get form schema (public)

### Invites
- `POST /invites/generate/:eventId` - Generate invite code (host only)
- `GET /invites/validate/:code` - Validate code (public)
- `GET /invites/event/:eventId` - List invite codes (event host only)
- `POST /invites/redeem/:code` - Redeem code (auth required)

### Check-in
- `POST /checkin/issue/:eventId` - Issue ticket for a user (event host only)
- `POST /checkin/mine/:eventId` - Issue/return ticket for the authenticated attendee (approved applications only)
- `GET /checkin/event/:eventId` - List issued tickets without raw tokens (event host only)
- `POST /checkin/verify/:token` - Verify ticket (event host only)

### Stripe
- `GET /stripe/onboarding` - Get onboarding link for the authenticated host
- `GET /stripe/status` - Get Connect account status for the authenticated host
- `POST /stripe/webhook` - Stripe webhook handler (fails closed on bad/missing signature)

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
- `DATABASE_PATH` (default `data/dev.sqlite`)

### Frontend
- `APP_BASE_URL` (default `http://localhost:3000`)
- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3010`)

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Next Steps / TODO

- [ ] Migrate to Postgres for production
- [ ] Implement Stripe payment flow
- [ ] Add email notifications
- [ ] Host dashboard with analytics
- [x] Event capacity limits
- [ ] Waitlist management
- [ ] Photo verification for check-in

## License

MIT
