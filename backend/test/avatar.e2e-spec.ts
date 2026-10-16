import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Member avatar upload (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const email = `avatar-${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password1', name: 'Avatar User' })
      .expect(201);
    token = reg.body.token;
    userId = reg.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads via direct mode and serves from media proxy', async () => {
    await request(app.getHttpServer())
      .post('/members/me/avatar/upload-request')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'text/plain', sizeBytes: 100 })
      .expect(400);

    const req = await request(app.getHttpServer())
      .post('/members/me/avatar/upload-request')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/jpeg', sizeBytes: 128 })
      .expect(201);
    expect(req.body.mode).toBe('direct');

    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

    const uploaded = await request(app.getHttpServer())
      .post('/members/me/avatar/file')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', jpeg, { filename: 'avatar.jpg', contentType: 'image/jpeg' })
      .expect(201);
    expect(uploaded.body.avatarUrl).toContain(`/media/avatars/${encodeURIComponent(userId)}`);

    const profile = await request(app.getHttpServer())
      .get('/members/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profile.body.avatarUrl).toBe(uploaded.body.avatarUrl);

    const media = await request(app.getHttpServer())
      .get(`/media/avatars/${userId}`)
      .expect(200);
    expect(media.headers['content-type']).toMatch(/image\/jpeg/);
    expect(media.body.length).toBeGreaterThan(0);
  });
});
