# Task ID: 1

**Title:** Setup Project Infrastructure

**Status:** in-progress

**Dependencies:** None

**Priority:** high

**Description:** Local NestJS + Next.js + Docker Compose are on main. Remaining: small GitHub Actions that use AUTH0_ISSUER, app-focused .env.example, port/CORS alignment. AWS EKS is deferred. Do not merge velvetrope PR #1.

**Details:**

Shipped on main (https://github.com/Robo-romeski/velvetrope): Next.js 15 frontend, NestJS 11 backend, Docker Compose, Dockerfiles, GET /healthz.

This is not FastAPI. AWS EKS/S3/CloudFront and Grafana/Loki/OTel are deferred.

Remaining:
- Close Automaton PR https://github.com/Robo-romeski/velvetrope/pull/1 without merging (duplicates scaffold, red CI, wrong env names, fake prod compose).
- Add a small GitHub Actions workflow: backend unit + e2e with AUTH0_ISSUER set, frontend lint/build. Do not copy PR #1 GHCR deploy or docker-compose.prod.yml.
- Replace root .env.example (Taskmaster AI keys) with Auth0/Stripe vars using AUTH0_ISSUER and NEXT_PUBLIC_API_BASE_URL.
- Unify PORT defaults (3000 vs 3001 vs 3010) and CORS.

**Test Strategy:**

CI on GitHub runs backend e2e with AUTH0_ISSUER and frontend build. docker-compose up still works. PR #1 is closed unmerged.

## Subtasks

### 1.1. Create Monorepo Structure

**Status:** done  
**Dependencies:** None  

Set up a monorepo architecture with separate directories for Next.js frontend and FastAPI backend

**Details:**

Initialize git repository, create directory structure with frontend/ and backend/ folders, set up package.json for workspace management, configure linting and formatting tools, add README with setup instructions, and create .gitignore file with appropriate rules
<info added on 2025-08-31T00:32:22.580Z>
## Implementation Plan for Subtask 1.1 (Create Monorepo Structure)

### Goal
Establish a clean repository scaffold with separate `frontend/` (Next.js) and `backend/` (FastAPI), plus repo-level docs and ignores.

### Implementation Steps
1. Create directory structure:
   - `frontend/` - Will contain Next.js application
   - `backend/` - Will contain FastAPI application
   - Reserve space for future `infra/` directory for Terraform

2. Create repository files:
   - Root `README.md` with project overview, structure, and development prerequisites
   - Root `.gitignore` configured for Node, Python, macOS, environment files, build artifacts, and IDE-specific files

3. Git considerations:
   - Repository is already initialized on `main` branch
   - No re-initialization required

### Deferred Decisions
- Root `package.json` workspaces setup deferred until team decides on Yarn/npm vs pnpm
- Keeping monorepo tool choice flexible for now

### Risks and Notes
- Avoid premature tool lock-in (workspaces/poetry) before team preference is established
- Infrastructure (EKS/Terraform) will be addressed in subtask 1.4

### Acceptance Criteria
- `frontend/` and `backend/` directories exist at repo root
- Root `README.md` describes structure and quickstart at a high level
- Root `.gitignore` excludes Node/Python/macOS and common artifacts
- No breaking changes to Taskmaster files or existing git state
</info added on 2025-08-31T00:32:22.580Z>

### 1.2. Configure Frontend Environment

**Status:** done  
**Dependencies:** None  

Set up Next.js project with TypeScript and PWA capabilities

**Details:**

Initialize Next.js with TypeScript support, configure PWA features with next-pwa, set up component library and styling solution, implement folder structure following best practices, configure environment variables, add testing framework (Jest/React Testing Library), and set up Storybook for component documentation
<info added on 2025-08-31T00:39:04.785Z>
- Scaffold Next.js app in `frontend/` using create-next-app with TypeScript, Tailwind CSS, ESLint
- Install `next-pwa` and wire up basic PWA config (service worker, runtime caching defaults)
- Add web app manifest and icons; reference via `metadata` in Next.js app
- Set up base folders: `app/`, `components/`, `lib/`, `styles/`, `public/`
- Add basic smoke test page and scripts: dev/build/lint/test
- Add Jest + React Testing Library (light) and Storybook (optional stub)
- Acceptance: `pnpm dev` or `npm run dev` starts, PWA manifest loads, offline works for static routes
</info added on 2025-08-31T00:39:04.785Z>

### 1.3. Configure Backend Environment

**Status:** done  
**Dependencies:** None  

Initialize FastAPI project with proper directory structure and dependencies

**Details:**

Set up FastAPI application with proper project structure, configure Python virtual environment, set up dependency management with poetry or pip, implement folder structure for routes/models/services, configure environment variables, add testing framework (pytest), and set up database connection utilities
<info added on 2025-08-31T01:08:32.666Z>
# Backend Environment Configuration Plan

- Scaffold FastAPI app in `backend/` with:
  - `app/main.py`, `app/api/__init__.py`, `app/api/v1/routes.py`
  - `app/core/config.py` for settings via pydantic
  - `app/__init__.py`
- Add `pyproject.toml` using uv/poetry or fall back to `requirements.txt` with pinned versions
- Include basic health endpoint `/healthz` and CORS
- Add `uvicorn` dev script via `Makefile` or `justfile` and README snippet
- Acceptance: `uvicorn app.main:app --reload` serves health endpoint at 200
</info added on 2025-08-31T01:08:32.666Z>
<info added on 2025-08-31T06:58:36.942Z>
# Backend Environment Configuration Plan (Updated)

- Scaffold NestJS app in `backend/` using `npx @nestjs/cli new backend -p npm --skip-git`
- Maintain strict TypeScript configuration defaults
- Implement testing with Jest (included by default):
  - Unit tests for all components
  - E2E tests for API endpoints
  - Follow Test-Driven Development approach
- Create health module with:
  - `GET /healthz` endpoint
  - Controller and service implementation
  - Corresponding unit and e2e tests
- Add configuration module for environment variables management
- Acceptance criteria:
  - All tests pass with `npm test`
  - Development server (`npm run start:dev`) successfully serves health endpoint returning 200 OK
- Note: This replaces the previous FastAPI implementation to align with repository-wide TypeScript preference
</info added on 2025-08-31T06:58:36.942Z>

### 1.4. Set Up AWS Infrastructure

**Status:** deferred  
**Dependencies:** None  

Configure AWS EKS cluster, S3 buckets, and CloudFront distribution

**Details:**

Create AWS EKS cluster with appropriate node groups, set up S3 buckets for static assets and user uploads, configure CloudFront distribution for content delivery, implement IAM roles and policies, set up VPC and networking components, and create Terraform or CloudFormation templates for infrastructure as code
<info added on 2026-09-03T11:08:48Z>
Deferred 3 Sep 2026 after velvetrope PR #1 review: do not provision AWS EKS/S3/CloudFront until the local MVP is honest (task 26: event ownership, Stripe bound to Auth0 sub, attendee tickets). PR #1 did not implement AWS and must not be merged as a substitute.
</info>

### 1.5. GitHub Actions CI (match NestJS env)

**Status:** pending  
**Dependencies:** None  

Add a small CI workflow using AUTH0_ISSUER (not AUTH0_DOMAIN) and existing backend e2e + frontend lint/build. Close PR #1 instead of merging it.

**Details:**

Configure GitHub Actions or similar CI/CD tool, implement automated testing in the pipeline, set up deployment workflows for different environments, configure Grafana for metrics visualization, implement Loki for log aggregation, set up OpenTelemetry for distributed tracing, and create Docker containers for local development and deployment
<info added on 2026-09-03T11:08:48Z>
## Revised plan (3 Sep 2026, velvetrope PR #1)

Do NOT merge https://github.com/Robo-romeski/velvetrope/pull/1. It re-scaffolds work already on main, sets AUTH0_DOMAIN instead of AUTH0_ISSUER (e2e 47/47 failed), docker-compose.prod.yml uses a nonexistent Docker `production` target, scripts/*.sh are Node files, docs/INFRASTRUCTURE.md is a JS stub.

Implement instead:
1. Close PR #1.
2. One workflow: backend `npm test` + `npm run test:e2e` with NODE_ENV=test, AUTH0_ISSUER, AUTH0_AUDIENCE; frontend lint + build with dummy Auth0 secrets matching the Next Auth0 SDK.
3. No GHCR deploy-on-push until tests are green and we have a real host.
4. Either fix or temporarily scope existing ESLint unsafe-any so lint is not red on day one.

Observability (Grafana/Loki/OTel) stays out of this subtask.
</info>

### 1.6. App env template and port alignment

**Status:** pending  
**Dependencies:** None  

Replace root .env.example with Auth0/Stripe vars and unify PORT / NEXT_PUBLIC_API_BASE_URL / CORS.

**Details:**

Root .env.example is Taskmaster AI keys. Backend AUTH0_ISSUER, PORT default 3000; frontend/lib/api.ts falls back to localhost:3001; Docker uses 3010. CORS allows only localhost:3000. README mentions missing .env.docker. Prefer one local default (3010 to match Compose). Commit an app .env.example using AUTH0_ISSUER and NEXT_PUBLIC_API_BASE_URL.
