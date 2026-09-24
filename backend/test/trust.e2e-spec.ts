import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { adminAuth, userAuth } from './auth-headers';
import {
  clearCapturedEmails,
  getCapturedEmails,
} from '../src/email/email-outbox';

describe('Trust (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.TRUST_REPORT_NOTIFY_EMAIL = 'trust-admin@example.com';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    delete process.env.TRUST_REPORT_NOTIFY_EMAIL;
    await app.close();
  });

  it('GET /trust/code-of-conduct is public', async () => {
    const res = await request(app.getHttpServer())
      .get('/trust/code-of-conduct')
      .expect(200);
    expect(res.body.version).toBeTruthy();
    expect(String(res.body.text)).toContain('consent');
  });

  it('POST /trust/reports requires auth', async () => {
    await request(app.getHttpServer())
      .post('/trust/reports')
      .send({ subjectId: 'e1', details: 'something bad happened here' })
      .expect(401);
  });

  it('users can file reports; admins can list and resolve', async () => {
    clearCapturedEmails();
    const created = await request(app.getHttpServer())
      .post('/trust/reports')
      .set(userAuth('reporter-1'))
      .send({
        subjectType: 'event',
        subjectId: 'event-abc',
        category: 'safety',
        details: 'Unsafe behavior reported at the door.',
      })
      .expect(201);
    expect(created.body.status).toBe('open');

    const mail = getCapturedEmails().find(
      (m) => m.to === 'trust-admin@example.com',
    );
    expect(mail?.subject).toContain('trust report');

    await request(app.getHttpServer())
      .get('/trust/reports')
      .set(userAuth('reporter-1'))
      .expect(403);

    const listed = await request(app.getHttpServer())
      .get('/trust/reports')
      .set(adminAuth())
      .expect(200);
    expect(Array.isArray(listed.body)).toBe(true);
    expect(listed.body.some((r: { id: string }) => r.id === created.body.id)).toBe(
      true,
    );

    const resolved = await request(app.getHttpServer())
      .patch(`/trust/reports/${created.body.id}/resolve`)
      .set(adminAuth())
      .expect(200);
    expect(resolved.body.status).toBe('resolved');
  });

  it('GET /trust/export returns the authenticated user data bundle', async () => {
    const email = `export-${Date.now()}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1', host: false })
      .expect(201);

    const exported = await request(app.getHttpServer())
      .get('/trust/export')
      .set('Authorization', `Bearer ${registered.body.token}`)
      .expect(200);

    expect(exported.body.user.email).toBe(email);
    expect(Array.isArray(exported.body.applications)).toBe(true);
    expect(exported.body.exportedAt).toBeTruthy();
  });
});
