# Task ID: 7

**Title:** Event Application System

**Status:** in-progress

**Dependencies:** 5, 6 ⧖

**Priority:** medium

**Description:** Dynamic form schema, submit with invite, host list + approve/reject shipped. No email notifications (7.5). ApplicantSub body fallback remains a risk (task 26).

**Details:**

1. Create event application form with custom questions option for hosts
2. Implement application submission and status tracking
3. Create application review dashboard for hosts
4. Implement approval/rejection functionality with optional feedback
5. Add notification system for application status updates
6. Create backend API endpoints for application management
7. Implement application analytics for hosts (acceptance rate, etc.)

**Test Strategy:**

Test application submission with various inputs. Verify that hosts can review and respond to applications. Test notification delivery for status updates.

## Subtasks

### 7.1. Application Form Builder

**Status:** done  
**Dependencies:** None  

Create a flexible form builder that allows event hosts to create custom application forms with various question types.

**Details:**

Implement a drag-and-drop interface for hosts to add, remove, and reorder questions. Support multiple question types including text, multiple choice, checkboxes, and file uploads. Allow hosts to mark questions as required or optional. Include validation rules for different question types.

### 7.2. Application Submission System

**Status:** done  
**Dependencies:** 7.1  

Implement the frontend and backend components for attendees to submit applications and track their status.

**Details:**

Create a user-friendly interface for filling out application forms. Implement form validation based on host requirements. Add progress saving functionality for long applications. Create a status tracking dashboard for applicants to view their pending, approved, or rejected applications.

### 7.3. Host Review Dashboard

**Status:** done  
**Dependencies:** 7.2  

Create a comprehensive dashboard for hosts to review, filter, and manage incoming applications.

**Details:**

Implement a dashboard showing all applications with filtering options (pending, approved, rejected). Create detailed application view with all submitted information. Add bulk action capabilities for processing multiple applications. Implement search functionality to find specific applications.

### 7.4. Application Decision System

**Status:** done  
**Dependencies:** 7.3  

Implement functionality for hosts to approve or reject applications with optional feedback.

**Details:**

Create approve/reject buttons with confirmation dialogs. Implement feedback form for hosts to provide reasons for decisions. Add waitlist functionality for borderline applications. Create automated response templates that hosts can customize.

### 7.5. Application Notification System

**Status:** pending  
**Dependencies:** 7.4  

Implement a notification system to alert users about application status changes and updates.

**Details:**

Create in-app notifications for application status changes. Implement email notifications with application decision details. Add customizable notification templates for different application statuses. Create notification preferences for users to control how they receive updates.
