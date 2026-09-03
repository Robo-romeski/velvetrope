# VelvetKey

A sophisticated event management platform for exclusive events with Auth0 authentication, Stripe Connect payments, and application management.

## Features Implemented

### ✅ Authentication & Authorization (Auth0)
- JWT verification on backend
- RBAC with host/attendee roles
- Frontend Auth0 integration with Next.js App Router
- Protected routes and middleware

### ✅ Event Management
- Full CRUD operations for events
- Event status lifecycle (draft → published → cancelled)
- Host-controlled publish/cancel endpoints
- Event listing and details

### ✅ Application System
- Dynamic application form schema (per event)
- Form validation (required fields)
- Application submission with Auth0 user context
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
- **Auth**: Auth0 (JWT + RBAC)
- **Payments**: Stripe Connect
- **Database**: SQLite (in-memory for tests, file-based for dev)

## Quick Start with Docker Compose

1. **Copy environment template**:
   ```bash
   cp .env.docker .env
   ```

2. **Update `.env` with your actual credentials**:
   - Auth0 credentials (already populated from your setup)
   - Stripe secret key
   - Generate a secure `AUTH0_SECRET` (32+ chars)

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
│   │   ├── auth/           # Auth0 JWT guards, RBAC
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
│       └── api.ts          # API helpers with Auth0 tokens
└── docker-compose.yml
```

## API Endpoints

### Events
- `GET /events` - List all events
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
- `POST /invites/redeem/:code` - Redeem code (auth required)

### Check-in
- `POST /checkin/issue/:eventId` - Issue ticket (host only)
- `POST /checkin/verify/:token` - Verify ticket (host only)

### Stripe
- `GET /stripe/onboarding/:hostId` - Get onboarding link (host only)
- `GET /stripe/status/:hostId` - Get account status (host only)
- `POST /stripe/webhook` - Stripe webhook handler

## Testing

### Backend E2E Tests
```bash
cd backend
npm run test:e2e
```

Tests cover:
- Auth0 JWT verification
- RBAC enforcement
- Event lifecycle
- Application flow
- Invite code system
- Check-in flow
- Stripe integration

## Environment Variables

See `.env.docker` for a complete list of required environment variables.

### Required for Auth0:
- `AUTH0_ISSUER`
- `AUTH0_AUDIENCE`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_DOMAIN`
- `AUTH0_SECRET`

### Required for Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Next Steps / TODO

- [ ] Migrate to Postgres for production
- [ ] Implement Stripe payment flow
- [ ] Add email notifications
- [ ] Host dashboard with analytics
- [ ] Event capacity limits
- [ ] Waitlist management
- [ ] Photo verification for check-in

## License

MIT
