import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

describe('Applications (e2e)', () => {
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

  it('POST /applications requires auth', async () => {
    await request(app.getHttpServer())
      .post('/applications')
      .send({ eventId: 'e1' })
      .expect(401);
  });

  it('submit/list/decide flow (host protected listing/decision)', async () => {
    const event = await createEvent(app.getHttpServer());

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);
    const code = invite.body.code as string;

    const submit = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|abc'))
      .send({ eventId: event.id, answers: { q1: 'Yes' }, inviteCode: code })
      .expect(201);
    const appId = submit.body.id as string;
    expect(submit.body.applicantSub).toBe('user|abc');

    const listed = await request(app.getHttpServer())
      .get(`/applications/event/${event.id}`)
      .set(hostAuth())
      .expect(200);
    expect(Array.isArray(listed.body?.items)).toBe(true);
    expect(
      listed.body.items.find((a: { id: string }) => a.id === appId),
    ).toBeTruthy();

    const decided = await request(app.getHttpServer())
      .patch(`/applications/${appId}/decision`)
      .set(hostAuth())
      .send({ status: 'approved' })
      .expect(200);
    expect(decided.body.status).toBe('approved');
  });

  it('form set/get flow (host set, public get)', async () => {
    const event = await createEvent(app.getHttpServer());

    const set = await request(app.getHttpServer())
      .put(`/applications/event/${event.id}/form`)
      .set(hostAuth())
      .send({
        schema: { fields: [{ name: 'why', type: 'text', required: true }] },
      })
      .expect(200);
    expect(set.body.eventId).toBe(event.id);

    const got = await request(app.getHttpServer())
      .get(`/applications/event/${event.id}/form`)
      .expect(200);
    expect(got.body?.schema?.fields?.[0]?.name).toBe('why');
  });

  it('submit should 400 when required fields missing', async () => {
    const event = await createEvent(app.getHttpServer());

    await request(app.getHttpServer())
      .put(`/applications/event/${event.id}/form`)
      .set(hostAuth())
      .send({
        schema: { fields: [{ name: 'why', type: 'text', required: true }] },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|abc'))
      .send({ eventId: event.id, answers: {}, inviteCode: 'SOME_CODE' })
      .expect(400);
  });

  it('submit should fail without invite code and with used/invalid code', async () => {
    const event = await createEvent(app.getHttpServer());

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);
    const code = invite.body.code as string;

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|one'))
      .send({ eventId: event.id, answers: {} })
      .expect(400);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|one'))
      .send({ eventId: event.id, answers: {}, inviteCode: code })
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|two'))
      .send({ eventId: event.id, answers: {}, inviteCode: code })
      .expect(400);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|two'))
      .send({ eventId: event.id, answers: {}, inviteCode: 'INVALID' })
      .expect(400);
  });
});
