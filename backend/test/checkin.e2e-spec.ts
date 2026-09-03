import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

describe('Checkin (e2e)', () => {
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

  it('host can issue a ticket and verify it once', async () => {
    const event = await createEvent(app.getHttpServer());

    const issue = await request(app.getHttpServer())
      .post(`/checkin/issue/${event.id}`)
      .set(hostAuth())
      .send({ userSub: 'user|checkin1' })
      .expect(201);
    const token = issue.body.token as string;

    const verified = await request(app.getHttpServer())
      .post(`/checkin/verify/${token}`)
      .set(hostAuth())
      .expect(201);
    expect(verified.body.usedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/checkin/verify/${token}`)
      .set(hostAuth())
      .expect(400);
  });

  it('attendee can fetch their ticket only after approval', async () => {
    const event = await createEvent(app.getHttpServer());

    await request(app.getHttpServer())
      .post(`/checkin/mine/${event.id}`)
      .set(userAuth('user|guest'))
      .expect(403);

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    const submitted = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|guest'))
      .send({ eventId: event.id, answers: {}, inviteCode: invite.body.code })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/applications/${submitted.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'approved' })
      .expect(200);

    const ticket = await request(app.getHttpServer())
      .post(`/checkin/mine/${event.id}`)
      .set(userAuth('user|guest'))
      .expect(201);
    expect(ticket.body.userSub).toBe('user|guest');
    expect(typeof ticket.body.token).toBe('string');
  });
});
