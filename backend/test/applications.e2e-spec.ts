import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';
import {
  clearCapturedEmails,
  getCapturedEmails,
} from '../src/email/email-outbox';

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

  it('GET /applications/mine lists the authenticated applicant applications', async () => {
    const event = await createEvent(app.getHttpServer());

    await request(app.getHttpServer())
      .get('/applications/mine')
      .set(userAuth('user|mine-list'))
      .expect(200)
      .expect({ items: [] });

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|mine-list'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: invite.body.code,
      })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/applications/mine')
      .set(userAuth('user|mine-list'))
      .expect(200);

    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0].eventId).toBe(event.id);
    expect(mine.body.items[0].eventTitle).toBe('Party');
    expect(mine.body.items[0].status).toBe('pending');

    await request(app.getHttpServer())
      .patch(`/applications/${mine.body.items[0].id}/decision`)
      .set(hostAuth())
      .send({ status: 'approved' })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get('/applications/mine')
      .set(userAuth('user|mine-list'))
      .expect(200);
    expect(after.body.items[0].status).toBe('approved');
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
      .send({
        eventId: event.id,
        answers: { q1: 'Yes' },
        acceptedCodeOfConduct: true,
        inviteCode: code,
      })
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
      .send({ status: 'approved', reason: 'Great application' })
      .expect(200);
    expect(decided.body.status).toBe('approved');
    expect(decided.body.decisionReason).toBe('Great application');
    expect(decided.body.decidedAt).toBeTruthy();
    expect(decided.body.decidedByHostId).toBe('test-user');
  });

  it('rejects duplicate applications before consuming another invite', async () => {
    const event = await createEvent(app.getHttpServer());
    const firstInvite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);
    const secondInvite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|duplicate'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: firstInvite.body.code,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|duplicate'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: secondInvite.body.code,
      })
      .expect(409);

    const stillAvailable = await request(app.getHttpServer())
      .get(`/invites/validate/${secondInvite.body.code}`)
      .expect(200);
    expect(stillAvailable.body.used).toBe(false);
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

  it('submit requires code of conduct acceptance', async () => {
    const event = await createEvent(app.getHttpServer());
    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|coc'))
      .send({
        eventId: event.id,
        answers: {},
        inviteCode: invite.body.code,
        acceptedCodeOfConduct: false,
      })
      .expect(400);
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
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: 'SOME_CODE',
      })
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
      .send({ eventId: event.id, answers: {}, acceptedCodeOfConduct: true })
      .expect(400);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|one'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: code,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|two'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: code,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|two'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: 'INVALID',
      })
      .expect(400);
  });

  it('allows application when the same user already redeemed the invite', async () => {
    const event = await createEvent(app.getHttpServer());

    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);
    const code = invite.body.code as string;

    await request(app.getHttpServer())
      .post(`/invites/redeem/${code}`)
      .set(userAuth('user|redeemer-first'))
      .expect(201);

    await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|redeemer-first'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: code,
      })
      .expect(201);
  });

  it('rejects a second approval when the event is at capacity', async () => {
    const event = await createEvent(app.getHttpServer(), 'test-user', {
      capacity: 1,
    });

    const inviteA = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);
    const inviteB = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    const first = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|one'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: inviteA.body.code,
      })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/applications')
      .set(userAuth('user|two'))
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: inviteB.body.code,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/applications/${first.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/applications/${second.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'approved' })
      .expect(400);
  });

  it('promotes waitlisted applications in FIFO order when capacity opens', async () => {
    const event = await createEvent(app.getHttpServer(), 'test-user', {
      capacity: 1,
    });

    const apply = async (userSub: string) => {
      const invite = await request(app.getHttpServer())
        .post(`/invites/generate/${event.id}`)
        .set(hostAuth())
        .expect(201);
      return await request(app.getHttpServer())
        .post('/applications')
        .set(userAuth(userSub))
        .send({
          eventId: event.id,
          answers: {},
          acceptedCodeOfConduct: true,
          inviteCode: invite.body.code,
        })
        .expect(201);
    };

    const approved = await apply('user|approved');
    const firstWaitlisted = await apply('user|waitlist-one');
    const secondWaitlisted = await apply('user|waitlist-two');

    await request(app.getHttpServer())
      .patch(`/applications/${approved.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'approved' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/applications/${firstWaitlisted.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'waitlisted', reason: 'Capacity reached' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/applications/${secondWaitlisted.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'waitlisted' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/applications/${firstWaitlisted.body.id}/promote`)
      .set(hostAuth())
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/applications/${approved.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'rejected', reason: 'Approval withdrawn' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/applications/${secondWaitlisted.body.id}/promote`)
      .set(hostAuth())
      .expect(400);

    const promoted = await request(app.getHttpServer())
      .post(`/applications/${firstWaitlisted.body.id}/promote`)
      .set(hostAuth())
      .expect(201);
    expect(promoted.body.status).toBe('approved');
    expect(promoted.body.promotedAt).toBeTruthy();

    const mine = await request(app.getHttpServer())
      .get('/applications/mine')
      .set(userAuth('user|waitlist-two'))
      .expect(200);
    expect(mine.body.items[0].status).toBe('waitlisted');
    expect(mine.body.items[0].waitlistPosition).toBe(1);
  });

  it('sends a decision email when the applicant is a registered user', async () => {
    clearCapturedEmails();
    const email = `applicant-${Date.now()}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1', host: false })
      .expect(201);
    const token = registered.body.token as string;
    const applicantId = registered.body.user.id as string;

    const event = await createEvent(app.getHttpServer());
    const invite = await request(app.getHttpServer())
      .post(`/invites/generate/${event.id}`)
      .set(hostAuth())
      .expect(201);

    const application = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventId: event.id,
        answers: {},
        acceptedCodeOfConduct: true,
        inviteCode: invite.body.code,
      })
      .expect(201);
    expect(application.body.applicantSub).toBe(applicantId);

    await request(app.getHttpServer())
      .patch(`/applications/${application.body.id}/decision`)
      .set(hostAuth())
      .send({ status: 'approved', reason: 'See you there' })
      .expect(200);

    const sent = getCapturedEmails();
    expect(
      sent.some((m) => m.to === email && m.subject.includes('Party')),
    ).toBe(true);
    expect(sent.some((m) => m.text.includes('See you there'))).toBe(true);
  });
});
