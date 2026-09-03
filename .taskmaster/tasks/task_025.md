# Task ID: 25

**Title:** Migrate database from SQLite to Postgres with TypeORM migrations

**Status:** pending

**Dependencies:** None

**Priority:** high

**Description:** Switch persistence from SQLite to Postgres and adopt TypeORM migrations for schema control across environments.

**Details:**

Implement a production-ready Postgres setup with TypeORM migrations. Keep fast tests (SQLite :memory: or a Postgres test container), ensure reproducible schema via migrations, and document the rollout/rollback process.
<info added on 2026-09-03T11:08:48Z>
Do not take docker-compose.prod.yml from velvetrope PR #1 as the Postgres path: it mounts missing init-db.sql and uses DATABASE_URL while the app uses TypeORM DATABASE_PATH/SQLite. Implement migrations here (synchronize off) instead.
</info>

**Test Strategy:**

- Local: run migration scripts, start app, create/read/update/delete Events
- Tests: ensure e2e still pass with chosen test DB (SQLite :memory: or Postgres container)
- Verify initial migration creates schema matching EventEntity
- Optional: data migration from SQLite → Postgres validated by counts and sample rows

## Subtasks

### 25.1. Set up Postgres development environment

**Status:** pending  
**Dependencies:** None  

Configure Docker Compose for local Postgres development environment and update environment variables for database connection.

**Details:**

Create a docker-compose.yml file with Postgres service configuration. Include environment variables for database name, user, password, and port. Update .env and .env.example files with new Postgres connection variables. Create a script to initialize the database. Document the local setup process in README.md.

### 25.2. Create TypeORM data source configuration for Postgres

**Status:** pending  
**Dependencies:** 25.1  

Update TypeORM data source configuration to support both SQLite and Postgres environments based on environment variables.

**Details:**

Modify the existing TypeORM data source configuration to conditionally use Postgres or SQLite based on environment variables. Create separate configurations for development, test, and production environments. Implement a factory function that returns the appropriate data source based on the current environment. Update connection handling code to work with both database types.

### 25.3. Generate initial TypeORM migration from existing entities

**Status:** pending  
**Dependencies:** 25.2  

Create the initial TypeORM migration that represents the current database schema from existing entity definitions.

**Details:**

Set up TypeORM CLI configuration in package.json. Create a migration script that generates the initial migration from existing entity definitions. Run the migration generation command and review the generated SQL. Adjust entity definitions if necessary to ensure compatibility with Postgres. Document the migration generation process.

### 25.4. Implement migration execution scripts

**Status:** pending  
**Dependencies:** 25.3  

Create scripts for running, reverting, and generating migrations in different environments.

**Details:**

Create npm scripts for migration operations: migrate:run, migrate:revert, migrate:generate. Implement a migration runner utility that handles connection setup and teardown. Add error handling and logging for migration operations. Create a script to check if migrations are pending. Document usage of migration scripts.

### 25.5. Update test environment configuration

**Status:** pending  
**Dependencies:** 25.2  

Configure the test environment to use either SQLite in-memory database or a Postgres test container.

**Details:**

Create a test-specific data source configuration. Implement conditional logic to use SQLite in-memory for fast tests or a Postgres test container based on configuration. Update test setup and teardown procedures to handle both database types. Add environment variables for controlling test database behavior. Document test database configuration options.

### 25.6. Implement data migration from SQLite to Postgres

**Status:** pending  
**Dependencies:** 25.3, 25.4  

Create a script to migrate existing data from SQLite to Postgres while preserving relationships and constraints.

**Details:**

Create a data migration utility that reads from SQLite and writes to Postgres. Implement transaction handling to ensure data integrity. Add progress reporting for long-running migrations. Handle type conversions between SQLite and Postgres. Implement validation to verify data was migrated correctly. Create a rollback mechanism in case of migration failure.

### 25.7. Update CI/CD pipeline for Postgres and migrations

