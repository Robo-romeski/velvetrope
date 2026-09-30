import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

describe('Photo check-in (e2e)', () => {
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

  it('requires an uploaded photo and explicit host confirmation', async () => {
    const hostSub = 'photo-host';
    const attendeeSub = 'photo-attendee';
    const event = await createEvent(app.getHttpServer(), hostSub, {
      title: 'Photo Event',
      date: new Date(Date.now() + 86_400_000).toISOString(),
      requirePhotoCheckin: true,
    });
    await request(app.getHttpServer())
      .post(`/events/${event.id}/publish`)
      .set(hostAuth(hostSub))
      .expect(201);

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth(hostSub))
      .expect(201);
    const application = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth(attendeeSub))
      .send({
        eventId: event.id,
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

    const ticket = await request(app.getHttpServer())
      .post(`/checkin/mine/${event.id}`)
      .set(userAuth(attendeeSub))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/checkin/verify/${ticket.body.token}`)
      .set(hostAuth(hostSub))
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .post(`/checkin/photo/mine/${event.id}/upload`)
      .set(userAuth(attendeeSub))
      .send({ contentType: 'text/plain', sizeBytes: 100 })
      .expect(400);

    const upload = await request(app.getHttpServer())
      .post(`/checkin/photo/mine/${event.id}/upload`)
      .set(userAuth(attendeeSub))
      .send({ contentType: 'image/jpeg', sizeBytes: 1024 })
      .expect(201);
    expect(upload.body.uploadUrl).toContain('storage.test.invalid');

    await request(app.getHttpServer())
      .post(`/checkin/photo/mine/${event.id}/complete`)
      .set(userAuth(attendeeSub))
      .send({ photoId: upload.body.photoId })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/checkin/photo/ticket/${ticket.body.token}`)
      .set(hostAuth('other-host'))
      .expect(403);

    const photo = await request(app.getHttpServer())
      .get(`/checkin/photo/ticket/${ticket.body.token}`)
      .set(hostAuth(hostSub))
      .expect(200);
    expect(photo.body.required).toBe(true);
    expect(photo.body.uploaded).toBe(true);
    expect(photo.body.url).toContain('storage.test.invalid');

    await request(app.getHttpServer())
      .post(`/checkin/verify/${ticket.body.token}`)
      .set(hostAuth(hostSub))
      .send({ photoConfirmed: true })
      .expect(201);

    const status = await request(app.getHttpServer())
      .get(`/checkin/photo/mine/${event.id}`)
      .set(userAuth(attendeeSub))
      .expect(200);
    expect(status.body.uploaded).toBe(true);
    expect(status.body.verifiedAt).toBeTruthy();
  });
});
