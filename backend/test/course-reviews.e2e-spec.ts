import { registerPayload } from './register-payload';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Course reviews (e2e)', () => {
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

    const educator = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerPayload({
        email: `review-educator-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Review Educator',
      }))
      .expect(201);
    educatorToken = educator.body.token;

    const learner = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerPayload({
        email: `review-learner-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Review Learner',
      }))
      .expect(201);
    learnerToken = learner.body.token;

    await request(app.getHttpServer())
      .post('/learn/educator/enable')
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/learn')
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ title: 'Reviewable Guide', contentType: 'guide' })
      .expect(201);
    slug = created.body.slug;

    const lesson = await request(app.getHttpServer())
      .post(`/learn/${slug}/lessons`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ title: 'Only lesson', body: 'Body text here.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/learn/${slug}/publish`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/learn/${slug}/lessons/${lesson.body.id}/complete`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('submits a review after completing lessons and exposes summary', async () => {
    await request(app.getHttpServer())
      .post(`/learn/${slug}/reviews`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ rating: 5, comment: 'Clear and helpful', anonymous: true })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get(`/learn/${slug}/reviews/summary`)
      .expect(200);
    expect(summary.body.count).toBe(1);
    expect(summary.body.averageRating).toBe(5);

    const detail = await request(app.getHttpServer())
      .get(`/learn/${slug}`)
      .expect(200);
    expect(detail.body.reviews.count).toBe(1);
  });
});
