import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { adminAuth, hostAuth, userAuth } from './auth-headers';
import { createEvent } from './create-event';

describe('Admin (e2e)', () => {
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

  it('enforces admin role and audits user/event/report moderation', async () => {
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set(hostAuth('ordinary-host'))
      .expect(403);

    const email = `moderated-${Date.now()}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1', host: false })
      .expect(201);
    const userId = registered.body.user.id as string;
    const token = registered.body.token as string;

    const users = await request(app.getHttpServer())
      .get(`/admin/users?query=${encodeURIComponent(email)}`)
      .set(adminAuth())
      .expect(200);
    expect(users.body.items).toHaveLength(1);
    expect(users.body.items[0].email).toBe(email);
    expect(users.body.items[0].passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}`)
      .set(adminAuth())
      .send({ roles: ['attendee', 'host'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/host-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}`)
      .set(adminAuth())
      .send({
        accountStatus: 'suspended',
        suspensionReason: 'Safety review',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}`)
      .set(adminAuth())
      .send({ accountStatus: 'active' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}`)
      .set(adminAuth(userId))
      .send({ roles: ['attendee'] })
      .expect(400);

    const event = await createEvent(app.getHttpServer(), 'admin-event-host', {
      title: 'Moderated Event',
    });
    await request(app.getHttpServer())
      .post(`/admin/events/${event.id}/cancel`)
      .set(adminAuth())
      .send({ reason: 'Policy violation' })
      .expect(201);
    const cancelled = await request(app.getHttpServer())
      .get(`/events/${event.id}`)
      .expect(200);
    expect(cancelled.body.status).toBe('cancelled');

    const report = await request(app.getHttpServer())
      .post('/trust/reports')
      .set(userAuth('reporting-user'))
      .send({
        subjectType: 'event',
        subjectId: event.id,
        category: 'safety',
        details: 'This event needs administrator review.',
      })
      .expect(201);
    const reviewed = await request(app.getHttpServer())
      .patch(`/trust/reports/${report.body.id}/review`)
      .set(adminAuth())
      .send({
        assignedToAdminId: 'platform-admin',
        adminNotes: 'Reviewed evidence.',
        status: 'resolved',
      })
      .expect(200);
    expect(reviewed.body.assignedToAdminId).toBe('platform-admin');
    expect(reviewed.body.adminNotes).toBe('Reviewed evidence.');
    expect(reviewed.body.resolvedAt).toBeTruthy();

    const audit = await request(app.getHttpServer())
      .get('/admin/audit')
      .set(adminAuth())
      .expect(200);
    expect(
      audit.body.some(
        (entry: { action: string }) => entry.action === 'event.cancelled',
      ),
    ).toBe(true);
    expect(
      audit.body.some(
        (entry: { action: string }) => entry.action === 'trust-report.reviewed',
      ),
    ).toBe(true);
  });
});