**Status:** pending  
**Dependencies:** 25.4, 25.5  

Modify CI/CD pipeline to include Postgres service, run migrations during deployment, and add migration verification steps.

**Details:**

Update CI configuration to include a Postgres service for testing. Add a step to run migrations during the deployment process. Implement a migration verification step that checks if migrations are applied correctly. Add a step to create database backups before applying migrations in production. Document the updated CI/CD process.

### 25.8. Create deployment and rollback documentation

**Status:** pending  
**Dependencies:** 25.6, 25.7  

Document the complete process for deploying and rolling back database changes, including migration procedures and troubleshooting steps.

**Details:**

Create comprehensive documentation covering: environment setup, migration generation workflow, deployment process with migrations, rollback procedures, troubleshooting common issues, database backup and restore procedures, and best practices for schema changes. Include examples of common operations and their commands. Document the transition plan from SQLite to Postgres for existing deployments.

### 25.9. Install Postgres driver and add DB env vars

**Status:** pending  
**Dependencies:** None  

Add pg driver and database env vars for Postgres connectivity.

**Details:**

- npm i pg
- backend/.env: set DATABASE_URL or discrete DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME
- backend/.env.example: mirror keys and comments
- Do not remove test SQLite setup yet

### 25.10. Install Postgres driver and add DB env vars

**Status:** pending  
**Dependencies:** None  

Add pg driver and database env vars for Postgres connectivity.

**Details:**

- npm i pg
- backend/.env: set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME
- backend/.env.example: mirror keys and comments
- Keep test SQLite setup for speed

### 25.11. Install Postgres driver and add DB env vars

**Status:** pending  
**Dependencies:** None  

Add pg driver and database env vars for Postgres connectivity.

**Details:**

- npm i pg
- backend/.env: set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME
- backend/.env.example: mirror keys and comments
- Keep test SQLite setup for speed

### 25.12. Create TypeORM DataSource for migrations

**Status:** pending  
**Dependencies:** None  

Add src/data-source.ts configured for Postgres and migrations.

**Details:**

- entities: EventEntity (and future entities)
- synchronize: false
- migrations: src/migrations/*.ts (build to dist)
- export default new DataSource({...})

### 25.13. Add migration scripts to package.json

**Status:** pending  
**Dependencies:** None  

Wire CLI scripts for generate/run/revert migrations.

**Details:**

- add `typeorm` script (ts-node + tsconfig-paths)
- migration:generate, migration:run, migration:revert with -d src/data-source.ts

### 25.14. Switch Nest TypeOrmModule config to Postgres (keep test on SQLite)

**Status:** pending  
**Dependencies:** None  

Use Postgres in dev/prod and SQLite :memory: in tests.

**Details:**

- AppModule: if NODE_ENV==='test' use SQLite :memory:, else Postgres DATABASE_URL
- synchronize: false for Postgres
- entities unchanged

### 25.15. Generate initial migration and verify schema

**Status:** pending  
**Dependencies:** None  

Create initial migration from current entities.

**Details:**

- run migration:generate
- inspect file, ensure correct columns and types
- run migration:run
- verify tables exist

### 25.16. Document and test rollback/forward process

**Status:** pending  
**Dependencies:** None  

Add docs and sanity checks for migrate up/down.

**Details:**

- README/DEV.md: how to run/revert
- run revert then run again, confirm app boots

### 25.17. Add docker-compose Postgres for local dev

**Status:** pending  
**Dependencies:** None  

Provide a local Postgres service for developers.

**Details:**

- docker-compose.yml with postgres:16, volume, ports
- sample DATABASE_URL
- update docs

### 25.18. CI/CD: run migrations on deploy

**Status:** pending  
**Dependencies:** None  

Ensure migrations run during deployment.

**Details:**

- add step to run `npm run migration:run`
- ensure DATABASE_URL set in environment
- add health check post-deploy
