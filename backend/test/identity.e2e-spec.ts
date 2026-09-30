import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureHttpApp } from '../src/bootstrap';

describe('Persona identity verification (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.PERSONA_WEBHOOK_SECRET = 'persona_test_webhook_secret';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureHttpApp(app);
    await app.init();
  });

  afterAll(async () => {
    delete process.env.PERSONA_WEBHOOK_SECRET;
    await app.close();
  });

  it('gates ticket issuance until an idempotent signed approval webhook', async () => {
    const nonce = Date.now();
    const password = 'password1';
    const host = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `identity-host-${nonce}@example.com`,
        password,
        host: true,
      })
      .expect(201);
    const attendee = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `identity-attendee-${nonce}@example.com`,
        password,
        host: false,
      })
      .expect(201);
    const hostToken = host.body.token as string;
    const attendeeToken = attendee.body.token as string;

    const session = await request(app.getHttpServer())
      .post('/identity/session')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({})
      .expect(201);
    expect(session.body.status).toBe('pending');
    expect(session.body.inquiryId).toMatch(/^inq_test_/);
    expect(session.body.sessionToken).toMatch(/^session_test_/);

    const event = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Verified Event',
        date: new Date(Date.now() + 86_400_000).toISOString(),
        capacity: 10,
        requireIdentityVerification: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/events/${event.body.id}/publish`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({})
      .expect(201);
    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.body.id}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({})
      .expect(201);
    const application = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        eventId: event.body.id,
        inviteCode: invite.body.code,
        answers: {},
        acceptedCodeOfConduct: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ status: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/checkin/mine/${event.body.id}`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({})
      .expect(403);

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      data: {
        id: `evt_${nonce}`,
        attributes: {
          name: 'inquiry.approved',
          payload: {
            data: {
              id: session.body.inquiryId,
            },
          },
        },
      },
    });
    const signature = createHmac('sha256', process.env.PERSONA_WEBHOOK_SECRET!)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    const header = `t=${timestamp},v1=${signature}`;

    await request(app.getHttpServer())
      .post('/identity/persona/webhook')
      .set('Content-Type', 'application/json')
      .set('Persona-Signature', 't=1,v1=invalid')
      .send(payload)
      .expect(400);

    await request(app.getHttpServer())
      .post('/identity/persona/webhook')
      .set('Content-Type', 'application/json')
      .set('Persona-Signature', header)
      .send(payload)
      .expect(200)
      .expect({ ok: true });
    await request(app.getHttpServer())
      .post('/identity/persona/webhook')
      .set('Content-Type', 'application/json')
      .set('Persona-Signature', header)
      .send(payload)
      .expect(200)
      .expect({ ok: true, ignored: true });

    const status = await request(app.getHttpServer())
      .get('/identity/status')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .expect(200);
    expect(status.body.status).toBe('approved');
    expect(status.body.verifiedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/checkin/mine/${event.body.id}`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({})
      .expect(201);
  });
});
