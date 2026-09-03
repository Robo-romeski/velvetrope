import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

async function fetchM2MToken(): Promise<string | null> {
  const issuer = process.env.AUTH0_ISSUER;
  const audience = process.env.AUTH0_AUDIENCE;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  if (!issuer || !audience || !clientId || !clientSecret) return null;

  const url = new URL('/oauth/token', issuer).toString();
  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('audience', audience);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    try {
      const err = await res.json();
      // eslint-disable-next-line no-console
      console.warn('Auth0 token error', res.status, err);
    } catch (e) {
      const txt = await res.text();
      // eslint-disable-next-line no-console
      console.warn('Auth0 token error (text)', res.status, txt);
    }
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

describe('Auth (e2e) M2M', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /protected should return 200 with a real M2M token', async () => {
    const token = await fetchM2MToken();
    if (!token) {
      console.warn('Skipping M2M test: missing or invalid AUTH0 credentials');
      return;
    }
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
