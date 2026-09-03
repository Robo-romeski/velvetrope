import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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
      .send({ eventId: 'e1', applicantSub: 'user|123' })
      .expect(401);
  });

  it('submit/list/decide flow (host protected listing/decision)', async () => {
    // generate invite for eventX
    const invite = await request(app.getHttpServer())
      .post('/invites/generate/eventX')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(201);
    const code = invite.body.code as string;

    // submit by attendee with invite
    const submit = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ eventId: 'eventX', applicantSub: 'user|abc', answers: { q1: 'Yes' }, inviteCode: code })
      .expect(201);
    const appId = submit.body.id as string;

    // host list
    const listed = await request(app.getHttpServer())
      .get('/applications/event/eventX')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(200);
    expect(Array.isArray(listed.body?.items)).toBe(true);
    expect(listed.body.items.find((a: any) => a.id === appId)).toBeTruthy();

    // host decision
    const decided = await request(app.getHttpServer())
      .patch(`/applications/${appId}/decision`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .send({ status: 'approved' })
      .expect(200);
    expect(decided.body.status).toBe('approved');
  });

  it('form set/get flow (host set, public get)', async () => {
    const set = await request(app.getHttpServer())
      .put('/applications/event/eventY/form')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .send({ schema: { fields: [{ name: 'why', type: 'text', required: true }] } })
      .expect(200);
    expect(set.body.eventId).toBe('eventY');

    const got = await request(app.getHttpServer())
      .get('/applications/event/eventY/form')
      .expect(200);
    expect(got.body?.schema?.fields?.[0]?.name).toBe('why');
  });

  it('submit should 400 when required fields missing', async () => {
    // set form with required field
    await request(app.getHttpServer())
      .put('/applications/event/eventZ/form')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .send({ schema: { fields: [{ name: 'why', type: 'text', required: true }] } })
      .expect(200);

    // attempt submit without required field
    await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ eventId: 'eventZ', applicantSub: 'user|abc', answers: {}, inviteCode: 'SOME_CODE' })
      .expect(400);
  });

  it('submit should fail without invite code and with used/invalid code', async () => {
    // generate invite for eventI
    const invite = await request(app.getHttpServer())
      .post('/invites/generate/eventI')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(201);
    const code = invite.body.code as string;

    // missing invite code
    await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ eventId: 'eventI', applicantSub: 'user|one', answers: {} })
      .expect(400);

    // valid submission with code
    await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ eventId: 'eventI', applicantSub: 'user|one', answers: {}, inviteCode: code })
      .expect(201);

    // using the same code again should fail
    await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ eventId: 'eventI', applicantSub: 'user|two', answers: {}, inviteCode: code })
      .expect(400);

    // invalid code
    await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '[]')
      .send({ eventId: 'eventI', applicantSub: 'user|two', answers: {}, inviteCode: 'INVALID' })
      .expect(400);
  });
});


