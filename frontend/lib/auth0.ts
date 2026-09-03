import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  appBaseUrl: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000',
  authorizationParameters: {
    redirect_uri: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/callback`,
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    scope: 'openid profile email'
  }
});


