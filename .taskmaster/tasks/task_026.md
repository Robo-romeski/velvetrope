# Task ID: 26

**Title:** Honest local MVP hardening

**Status:** pending

**Dependencies:** 3 ✓

**Priority:** high

**Description:** Security and correctness gaps that block treating the current event loop as a real MVP. Do this before AWS, guest payments, or Automaton infra PRs.

**Details:**

From the Sep 2026 repo investigation and velvetrope PR #1 review.

Priority order:
1. Add hostId (Auth0 sub) to EventEntity; enforce ownership on every host mutation.
2. Bind Stripe Connect accounts to the authenticated host; drop host-dev-123.
3. Let approved attendees fetch their own check-in token; stop calling host-only issue from the ticket page.
4. Generate invite codes and check-in tokens with crypto.randomBytes.
5. Stripe webhook must not return HTTP 200 when signature verification fails.

Out of scope: merge PR #1, AWS EKS, Grafana, guest Checkout (still 9.3).

**Test Strategy:**

e2e: host A cannot PATCH host B's event. Stripe onboarding uses JWT sub. Approved attendee gets a token from a non-host endpoint. Tokens come from crypto. Webhook returns 4xx on a bad signature.

## Subtasks

### 26.1. Event ownership (hostId)

**Status:** pending  
**Dependencies:** None  

Add hostId to events and enforce it on all host mutations.

**Details:**

EventEntity has no hostId. Any host can mutate any event. Store Auth0 sub on create; ownership check on PATCH/DELETE/publish/cancel, application review, invite generate, check-in issue.

### 26.2. Bind Stripe Connect to Auth0 sub

**Status:** pending  
**Dependencies:** 26.1  

Stop using URL hostId / host-dev-123.

**Details:**

stripe.controller.ts keys accounts by path param. frontend/app/host/stripe/page.tsx hardcodes host-dev-123. Use req.user.sub.

### 26.3. Attendee check-in token

**Status:** pending  
**Dependencies:** 26.1  

Approved attendees fetch their own token; ticket page must not call a host-only issue API.

**Details:**

POST /checkin/issue/:eventId is @Roles('host'). Ticket page posts as a normal user with userSub user|demo. Add an attendee endpoint that issues (or returns) a token only for an approved application of the JWT sub.

### 26.4. Crypto invite and check-in tokens

**Status:** pending  
**Dependencies:** None  

Replace Math.random with crypto.randomBytes for invite codes and check-in tokens.

**Details:**

invites.service.ts and checkin.service.ts currently use Math.random.

### 26.5. Stripe webhook fail closed

**Status:** pending  
**Dependencies:** 26.2  

Return 4xx when signature verification is skipped or fails; do not ACK with HTTP 200.

**Details:**

webhook.controller.ts returns 200 with ok:false on verify failure, which makes Stripe stop retrying.
