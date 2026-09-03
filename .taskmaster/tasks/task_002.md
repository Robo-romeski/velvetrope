# Task ID: 2

**Title:** Database Schema Design

**Status:** in-progress

**Dependencies:** 1 ⧖

**Priority:** high

**Description:** TypeORM + SQLite already has Event, Application, ApplicationForm, Invite, CheckinTicket, StripeAccount. Remaining: hostId (task 26), Postgres migrations (task 25). Not Alembic/SQLAlchemy.

**Details:**

Current: SQLite + TypeORM synchronize:true. Tables: events, applications, application_forms, invites, checkin_tickets, stripe_accounts. No User table; Auth0 sub stored as text. Events have no hostId.

Do not implement Alembic or SQLAlchemy.

Split:
- Task 26: hostId and ownership FKs for an honest MVP
- Task 25: Postgres + turn synchronize off
- Later PRD tables (Users, Feedback, Reports) stay with those feature tasks
Redis is not required for the local MVP.

**Test Strategy:**

Write unit tests for database models and migrations. Verify that all relationships between tables work correctly. Test database performance with sample data sets.

## Subtasks

### 2.1. Define Database Tables and Relationships

**Status:** in-progress  
**Dependencies:** None  

Create detailed schema definitions for all required tables with proper relationships and constraints

**Details:**

Define complete table structures including primary keys, foreign keys, indexes, and constraints for Users, Events, Invitations, Attendance, Feedback, and Reports tables. Document all relationships between tables (one-to-many, many-to-many). Include data types, nullability, and default values for each column.

### 2.2. Implement Database Migrations with Alembic

**Status:** cancelled  
**Dependencies:** 2.1  

Set up Alembic migration framework and create initial migration scripts for all tables

**Details:**

Initialize Alembic for the project. Create migration scripts for all tables defined in subtask 1. Include upgrade and downgrade paths for each migration. Set up version control for migrations. Configure Alembic environment for development, testing, and production environments.
<info added on 2026-09-03T11:08:48Z>
Cancelled: stack is TypeORM, not Alembic. Postgres migrations are task 25.
</info>

### 2.3. Implement SQLAlchemy ORM Models

**Status:** cancelled  
**Dependencies:** 2.1  

Create SQLAlchemy ORM models for all database tables with proper relationships and validation

**Details:**

Develop SQLAlchemy ORM models for all tables. Implement relationships between models (e.g., User to Events, Events to Invitations). Add validation rules and constraints at the model level. Implement helper methods for common queries. Create base model class with common functionality.
<info added on 2026-09-03T11:08:48Z>
Cancelled: TypeORM entities already exist in backend/src. Remaining ownership fields are task 26.
</info>

### 2.4. Set Up Redis for Caching and Session Management

**Status:** deferred  
**Dependencies:** 2.3  

Configure Redis for the application and implement caching and session management functionality

**Details:**

Install and configure Redis for development and production environments. Implement session management using Redis. Create caching layer for frequently accessed data. Set up appropriate TTL (Time To Live) values for cached items. Implement cache invalidation strategies. Create utility functions for interacting with Redis.
<info added on 2026-09-03T11:08:48Z>
Deferred: Redis is not needed for the local SQLite MVP.
</info>

### 2.5. Create Database Access Layer and Repository Pattern

**Status:** cancelled  
**Dependencies:** 2.3, 2.4  

Implement a database access layer using the repository pattern to abstract database operations

**Details:**

Design and implement repository interfaces for each model. Create concrete repository implementations using SQLAlchemy. Implement CRUD operations for all models. Add transaction management. Implement query optimization techniques. Create unit of work pattern for managing related operations. Integrate Redis caching with repositories for improved performance.
<info added on 2026-09-03T11:08:48Z>
Cancelled: Nest services talk to TypeORM repositories directly; no SQLAlchemy access layer.
</info>
