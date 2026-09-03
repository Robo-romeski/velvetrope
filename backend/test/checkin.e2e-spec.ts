import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Checkin (e2e)', () => {
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

  it('host can issue a ticket and verify it once', async () => {
    const issue = await request(app.getHttpServer())
      .post('/checkin/issue/eventC')
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .send({ userSub: 'user|checkin1' })
      .expect(201);
    const token = issue.body.token as string;

    const verified = await request(app.getHttpServer())
      .post(`/checkin/verify/${token}`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(201);
    expect(verified.body.usedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/checkin/verify/${token}`)
      .set('Authorization', 'Bearer invalid.token')
      .set('x-test-roles', '["host"]')
      .expect(400);
  });
});


