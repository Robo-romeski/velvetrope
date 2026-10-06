import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
describe('Paid course (e2e)', () => {
  let app: INestApplication<App>;
  let educatorToken: string;
  let learnerToken: string;
  let slug: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const hostId = `educator-paid-${Date.now()}`;
    const educator = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `${hostId}@example.com`,
        password: 'password1',
        name: 'Paid Educator',
        host: true,
      })
      .expect(201);
    educatorToken = educator.body.token;
    educatorId = educator.body.user.id;

    await request(app.getHttpServer())
      .get('/stripe/onboarding')
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(200);

    const learner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `learner-paid-${Date.now()}@example.com`,
        password: 'password1',
      })
      .expect(201);
    learnerToken = learner.body.token;

    await request(app.getHttpServer())
      .post('/learn/educator/enable')
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(201);

    const draft = await request(app.getHttpServer())
      .post('/learn')
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ title: 'Paid Boundaries 101', contentType: 'course' })
      .expect(201);
    slug = draft.body.slug as string;

    await request(app.getHttpServer())
      .patch(`/learn/${slug}`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ priceCents: 1200 })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/learn/${slug}/lessons`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({
        title: 'Preview',
        body: 'Free preview text',
        isPreview: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/learn/${slug}/lessons`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({
        title: 'Full lesson',
        body: 'Paid lesson body',
        isPreview: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/learn/${slug}/publish`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('paywall, purchase, progress, and refund revoke access', async () => {
    const before = await request(app.getHttpServer())
      .get(`/learn/${slug}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(200);
    expect(before.body.access.status).toBe('pending');
    expect(before.body.lessons[1].body).toBeUndefined();

    const checkout = await request(app.getHttpServer())
      .post(`/learn/${slug}/checkout`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(201);
    const sessionId = checkout.body.sessionId as string;

    await request(app.getHttpServer())
      .post(`/learn/${slug}/checkout/confirm`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ sessionId })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/learn/${slug}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(200);
    expect(after.body.access.status).toBe('paid');
    expect(after.body.lessons[1].body).toBe('Paid lesson body');

    await request(app.getHttpServer())
      .post(`/commerce/test/refund/${sessionId}`)
      .expect(201);

    const revoked = await request(app.getHttpServer())
      .get(`/learn/${slug}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(200);
    expect(revoked.body.access.status).toBe('pending');
    expect(revoked.body.lessons[1].body).toBeUndefined();
  });
});
