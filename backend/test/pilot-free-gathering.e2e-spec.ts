import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { registerPayload } from './register-payload';
import { CURRENT_TERMS_VERSION } from '../src/auth/signup-requirements';

describe('Pilot free gathering (e2e)', () => {
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

  it('rejects registration without adult confirmation and terms', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `reject-${Date.now()}@example.com`,
        password: 'password1',
        host: false,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(
        registerPayload({
          email: `bad-terms-${Date.now()}@example.com`,
          acceptedTermsVersion: '0.0.0',
        }),
      )
      .expect(400);
  });

  it('accepts registration with pilot signup requirements', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(
        registerPayload({
          email: `pilot-signup-${Date.now()}@example.com`,
          name: 'Pilot User',
        }),
      )
      .expect(201);
    expect(res.body.user.id).toBeTruthy();
    expect(res.body.token).toBeTruthy();
    expect(CURRENT_TERMS_VERSION).toBeTruthy();
  });

  it('redacts exact address until attendee is approved', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .set(hostAuth('pilot-location-host'))
      .send({
        title: 'Location Privacy Night',
        date: new Date(Date.now() + 86400000 * 7).toISOString(),
        capacity: 10,
        locationPublicLabel: 'Brooklyn, NY',
        locationExactAddress: '123 Secret St, Brooklyn, NY 11201',
      })
      .expect(201);
    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .post(`/events/${eventId}/publish`)
      .set(hostAuth('pilot-location-host'))
      .expect(201);

    const publicView = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .expect(200);
    expect(publicView.body.locationPublicLabel).toBe('Brooklyn, NY');
    expect(publicView.body.locationExactAddress).toBeNull();

    const hostView = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .set(hostAuth('pilot-location-host'))
      .expect(200);
    expect(hostView.body.locationExactAddress).toContain('123 Secret');

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${eventId}`)
      .set(hostAuth('pilot-location-host'))
      .expect(201);

    const application = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('pilot-location-attendee'))
      .send({
        eventId,
        inviteCode: invite.body.code,
        acceptedCodeOfConduct: true,
      })
      .expect(201);

    const pendingView = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .set(userAuth('pilot-location-attendee'))
      .expect(200);
    expect(pendingView.body.locationExactAddress).toBeNull();

    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set(hostAuth('pilot-location-host'))
      .send({ status: 'approved' })
      .expect(200);

    const approvedView = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .set(userAuth('pilot-location-attendee'))
      .expect(200);
    expect(approvedView.body.locationExactAddress).toContain('123 Secret');
  });
});
