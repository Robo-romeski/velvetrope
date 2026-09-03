# Task ID: 6

**Title:** Event Creation and Management

**Status:** in-progress

**Dependencies:** 2 ⧖, 3 ✓

**Priority:** high

**Description:** Event CRUD + draft/publish/cancel exist. Missing hostId: any host can mutate any event. Ownership is task 26.1.

**Details:**

1. Create event creation form with validation
2. Implement event editing and deletion functionality
3. Add support for setting event capacity, location, date/time
4. Create event dashboard for hosts to manage their events
5. Implement event status management (draft, published, cancelled)
6. Add functionality to generate and manage invite codes
7. Create backend API endpoints for event CRUD operations
8. Implement event search and filtering functionality

**Test Strategy:**

Test event creation, editing, and deletion with various inputs. Verify that validation works correctly. Test event management dashboard functionality.

## Subtasks

### 6.1. Create Event Form and Validation

**Status:** done  
**Dependencies:** None  

Develop a comprehensive event creation form with client-side and server-side validation for all event details

**Details:**

Build a form with fields for event title, description, date/time, location, capacity, and other relevant details. Implement validation for required fields, date formats, capacity limits, and other constraints. Include error messaging and visual feedback for validation failures.

### 6.2. Implement Event CRUD API Endpoints

**Status:** done  
**Dependencies:** 6.1  

Create backend API endpoints for creating, reading, updating, and deleting events

**Details:**

Develop RESTful API endpoints for event management including POST /events, GET /events/:id, PUT /events/:id, DELETE /events/:id. Implement proper authentication and authorization checks. Include data validation, error handling, and appropriate HTTP status codes.

### 6.3. Build Event Management Dashboard

**Status:** in-progress  
**Dependencies:** 6.2  

Create a dashboard interface for hosts to view and manage their events

**Details:**

Develop a dashboard showing all events created by the host with filtering and sorting options. Include event metrics (registrations, capacity), status indicators, and quick action buttons for editing, publishing, or cancelling events. Implement pagination for hosts with many events.

### 6.4. Implement Event Status Management

**Status:** done  
**Dependencies:** 6.2, 6.3  

Create functionality to manage event lifecycle states including draft, published, and cancelled

**Details:**

Implement status transitions with appropriate validation (e.g., preventing cancellation of past events). Create visual indicators for each status. Add confirmation dialogs for status changes with potential impact. Implement notifications for attendees when event status changes.

### 6.5. Develop Invite Code Generation and Management

**Status:** done  
**Dependencies:** 6.2, 6.4  

Create functionality to generate, distribute, and validate unique invite codes for events

**Details:**

Implement secure code generation with configurable parameters (length, expiration). Create interface for hosts to view, copy, and revoke codes. Add functionality to track code usage and limit redemptions. Implement API endpoints for code validation and redemption.
