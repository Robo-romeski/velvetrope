import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth } from './auth-headers';
import { createEvent } from './create-event';

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

  it('paid event requires checkout before ticket; fulfill is idempotent', async () => {
    await request(app.getHttpServer())
      .get('/stripe/onboarding')
      .set(hostAuth('host-paid'))
      .expect(200);

    const event = await createEvent(app.getHttpServer(), 'host-paid');
    await request(app.getHttpServer())
      .patch(`/events/${event.id}`)
      .set(hostAuth('host-paid'))
      .send({ ticketPriceCents: 1500 })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/events/${event.id}/publish`)
      .set(hostAuth('host-paid'))
      .expect(201);

    const email = `paid-${Date.now()}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1', host: false })
      .expect(201);
    const token = registered.body.token as string;

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth('host-paid'))
      .expect(201);

    const application = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventId: event.id,
        answers: {},
        inviteCode: invite.body.code,
        acceptedCodeOfConduct: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set(hostAuth('host-paid'))
      .send({ status: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/checkin/mine/${event.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const checkout = await request(app.getHttpServer())
      .post(`/stripe/checkout/${event.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    const sessionId = checkout.body.sessionId as string;
    expect(sessionId).toMatch(/^cs_test_/);

    await request(app.getHttpServer())
      .post('/stripe/test/fulfill-checkout')
      .send({ sessionId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/stripe/test/fulfill-checkout')
      .send({ sessionId })
      .expect(201);

    const ticket = await request(app.getHttpServer())
      .post(`/checkin/mine/${event.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(ticket.body.token).toBeTruthy();
  });
});
