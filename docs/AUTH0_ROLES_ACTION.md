Auth0 Action: Add Roles to Access Tokens

Use this Post Login Action to inject user roles into access tokens (and ID tokens) so the backend can enforce RBAC without dev headers.

Prerequisites
- In your Auth0 API (the one used as audience), enable RBAC and "Add Permissions in the Access Token".
- Assign roles to users or via rules/automations.

Steps
1) In Auth0 Dashboard → Actions → Library → Build Custom → Post Login
2) Paste the code below
3) Deploy → Add to your Post Login flow (drag into the flow and Save)

Code (TypeScript/JS)
```js
exports.onExecutePostLogin = async (event, api) => {
  // event.authorization.roles is available when RBAC is enabled and roles are assigned
  const roles = event.authorization && Array.isArray(event.authorization.roles)
    ? event.authorization.roles
    : [];

  // Custom claim namespace must be an https URL you control
  const CLAIM = 'https://epicsexual.com/roles';

  // Put roles into both access and ID tokens
  api.accessToken.setCustomClaim(CLAIM, roles);
  api.idToken.setCustomClaim(CLAIM, roles);
};
```

Backend Expectation
- JwtAuthGuard reads roles from claim `https://epicsexual.com/roles`.
- Once this Action is active, you can remove the dev role headers on host pages.

Troubleshooting
- After deploying the Action, sign out and sign in again to refresh tokens.
- Inspect your access token at jwt.io and confirm it contains the custom claim with roles.


