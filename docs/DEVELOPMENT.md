# Local Development Guide

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Docker & Docker Compose**: Latest stable versions (for containerized development)
- **Auth0 Account**: Free tier is sufficient for development
- **Stripe Account**: For payment integration testing

## Port Configuration

The application uses the following ports:

- **Frontend (Next.js)**: `3000`
- **Backend (NestJS)**: `3010`
- **Database**: SQLite (file-based, no port needed)

**Important**: These ports are hardcoded in multiple configuration files. If you need to change them, update:
- `docker-compose.yml`
- `backend/src/main.ts`
- `frontend/.env.local` (NEXT_PUBLIC_API_URL)
- `frontend/lib/api.ts`

## Quick Start with Docker Compose

This is the recommended approach for local development as it ensures consistency across environments.

### 1. Clone and Setup

```bash
git clone <repository-url>
cd velvet-rope
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

**Required Variables**:

```bash
# Auth0 Backend (JWT Verification)
AUTH0_ISSUER=https://<your-tenant>.<region>.auth0.com/
AUTH0_AUDIENCE=https://api.velvetkey.example.com

# Auth0 Frontend (Next.js Auth)
AUTH0_DOMAIN=<your-tenant>.<region>.auth0.com
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>
AUTH0_SECRET=<generate-32-char-random-string>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3010
```

### 3. Start the Stack

```bash
docker-compose up --build
```

This will:
- Build both backend and frontend Docker images
- Start the backend on port 3010
- Start the frontend on port 3000
- Set up networking between services

### 4. Verify the Setup

- **Frontend**: http://localhost:3000
- **Backend Health Check**: http://localhost:3010/healthz
- **Backend API Docs**: http://localhost:3010/api (if Swagger is enabled)

## Local Development (Without Docker)

If you prefer to run services directly on your machine:

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Auth0 and Stripe credentials
nano .env

# Run database migrations (if applicable)
npm run migration:run

# Start development server with hot reload
npm run start:dev
```

The backend will start on http://localhost:3010

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Auth0 credentials
nano .env.local

# Start development server
npm run dev
```

The frontend will start on http://localhost:3000

## Common Issues and Troubleshooting

### CORS Errors

**Symptom**: Frontend cannot connect to backend, browser console shows CORS errors.

**Solution**:
1. Verify `backend/src/main.ts` has correct CORS configuration:
   ```typescript
   app.enableCors({
     origin: 'http://localhost:3000',
     credentials: true,
   });
   ```
2. Ensure `NEXT_PUBLIC_API_URL` in frontend `.env.local` is `http://localhost:3010`
3. Clear browser cache and cookies
4. Restart both services

### Auth0 Configuration Issues

**Symptom**: Login redirects fail or JWT verification errors.

**Solution**:
1. Verify Auth0 Application Settings:
   - **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
2. Check `AUTH0_ISSUER` format: Must end with `/` (e.g., `https://tenant.region.auth0.com/`)
3. Verify `AUTH0_AUDIENCE` matches your API identifier in Auth0 dashboard
4. Ensure `AUTH0_SECRET` is at least 32 characters long

### Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000` or `:::3010`

**Solution**:
```bash
# Find process using the port (macOS/Linux)
lsof -i :3000
lsof -i :3010

# Kill the process
kill -9 <PID>

# Or use different ports by updating all configuration files
```

### Docker Container Issues

**Symptom**: Containers fail to start or crash immediately.

**Solution**:
```bash
# View container logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up --build
```

### Database Connection Errors

**Symptom**: Backend fails to start with database errors.

**Solution**:
1. For SQLite (development):
   - Ensure `backend/database.sqlite` directory is writable
   - Delete `database.sqlite` and restart to recreate
2. Check `DATABASE_URL` in backend `.env`
3. Run migrations: `npm run migration:run`

### Environment Variables Not Loading

**Symptom**: Application behaves as if environment variables are missing.

**Solution**:
1. Verify `.env` file is in the correct directory:
   - Backend: `backend/.env`
   - Frontend: `frontend/.env.local`
2. Restart the development server after changing `.env` files
3. For Docker: Rebuild containers with `docker-compose up --build`
4. Check for typos in variable names (they are case-sensitive)

### Stripe Webhook Testing

**Symptom**: Webhooks not working in local development.

**Solution**:
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Forward webhooks to local backend:
   ```bash
   stripe listen --forward-to localhost:3010/stripe/webhook
   ```
3. Use the webhook signing secret provided by Stripe CLI in your `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Development Workflow

### Making Code Changes

1. **Backend Changes**:
   - Edit files in `backend/src/`
   - NestJS will hot-reload automatically
   - Run tests: `npm run test` or `npm run test:e2e`

2. **Frontend Changes**:
   - Edit files in `frontend/app/` or `frontend/components/`
   - Next.js will hot-reload automatically
   - Run tests: `npm run test`

### Running Tests

```bash
# Backend
cd backend
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report

# Frontend
cd frontend
npm run test              # Jest tests
npm run test:watch        # Watch mode
```

### Linting and Formatting

```bash
# Backend
cd backend
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
npm run format            # Prettier formatting

# Frontend
cd frontend
npm run lint              # Next.js linting
npm run lint:fix          # Auto-fix issues
```

### Database Management

```bash
cd backend

# Create a new migration
npm run migration:create -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Reset database (development only)
rm database.sqlite
npm run migration:run
```

## IDE Configuration

### VS Code

Recommended extensions:
- ESLint
- Prettier
- Docker
- Thunder Client (API testing)

Workspace settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript"],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm / IntelliJ IDEA

1. Enable ESLint: Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable Prettier: Preferences → Languages & Frameworks → JavaScript → Prettier
3. Set Node.js interpreter: Preferences → Languages & Frameworks → Node.js

## Debugging

### Backend Debugging

**VS Code Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

### Frontend Debugging

1. Add `debugger;` statements in your code
2. Open Chrome DevTools (F12)
3. Use the Sources tab to set breakpoints
4. For server-side debugging, check terminal output

### Docker Debugging

```bash
# Access running container shell
docker-compose exec backend sh
docker-compose exec frontend sh

# View real-time logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Inspect container
docker inspect velvet-rope-backend
```

## Performance Tips

1. **Use Docker Compose for consistency**: Avoids "works on my machine" issues
2. **Enable hot reload**: Both NestJS and Next.js support hot module replacement
3. **Use SQLite for development**: Faster than PostgreSQL for local testing
4. **Mock external services**: Use test mode for Stripe, mock Auth0 in tests
5. **Optimize Docker builds**: Use `.dockerignore` to exclude `node_modules`

## Security Considerations

1. **Never commit `.env` files**: They contain secrets
2. **Use strong AUTH0_SECRET**: Generate with `openssl rand -base64 32`
3. **Keep dependencies updated**: Run `npm audit` regularly
4. **Use HTTPS in production**: Even for internal services
5. **Validate all inputs**: Both frontend and backend
6. **Test RBAC thoroughly**: Ensure hosts can't access attendee-only features

## Getting Help

1. Check this guide first
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production issues
3. Check GitHub Issues for known problems
4. Review Auth0 and Stripe documentation
5. Check application logs: `docker-compose logs`

## Next Steps

- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Read API documentation at http://localhost:3010/api
- Explore the codebase structure in the main [README.md](../README.md)
- Set up your Auth0 tenant with proper roles and permissions
- Configure Stripe Connect for payment testing