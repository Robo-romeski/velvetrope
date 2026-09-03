# Task ID: 4

**Title:** ID Verification Integration

**Status:** deferred

**Dependencies:** 2 ⧖, 3 ✓

**Priority:** high

**Description:** Integrate Persona/Onfido for identity verification and implement the verification flow in the application.

**Details:**

1. Set up Persona or Onfido account and API credentials
2. Implement frontend components for ID verification process
3. Create backend API endpoints to handle verification requests and callbacks
4. Store verification status and results in the database
5. Implement verification status checks throughout the application
6. Create admin dashboard for manual verification review if needed
7. Handle verification failure scenarios and user feedback
<info added on 2026-09-03T11:08:48Z>
Deferred 3 Sep 2026: PRD IDV is not started and is not blocking a honest local event loop. Do task 26 (ownership, Stripe bind, attendee tickets) and task 1.5 (real CI) first.
</info>

**Test Strategy:**

Test verification flow with test credentials provided by Persona/Onfido. Verify that verification status is correctly stored and retrieved. Test edge cases like verification failures and retries.

## Subtasks

### 4.1. Set up ID Verification Provider

**Status:** pending  
**Dependencies:** None  

Set up Persona or Onfido account, obtain API credentials, and configure the integration settings

**Details:**

Research both Persona and Onfido to determine the best fit for the application requirements. Create an account with the chosen provider. Generate API keys and configure webhook endpoints. Set up test environments for development. Document the integration process and API credentials securely.

### 4.2. Implement Frontend Verification Flow

**Status:** pending  
**Dependencies:** 4.1  

Create frontend components and user interface for the ID verification process

**Details:**

Design and implement UI components for user identity verification including document upload, selfie capture, and verification status screens. Integrate the provider's SDK or API for frontend implementation. Create a seamless user experience with clear instructions and error handling. Implement responsive design for mobile and desktop verification.

### 4.3. Develop Backend Verification Services

**Status:** pending  
**Dependencies:** 4.1  

Create backend API endpoints to handle verification requests, callbacks, and store verification results

**Details:**

Implement API endpoints to initiate verification sessions, handle webhook callbacks from the provider, and process verification results. Create database schema for storing verification status, history, and related user data. Implement secure storage of verification data with proper encryption. Create services to query verification status.

### 4.4. Implement Verification Status Management

**Status:** pending  
**Dependencies:** 4.2, 4.3  

Integrate verification status checks throughout the application and handle verification failure scenarios

**Details:**

Implement middleware or services to check verification status at critical points in the application. Create user feedback mechanisms for verification failures with clear instructions for resolution. Implement retry logic for failed verifications. Add verification status indicators in the user interface. Create notification system for verification status updates.

### 4.5. Create Admin Verification Dashboard

**Status:** pending  
**Dependencies:** 4.3, 4.4  

Develop an admin dashboard for manual verification review and management

**Details:**

Design and implement an admin dashboard for reviewing verification submissions. Create interfaces for manual approval, rejection, or requesting additional information. Implement filtering and sorting of verification requests by status, date, and other criteria. Add audit logging for admin actions. Implement admin notification system for new verification requests requiring review.
