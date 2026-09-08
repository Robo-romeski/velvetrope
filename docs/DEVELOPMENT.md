# Local Development Guide

This guide covers setting up VelvetKey for local development, common issues, and troubleshooting steps.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Docker & Docker Compose**: Latest stable versions (for containerized development)
- **Git**: For version control

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd velvetkey
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your credentials:

```bash
# Auth0 Configuration (Required)
AUTH0_ISSUER=https://your-tenant.auth0.com/
AUTH0_AUDIENCE=your-api-identifier
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=generate-a-secure-random-string-32-chars-minimum

# Stripe Configuration (Required for payment features)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3010
```

**Important**: Generate a secure `AUTH0_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Choose Your Development Method

#### Option A: Docker Compose (Recommended)

```bash
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3010
- Health Check: http://localhost:3010/healthz

#### Option B: Local Development (Without Docker)

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Development Workflow

### Running Tests

**Backend Tests:**
```bash
cd backend
npm test                 # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # With coverage
```

**Frontend Tests:**
```bash
cd frontend
npm test                # Run tests
npm run test:watch      # Watch mode
```

### Linting and Formatting

**Backend:**
```bash
cd backend
npm run lint            # Check for issues
npm run lint:fix        # Auto-fix issues
npm run format          # Format with Prettier
```

**Frontend:**
```bash
cd frontend
npm run lint            # Next.js linting
npm run lint:fix        # Auto-fix issues
```

### Database Management

**Development Database (SQLite):**
- Location: `backend/dev.db`
- Automatically created on first run
- Reset: Delete `dev.db` and restart backend

**View Database:**
```bash
cd backend
npx prisma studio       # If using Prisma
# OR
sqlite3 dev.db          # Direct SQLite access
```

## Common Issues and Solutions

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using the port
lsof -i :3000           # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>           # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different ports in .env
FRONTEND_PORT=3001
BACKEND_PORT=3011
```

### CORS Errors

**Problem:** `Access to fetch at 'http://localhost:3010' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution:**

1. Verify backend CORS configuration in `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

2. Ensure `.env` has correct URLs:
```bash
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3010
```

3. Restart both services after changes

### Auth0 Configuration Issues

**Problem:** `401 Unauthorized` or `Invalid token`

**Solutions:**

1. **Verify Auth0 Environment Variables:**
```bash
# Backend needs
AUTH0_ISSUER=https://your-tenant.auth0.com/
AUTH0_AUDIENCE=your-api-identifier

# Frontend needs
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-secure-secret
```

2. **Check Auth0 Application Settings:**
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`

3. **Verify API Configuration:**
   - Identifier matches `AUTH0_AUDIENCE`
   - Enable RBAC
   - Add Permissions in Token enabled

4. **Clear Browser Cache:**
```bash
# Or use incognito/private browsing
```

### Docker Issues

**Problem:** `Cannot connect to the Docker daemon`

**Solution:**
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker
```

**Problem:** `Port is already allocated`

**Solution:**
```bash
# Stop all containers
docker-compose down

# Remove orphaned containers
docker-compose down --remove-orphans

# Restart
docker-compose up --build
```

**Problem:** Changes not reflected in container

**Solution:**
```bash
# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

### Module Not Found Errors

**Problem:** `Cannot find module 'xyz'`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For Docker
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database Connection Issues

**Problem:** `SQLITE_CANTOPEN: unable to open database file`

**Solution:**
```bash
# Ensure backend directory has write permissions
chmod 755 backend

# Create database directory if needed
mkdir -p backend/data

# Update DATABASE_URL in .env
DATABASE_URL=file:./data/dev.db
```

### Stripe Webhook Testing

**Problem:** Need to test webhooks locally

**Solution:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# Or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:3010/stripe/webhook

# Use the webhook signing secret provided
# Update STRIPE_WEBHOOK_SECRET in .env
```

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=file:./dev.db
```

### Testing
```bash
NODE_ENV=test
DATABASE_URL=file::memory:
AUTH0_ISSUER=https://test.auth0.com/  # Mock issuer for tests
```

### Production (Reference Only)
```bash
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://...
# Use production Auth0 tenant
# Use production Stripe keys
```

## Debugging Tips

### Backend Debugging

**Enable Debug Logging:**
```bash
# In .env
LOG_LEVEL=debug

# Or via environment variable
LOG_LEVEL=debug npm run start:dev
```

**VS Code Launch Configuration:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start:debug"],
  "cwd": "${workspaceFolder}/backend",
  "console": "integratedTerminal"
}
```

### Frontend Debugging

**Enable Next.js Debug Mode:**
```bash
NODE_OPTIONS='--inspect' npm run dev
```

**Browser DevTools:**
- Network tab: Check API requests/responses
- Console: Check for errors
- Application tab: Verify Auth0 session storage

### API Testing

**Using curl:**
```bash
# Health check
curl http://localhost:3010/healthz

# Get events (public)
curl http://localhost:3010/events

# Authenticated request
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3010/events
```

**Using Postman/Insomnia:**
1. Import OpenAPI spec (if available)
2. Set up Auth0 OAuth 2.0 authentication
3. Test endpoints with proper tokens

## Performance Optimization

### Development Build Performance

**Backend:**
```bash
# Use SWC for faster compilation
npm install --save-dev @swc/core @swc/cli

# Update nest-cli.json
{
  "compilerOptions": {
    "builder": "swc"
  }
}
```

**Frontend:**
```bash
# Enable Next.js turbopack (experimental)
npm run dev -- --turbo
```

### Docker Build Performance

```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker-compose build

# Cache node_modules
# Already configured in docker-compose.yml volumes
```

## Useful Commands

### Project Management
```bash
# Install all dependencies
npm run install:all

# Clean all build artifacts
npm run clean

# Reset development environment
npm run reset
```

### Database
```bash
# Run migrations (if using Prisma/TypeORM)
cd backend
npm run migration:run

# Seed database
npm run seed
```

### Code Quality
```bash
# Run all checks
npm run check:all

# Type checking
npm run type-check

# Security audit
npm audit
```

## Getting Help

1. **Check Documentation:**
   - [README.md](../README.md) - Project overview
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
   - [API Documentation](../backend/README.md) - API reference

2. **Common Resources:**
   - [NestJS Documentation](https://docs.nestjs.com/)
   - [Next.js Documentation](https://nextjs.org/docs)
   - [Auth0 Documentation](https://auth0.com/docs)
   - [Stripe Documentation](https://stripe.com/docs)

3. **Project Issues:**
   - Check existing GitHub issues
   - Create new issue with reproduction steps
   - Include logs and environment details

## Next Steps

- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Set up CI/CD pipeline (see `.github/workflows/`)
- Configure monitoring and logging
- Set up staging environment
- Review security best practices