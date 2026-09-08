# Deployment Guide

## Overview

VelvetKey is deployed using Docker Compose for local development and staging environments. This guide covers environment configuration, Docker setup, and production considerations.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Node.js 18+ (for local development without Docker)
- Auth0 account with configured application
- Stripe account with Connect enabled

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root using `.env.example` as a template:

```bash
cp .env.example .env
```

#### Auth0 Configuration (Backend)

```env
# Backend JWT verification
AUTH0_ISSUER=https://your-tenant.auth0.com/
AUTH0_AUDIENCE=https://your-api-identifier
```

#### Auth0 Configuration (Frontend)

```env
# Frontend Auth0 SDK
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=generate-a-secure-random-string-32-chars-minimum
AUTH0_BASE_URL=http://localhost:3000
```

**Generating AUTH0_SECRET:**
```bash
openssl rand -base64 32
```

#### Stripe Configuration

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Database Configuration

```env
# Development (SQLite)
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/velvetkey.db

# Production (PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=velvetkey
DATABASE_PASSWORD=secure-password
DATABASE_NAME=velvetkey
```

#### Application Configuration

```env
# Backend
NODE_ENV=development
PORT=3010
CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3010
```

### Environment Variable Security

**⚠️ NEVER commit `.env` files to version control**

- Use `.env.example` for templates with placeholder values
- Store production secrets in secure secret management systems
- Rotate secrets regularly, especially after team member changes
- Use different secrets for each environment (dev, staging, production)

## Docker Compose Deployment

### Quick Start

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

2. **Build and start services:**
   ```bash
   docker-compose up --build
   ```

3. **Verify services:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3010
   - Health check: http://localhost:3010/healthz

### Docker Compose Configuration

The `docker-compose.yml` defines two services:

#### Backend Service
- **Port:** 3010
- **Health Check:** `/healthz` endpoint
- **Volume:** `./backend:/app` for hot-reload in development
- **Environment:** Loaded from `.env` file

#### Frontend Service
- **Port:** 3000
- **Depends On:** Backend service (with health check)
- **Volume:** `./frontend:/app` for hot-reload in development
- **Environment:** Loaded from `.env` file

### Common Docker Commands

```bash
# Start services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild specific service
docker-compose up --build backend

# Execute commands in running container
docker-compose exec backend npm run migration:run
docker-compose exec frontend npm run lint
```

### Development Workflow

1. **Start services:**
   ```bash
   docker-compose up
   ```

2. **Make code changes** - Hot reload is enabled for both services

3. **Run tests:**
   ```bash
   # Backend tests
   docker-compose exec backend npm test
   
   # Frontend tests
   docker-compose exec frontend npm test
   ```

4. **View logs for debugging:**
   ```bash
   docker-compose logs -f
   ```

## Port Configuration

### Default Ports

- **Frontend:** 3000
- **Backend:** 3010

### Changing Ports

1. **Update `.env`:**
   ```env
   PORT=3010  # Backend port
   NEXT_PUBLIC_API_URL=http://localhost:3010
   AUTH0_BASE_URL=http://localhost:3000  # Frontend port
   ```

2. **Update `docker-compose.yml`:**
   ```yaml
   backend:
     ports:
       - "3010:3010"
   
   frontend:
     ports:
       - "3000:3000"
   ```

3. **Update backend CORS:**
   ```env
   CORS_ORIGIN=http://localhost:3000
   ```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using a port
lsof -i :3000
lsof -i :3010

# Kill process using port
kill -9 <PID>

# Or use different ports in .env and docker-compose.yml
```

## CORS Configuration

### Backend CORS Setup

The backend (`backend/src/main.ts`) is configured to accept requests from the frontend:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});
```

### Common CORS Issues

**Problem:** Frontend can't reach backend API

**Solutions:**
1. Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
2. Ensure `NEXT_PUBLIC_API_URL` in frontend `.env` points to backend
3. Check both services are running: `docker-compose ps`
4. Verify network connectivity: `curl http://localhost:3010/healthz`

**Problem:** CORS errors in browser console

**Solutions:**
1. Check browser network tab for actual error
2. Verify Auth0 tokens are being sent correctly
3. Ensure credentials are included in API requests
4. Check backend logs: `docker-compose logs backend`

## Database Management

### SQLite (Development)

Default configuration uses SQLite for simplicity:

```env
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/velvetkey.db
```

