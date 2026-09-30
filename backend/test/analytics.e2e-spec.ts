import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

describe('Analytics (e2e)', () => {
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

  it('requires host ownership and returns aggregate event/host metrics', async () => {
    const event = await createEvent(app.getHttpServer(), 'analytics-host', {
      capacity: 1,
      title: 'Analytics Night',
    });
    await request(app.getHttpServer())
      .post(`/events/${event.id}/publish`)
      .set(hostAuth('analytics-host'))
      .expect(201);

    const apply = async (userSub: string) => {
      const invite = await request(app.getHttpServer())
        .post(`/invites/generate/${event.id}`)
        .set(hostAuth('analytics-host'))
        .expect(201);
      return await request(app.getHttpServer())
        .post('/applications')
        .set(userAuth(userSub))
        .send({
          eventId: event.id,
          answers: {},
          inviteCode: invite.body.code,
          acceptedCodeOfConduct: true,
        })
        .expect(201);
    };

    const approved = await apply('analytics-attendee-approved');
    const waitlisted = await apply('analytics-attendee-waitlisted');

    await request(app.getHttpServer())
      .patch(`/applications/${approved.body.id}/decision`)
      .set(hostAuth('analytics-host'))
      .send({ status: 'approved' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/applications/${waitlisted.body.id}/decision`)
      .set(hostAuth('analytics-host'))
      .send({ status: 'waitlisted' })
      .expect(200);

    const ticket = await request(app.getHttpServer())
      .post(`/checkin/mine/${event.id}`)
      .set(userAuth('analytics-attendee-approved'))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/checkin/verify/${encodeURIComponent(ticket.body.token)}`)
      .set(hostAuth('analytics-host'))
      .expect(201);

    await request(app.getHttpServer())
      .get(`/analytics/event/${event.id}`)
      .set(hostAuth('other-host'))
      .expect(403);

    const eventAnalytics = await request(app.getHttpServer())
      .get(`/analytics/event/${event.id}`)
      .set(hostAuth('analytics-host'))
      .expect(200);

    expect(eventAnalytics.body.event.title).toBe('Analytics Night');
    expect(eventAnalytics.body.invites.total).toBe(2);
    expect(eventAnalytics.body.invites.redeemed).toBe(2);
    expect(eventAnalytics.body.applications.total).toBe(2);
    expect(eventAnalytics.body.applications.approved).toBe(1);
    expect(eventAnalytics.body.applications.waitlisted).toBe(1);
    expect(eventAnalytics.body.checkin.ticketsIssued).toBe(1);
    expect(eventAnalytics.body.checkin.checkedIn).toBe(1);
    expect(eventAnalytics.body.checkin.attendanceRate).toBe(1);
    expect(eventAnalytics.body.payments.grossRevenueCents).toBe(0);

    const summary = await request(app.getHttpServer())
      .get('/analytics/host/summary')
      .set(hostAuth('analytics-host'))
      .expect(200);
    expect(summary.body.events).toBe(1);
    expect(summary.body.applications).toBe(2);
    expect(summary.body.approved).toBe(1);
    expect(summary.body.waitlisted).toBe(1);
    expect(summary.body.checkedIn).toBe(1);
  });
});
