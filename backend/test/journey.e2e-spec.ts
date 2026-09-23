import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';

/**
 * End-to-end host + attendee journey: publish, invite, apply, approve, ticket, check-in.
 */
describe('Full journey (e2e)', () => {
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

  it('host publish → invite → attendee apply → approve → ticket → verify', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .set(hostAuth('host-journey'))
      .send({
        title: 'Journey Night',
        date: new Date(Date.now() + 86400000).toISOString(),
        capacity: 10,
      })
      .expect(201);
    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .post(`/events/${eventId}/publish`)
      .set(hostAuth('host-journey'))
      .expect(201);

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${eventId}`)
      .set(hostAuth('host-journey'))
      .expect(201);
    const code = invite.body.code as string;

    const application = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('attendee-journey'))
      .send({ eventId, answers: { note: 'hello' }, inviteCode: code })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set(hostAuth('host-journey'))
      .send({ status: 'approved' })
      .expect(200);

    const ticket = await request(app.getHttpServer())
      .post(`/checkin/mine/${eventId}`)
      .set(userAuth('attendee-journey'))
      .expect(201);
    const token = ticket.body.token as string;
    expect(token).toBeTruthy();

    const verified = await request(app.getHttpServer())
      .post(`/checkin/verify/${encodeURIComponent(token)}`)
      .set(hostAuth('host-journey'))
      .expect(201);
    expect(verified.body.usedAt).toBeTruthy();
  });
});
