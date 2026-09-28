import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

describe('Chat and feedback (e2e)', () => {
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

  const approveAttendee = async (
    eventId: string,
    hostSub: string,
    attendeeSub: string,
  ) => {
    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${eventId}`)
      .set(hostAuth(hostSub))
      .expect(201);
    const application = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth(attendeeSub))
      .send({
        eventId,
        inviteCode: invite.body.code,
        answers: {},
        acceptedCodeOfConduct: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set(hostAuth(hostSub))
      .send({ status: 'approved' })
      .expect(200);
  };

  it('persists attendee chat and lets only the event host moderate', async () => {
    const hostSub = 'chat-host';
    const attendeeSub = 'chat-attendee';
    const event = await createEvent(app.getHttpServer(), hostSub, {
      title: 'Chat Event',
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    await request(app.getHttpServer())
      .post(`/events/${event.id}/publish`)
      .set(hostAuth(hostSub))
      .expect(201);
    await approveAttendee(event.id, hostSub, attendeeSub);

    await request(app.getHttpServer())
      .get(`/chat/event/${event.id}`)
      .set(userAuth('not-approved'))
      .expect(403);

    const created = await request(app.getHttpServer())
      .post(`/chat/event/${event.id}`)
      .set(userAuth(attendeeSub))
      .send({ body: 'Looking forward to this event.' })
      .expect(201);
    expect(created.body.body).toBe('Looking forward to this event.');

    const listed = await request(app.getHttpServer())
      .get(`/chat/event/${event.id}`)
      .set(userAuth(attendeeSub))
      .expect(200);
    expect(listed.body.items).toHaveLength(1);
    expect(listed.body.items[0].id).toBe(created.body.id);

    await request(app.getHttpServer())
      .delete(`/chat/messages/${created.body.id}`)
      .set(hostAuth('other-host'))
      .expect(403);

    const deleted = await request(app.getHttpServer())
      .delete(`/chat/messages/${created.body.id}`)
      .set(hostAuth(hostSub))
      .expect(200);
    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.body).toBeNull();
  });

  it('accepts one post-event feedback response and aggregates for host', async () => {
    const hostSub = 'feedback-host';
    const attendeeSub = 'feedback-attendee';
    const event = await createEvent(app.getHttpServer(), hostSub, {
      title: 'Past Event',
      date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    await request(app.getHttpServer())
      .post(`/events/${event.id}/publish`)
      .set(hostAuth(hostSub))
      .expect(201);
    await approveAttendee(event.id, hostSub, attendeeSub);

    await request(app.getHttpServer())
      .post(`/feedback/event/${event.id}`)
      .set(userAuth(attendeeSub))
      .send({ rating: 7 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/feedback/event/${event.id}`)
      .set(userAuth(attendeeSub))
      .send({
        rating: 5,
        comment: 'A thoughtful and welcoming event.',
        anonymous: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/feedback/event/${event.id}`)
      .set(userAuth(attendeeSub))
      .send({ rating: 4 })
      .expect(409);

    const mine = await request(app.getHttpServer())
      .get(`/feedback/mine/${event.id}`)
      .set(userAuth(attendeeSub))
      .expect(200);
    expect(mine.body.submitted).toBe(true);
    expect(mine.body.rating).toBe(5);

    await request(app.getHttpServer())
      .get(`/feedback/event/${event.id}`)
      .set(hostAuth('other-host'))
      .expect(403);

    const summary = await request(app.getHttpServer())
      .get(`/feedback/event/${event.id}`)
      .set(hostAuth(hostSub))
      .expect(200);
    expect(summary.body.count).toBe(1);
    expect(summary.body.averageRating).toBe(5);
    expect(summary.body.distribution['5']).toBe(1);
    expect(summary.body.comments[0].authorSub).toBeNull();
  });
});
