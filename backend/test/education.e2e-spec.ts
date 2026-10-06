import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Education (e2e)', () => {
  let app: INestApplication<App>;
  let educatorToken: string;
  let learnerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const educator = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `educator-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Teach',
      })
      .expect(201);
    educatorToken = educator.body.token;

    const learner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `learner-${Date.now()}@example.com`,
        password: 'password1',
        name: 'Learn',
      })
      .expect(201);
    learnerToken = learner.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('draft, publish, progress, and content report', async () => {
    await request(app.getHttpServer())
      .post('/learn/educator/enable')
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(201);

    const draft = await request(app.getHttpServer())
      .post('/learn')
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({
        title: 'Consent Foundations',
        contentType: 'course',
        tags: ['consent', 'basics'],
      })
      .expect(201);
    expect(draft.body.status).toBe('draft');

    const lesson = await request(app.getHttpServer())
      .post(`/learn/${draft.body.slug}/lessons`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({
        title: 'Lesson 1',
        body: 'Intro material',
        isPreview: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/learn/${draft.body.slug}/publish`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .expect(201);

    const catalog = await request(app.getHttpServer())
      .get('/learn?tag=consent')
      .expect(200);
    expect(catalog.body.length).toBeGreaterThan(0);

    const detail = await request(app.getHttpServer())
      .get(`/learn/${draft.body.slug}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(200);
    expect(detail.body.lessons.length).toBe(1);

    await request(app.getHttpServer())
      .post(`/learn/${draft.body.slug}/lessons/${lesson.body.id}/complete`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/learn/${draft.body.slug}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(200);
    expect(after.body.progress.completed).toBe(1);

    await request(app.getHttpServer())
      .post('/trust/reports')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({
        subjectType: 'content',
        subjectId: draft.body.id,
        category: 'spam',
        details: 'Testing content report pipeline for admin review.',
      })
      .expect(201);
  });
});
