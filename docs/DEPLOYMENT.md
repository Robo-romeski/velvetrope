# VelvetKey Deployment Guide

This guide covers deploying VelvetKey to production environments, including Docker-based deployments, environment configuration, and production best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Production Considerations](#production-considerations)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Quick Start

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Node.js 18+ (for local development)
- PostgreSQL 14+ (for production)
- Auth0 account with configured application
- Stripe account with Connect enabled

### Development Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd velvetkey

# Run automated setup script
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Start services with Docker Compose
docker-compose up --build

# Verify all services are healthy
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Production Deployment

```bash
# Copy production environment template
cp .env.example .env.production

# Configure production environment variables (see below)
nano .env.production

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
./scripts/health-check.sh
```

## Environment Configuration

### Required Environment Variables

#### Backend (.env)

```bash
# Server Configuration
NODE_ENV=production
PORT=3010
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/velvetkey
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.velvetkey.com
AUTH0_ISSUER=https://your-tenant.auth0.com/

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Application URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Security
JWT_SECRET=<generate-secure-random-string-32-chars-min>
ENCRYPTION_KEY=<generate-secure-random-string-32-chars-min>

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env.local)

```bash
# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Auth0 Configuration
AUTH0_SECRET=<generate-secure-random-string-32-chars-min>
AUTH0_BASE_URL=https://yourdomain.com
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.velvetkey.com

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
```

### Generating Secure Secrets

```bash
# Generate random secrets (32+ characters)
openssl rand -base64 32

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variable Validation

The application validates required environment variables on startup. Missing or invalid variables will prevent the application from starting with clear error messages.

## Docker Deployment

### Development Mode

```bash
# Start all services with hot-reload
docker-compose up

# Start specific service
docker-compose up backend
docker-compose up frontend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after dependency changes
docker-compose up --build
```

### Production Mode

```bash
# Build optimized production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Docker Image Optimization

Our Docker images are optimized for production:

- **Multi-stage builds** minimize final image size
- **Layer caching** speeds up rebuilds
- **Non-root users** enhance security
- **Health checks** ensure service availability

Expected image sizes:
- Backend: < 200MB
- Frontend: < 150MB

### Docker Compose Services

#### Backend Service
- **Port**: 3010
- **Health Check**: `/healthz` endpoint
- **Restart Policy**: `unless-stopped`
- **Dependencies**: PostgreSQL (production)

#### Frontend Service
- **Port**: 3000
- **Health Check**: HTTP GET on root
- **Restart Policy**: `unless-stopped`
- **Dependencies**: Backend service

#### PostgreSQL Service (Production)
- **Port**: 5432 (internal only)
- **Volume**: Persistent data storage
- **Health Check**: `pg_isready`
- **Backup**: Automated daily backups recommended

## Production Considerations

### Database

#### Migration from SQLite to PostgreSQL

```bash
# Install PostgreSQL client
npm install -g typeorm

# Run migrations
cd backend
npm run migration:run

# Verify migration
npm run migration:show
```

#### Database Backups

```bash
# Manual backup
docker-compose exec postgres pg_dump -U velvetkey velvetkey > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U velvetkey velvetkey < backup.sql

# Automated backups (add to cron)
0 2 * * * /path/to/scripts/backup-database.sh
```

### Performance Optimization

#### Backend
- Enable connection pooling (configured in DATABASE_POOL_* vars)
- Use Redis for session storage (recommended for multi-instance deployments)
- Enable response compression
- Configure rate limiting per endpoint

#### Frontend
- Enable Next.js Image Optimization
- Configure CDN for static assets
- Enable ISR (Incremental Static Regeneration) for event pages
- Implement proper caching headers

### Scaling Considerations

#### Horizontal Scaling
```bash
# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Use load balancer (nginx, HAProxy, or cloud provider)
# Configure session affinity if not using Redis
```

#### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer recommended)
- Query optimization and indexing

### SSL/TLS Configuration

#### Using Reverse Proxy (Recommended)

```nginx
# nginx configuration example
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes three main workflows:

#### 1. Continuous Integration (`.github/workflows/ci.yml`)
- Runs on every pull request
- Executes linting, type checking, and tests
- Validates both frontend and backend
- Blocks merge if checks fail

#### 2. Backend Deployment (`.github/workflows/deploy-backend.yml`)
- Triggers on push to `main` branch
- Builds Docker image
- Runs database migrations
- Deploys to production environment
- Performs health checks

#### 3. Frontend Deployment (`.github/workflows/deploy-frontend.yml`)
- Triggers on push to `main` branch
- Builds optimized Next.js bundle
- Deploys to hosting platform
- Invalidates CDN cache

### Manual Deployment

```bash
# Backend deployment
cd backend
npm run build
npm run migration:run
pm2 restart velvetkey-backend

# Frontend deployment
cd frontend
npm run build
npm run start
```

## Monitoring & Health Checks

### Health Check Endpoints

#### Backend Health Check
```bash
curl http://localhost:3010/healthz

# Response
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "auth0": "configured",
  "stripe": "configured"
}
```

#### Frontend Health Check
```bash
curl http://localhost:3000/api/health

# Response
{
  "status": "ok",
  "backend": "connected"
}
```

### Automated Health Checks

```bash
# Run comprehensive health check
./scripts/health-check.sh

# Expected output:
# ✓ Backend service is healthy
# ✓ Frontend service is healthy
# ✓ Database connection successful
# ✓ Auth0 configuration valid
# ✓ Stripe configuration valid
```

### Monitoring Recommendations

- **Application Performance Monitoring**: New Relic, DataDog, or Sentry
- **Log Aggregation**: ELK Stack, Splunk, or CloudWatch
- **Uptime Monitoring**: Pingdom, UptimeRobot, or StatusCake
- **Error Tracking**: Sentry or Rollbar

### Logging

```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Filter by log level
docker-compose logs backend | grep ERROR
docker-compose logs backend | grep WARN

# Export logs
docker-compose logs --no-color > application.log
```

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check Docker daemon
docker info

# Check port conflicts
lsof -i :3000
lsof -i :3010

# Check environment variables
docker-compose config

# View detailed logs
docker-compose logs --tail=100 backend
```

#### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection manually
docker-compose exec postgres psql -U velvetkey -d velvetkey

# Reset database (CAUTION: destroys data)
docker-compose down -v
docker-compose up -d postgres
npm run migration:run
```

#### Auth0 Authentication Failures

```bash
# Verify Auth0 configuration
curl https://${AUTH0_DOMAIN}/.well-known/openid-configuration

# Check JWT token
# Use jwt.io to decode and verify token structure

# Verify audience and issuer match configuration
```

#### Stripe Webhook Failures

```bash
# Test webhook endpoint
stripe listen --forward-to localhost:3010/stripe/webhook

# Verify webhook signature
# Check STRIPE_WEBHOOK_SECRET matches Stripe dashboard

# View webhook logs in Stripe dashboard
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Analyze slow queries (PostgreSQL)
docker-compose exec postgres psql -U velvetkey -d velvetkey
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Profile Node.js application
NODE_ENV=production node --prof backend/dist/main.js
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug docker-compose up

# Backend debug mode
cd backend
npm run start:debug

# Frontend debug mode
cd frontend
npm run dev
```

## Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly (every 90 days minimum)
- Use different secrets for each environment

### Database Security
- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Enable SSL/TLS for database connections
- Restrict database access to application servers only
- Regular security updates and patches

### API Security
- Enable rate limiting on all endpoints
- Implement request validation and sanitization
- Use HTTPS only in production
- Configure CORS properly (whitelist specific origins)
- Enable CSRF protection for state-changing operations

### Docker Security
- Run containers as non-root users
- Scan images for vulnerabilities (`docker scan`)
- Keep base images updated
- Minimize image layers and installed packages
- Use official base images only

### Auth0 Security
- Enable MFA for administrative accounts
- Configure attack protection (brute force, suspicious IP)
- Regular audit of user permissions and roles
- Monitor authentication logs for anomalies

### Stripe Security
- Use webhook signature verification
- Store API keys securely (never in code)
- Enable Stripe Radar for fraud detection
- Regular review of connected accounts
- Implement idempotency for payment operations

### Compliance
- GDPR: Implement data export and deletion
- PCI DSS: Never store card data (use Stripe tokens)
- SOC 2: Implement audit logging
- Regular security audits and penetration testing

## Additional Resources

- [NestJS Production Best Practices](https://docs.nestjs.com/techniques/performance)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Auth0 Production Checklist](https://auth0.com/docs/deploy/checklist)
- [Stripe Connect Best Practices](https://stripe.com/docs/connect/best-practices)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

## Support

For deployment issues or questions:
- Check existing GitHub issues
- Review application logs
- Consult infrastructure documentation
- Contact the development team

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0