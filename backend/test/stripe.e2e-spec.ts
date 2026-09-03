import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth } from './auth-headers';

describe('Stripe (e2e)', () => {
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

  it('GET /stripe/onboarding requires host role', async () => {
    await request(app.getHttpServer())
      .get('/stripe/onboarding')
      .set('Authorization', 'Bearer invalid.token')
      .expect(401);
  });

  it('GET /stripe/onboarding returns a link bound to the authenticated host', async () => {
    const res = await request(app.getHttpServer())
      .get('/stripe/onboarding')
      .set(hostAuth('host-stripe'))
      .expect(200);
    expect(typeof res.body?.url).toBe('string');
    expect(res.body.url).toContain('connect.stripe.com');
    expect(res.body.url).toContain(encodeURIComponent('host-stripe'));
  });

  it('GET /stripe/status is keyed by the authenticated host', async () => {
    await request(app.getHttpServer())
      .get('/stripe/onboarding')
      .set(hostAuth('host-status'))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/stripe/status')
      .set(hostAuth('host-status'))
      .expect(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.accountId).toBe('acct_host-status');
  });

  it('POST /stripe/webhook fails closed without a valid signature', async () => {
    await request(app.getHttpServer())
      .post('/stripe/webhook')
      .send({ type: 'account.updated' })
      .expect(400);
  });
});