**Backup:**
```bash
cp backend/data/velvetkey.db backend/data/velvetkey.backup.db
```

**Reset:**
```bash
rm backend/data/velvetkey.db
docker-compose restart backend
```

### PostgreSQL (Production)

For production, use PostgreSQL:

```env
DATABASE_TYPE=postgres
DATABASE_HOST=your-postgres-host
DATABASE_PORT=5432
DATABASE_USERNAME=velvetkey
DATABASE_PASSWORD=secure-password
DATABASE_NAME=velvetkey
DATABASE_SSL=true
```

**Migrations:**
```bash
# Generate migration
docker-compose exec backend npm run migration:generate -- -n MigrationName

# Run migrations
docker-compose exec backend npm run migration:run

# Revert migration
docker-compose exec backend npm run migration:revert
```

## Health Checks

### Backend Health Check

```bash
curl http://localhost:3010/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Service Health Monitoring

Docker Compose includes health checks:

```bash
# Check service health
docker-compose ps

# Services should show "healthy" status
```

## Production Considerations

### Security Checklist

- [ ] Use strong, unique `AUTH0_SECRET` (32+ characters)
- [ ] Enable HTTPS/TLS for all services
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable database SSL connections
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Use secure session cookies
- [ ] Enable rate limiting
- [ ] Configure proper logging (no sensitive data)
- [ ] Set up monitoring and alerting
- [ ] Regular security updates for dependencies
- [ ] Implement backup strategy

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3010

# Use production Auth0 tenant
AUTH0_ISSUER=https://your-prod-tenant.auth0.com/
AUTH0_DOMAIN=your-prod-tenant.auth0.com
AUTH0_BASE_URL=https://your-domain.com

# Use production Stripe keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PostgreSQL
DATABASE_TYPE=postgres
DATABASE_SSL=true

# Secure CORS
CORS_ORIGIN=https://your-domain.com
```

### Performance Optimization

1. **Enable caching:**
   - Redis for session storage
   - CDN for static assets
   - Database query caching

2. **Database optimization:**
   - Connection pooling
   - Proper indexes
   - Query optimization

3. **Container optimization:**
   - Multi-stage Docker builds
   - Minimal base images
   - Layer caching

### Monitoring and Logging

**Recommended tools:**
- Application monitoring: New Relic, Datadog, or Sentry
- Log aggregation: ELK Stack, CloudWatch, or Papertrail
- Uptime monitoring: Pingdom, UptimeRobot, or StatusCake

**Log configuration:**
```env
LOG_LEVEL=info  # error, warn, info, debug
LOG_FORMAT=json  # json or text
```

### Backup Strategy

1. **Database backups:**
   - Automated daily backups
   - Point-in-time recovery enabled
   - Test restore procedures regularly

2. **Configuration backups:**
   - Version control for all config files
   - Secure storage for secrets
   - Document recovery procedures

### Scaling Considerations

**Horizontal scaling:**
- Load balancer in front of multiple backend instances
- Shared PostgreSQL database
- Redis for shared session storage
- Stateless application design

**Vertical scaling:**
- Increase container resources in docker-compose.yml
- Monitor resource usage and adjust accordingly

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check for port conflicts
lsof -i :3000
lsof -i :3010

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Database Connection Errors

```bash
# Check database configuration in .env
cat .env | grep DATABASE

# Verify database container is running
docker-compose ps

# Check database logs
docker-compose logs backend | grep -i database
```

### Auth0 Authentication Fails

1. Verify Auth0 configuration in `.env`
2. Check Auth0 dashboard for application settings
3. Ensure callback URLs are configured correctly
4. Verify JWT token in browser developer tools
5. Check backend logs for JWT verification errors

### CORS Errors

1. Verify `CORS_ORIGIN` matches frontend URL exactly
2. Check `NEXT_PUBLIC_API_URL` points to correct backend
3. Ensure both services are running
4. Check browser network tab for actual error details

### Container Health Check Failures

```bash
# Check health check endpoint manually
curl http://localhost:3010/healthz

# View detailed container status
docker-compose ps

# Check container logs
docker-compose logs backend
```

## Additional Resources

- [Development Guide](./DEVELOPMENT.md) - Local development setup
- [API Documentation](./API.md) - API endpoints and usage
- [Auth0 Documentation](https://auth0.com/docs)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

For issues and questions:
1. Check existing documentation
2. Review GitHub issues
3. Check application logs
4. Create detailed bug report with logs and steps to reproduce