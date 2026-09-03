# Task ID: 9

**Title:** Stripe Connect Integration

**Status:** in-progress

**Dependencies:** 2 ⧖, 6 ⧖

**Priority:** high

**Description:** Connect Express onboarding exists but hostId is a path param; UI hardcodes host-dev-123. No Checkout/PaymentIntent. Webhook returns 200 on verify failure. Bind + webhook: task 26.

**Details:**

1. Set up Stripe Connect account and API credentials
2. Implement host onboarding to Stripe Connect
3. Create payment processing for event tickets
4. Implement automatic payouts to hosts
5. Add payment dashboard for hosts to track earnings
6. Implement refund processing for cancelled events
7. Create payment receipt generation and delivery
8. Implement webhook handling for Stripe events

**Test Strategy:**

Test payment processing with Stripe test credentials. Verify that hosts receive payouts correctly. Test refund processing and receipt generation.

## Subtasks

### 9.1. Stripe Connect Account Setup

**Status:** in-progress  
**Dependencies:** None  

Set up Stripe Connect account and API credentials for the platform

**Details:**

Create a Stripe Connect account for the platform, generate API keys, configure webhook endpoints, and set up the necessary platform settings for handling connected accounts and payments

### 9.2. Host Onboarding to Stripe Connect

**Status:** in-progress  
**Dependencies:** 9.1  

Implement the flow for hosts to connect their Stripe accounts to the platform

**Details:**

Create frontend components and backend APIs for hosts to connect their Stripe accounts, handle OAuth flow, store connected account IDs, and implement verification status tracking

### 9.3. Event Ticket Payment Processing

**Status:** pending  
**Dependencies:** 9.1  

Implement payment processing for event tickets using Stripe

**Details:**

Create payment intent creation, payment form components, handle successful payments, store transaction records, and implement payment status tracking for tickets

### 9.4. Host Payout System

**Status:** pending  
**Dependencies:** 9.2, 9.3  

Implement automatic payouts to hosts after successful events

**Details:**

Create payout scheduling system, implement transfer creation to connected accounts, handle payout failures, implement payout status tracking, and create notification system for hosts

### 9.5. Payment Dashboard and Webhooks

**Status:** in-progress  
**Dependencies:** 9.3, 9.4  

Create payment dashboard for hosts and implement webhook handling for Stripe events

**Details:**

Build dashboard UI for hosts to track earnings, implement webhook handlers for payment events, handle refund processing for cancelled events, and implement receipt generation and delivery
