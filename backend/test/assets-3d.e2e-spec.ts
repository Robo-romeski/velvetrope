import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { adminAuth, userAuth } from './auth-headers';

describe('3D asset library (e2e)', () => {
  let app: INestApplication<App>;
  let assetId: string;
  let slug: string;

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

  it('enforces admin permissions and validates upload requests', async () => {
    await request(app.getHttpServer())
      .get('/admin/assets-3d')
      .set(userAuth('ordinary-member'))
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/admin/assets-3d')
      .set(adminAuth())
      .send({
        title: `Neutral Cube ${Date.now()}`,
        description: 'A neutral model used to verify the 3D asset workflow.',
        category: 'Reference',
        tags: ['neutral', 'sample'],
      })
      .expect(201);
    assetId = created.body.id as string;
    slug = created.body.slug as string;
    expect(created.body.status).toBe('draft');
    expect(created.body.modelUrl).toBeNull();

    await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/uploads`)
      .set(adminAuth())
      .send({
        kind: 'model',
        filename: 'unsafe.exe',
        contentType: 'application/octet-stream',
        sizeBytes: 100,
      })
      .expect(400);
  });

  it('keeps drafts private, then publishes a validated GLB', async () => {
    await request(app.getHttpServer()).get(`/assets-3d/${slug}`).expect(404);

    const upload = await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/uploads`)
      .set(adminAuth())
      .send({
        kind: 'model',
        filename: 'neutral-cube.glb',
        contentType: 'model/gltf-binary',
        sizeBytes: 1024,
      })
      .expect(201);
    expect(upload.body.url).toContain('storage.test.invalid');
    expect(upload.body.objectKey).toContain(`assets-3d/${assetId}/model-`);

    const completed = await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/uploads/complete`)
      .set(adminAuth())
      .send({
        kind: 'model',
        objectKey: upload.body.objectKey,
        filename: 'neutral-cube.glb',
        contentType: 'model/gltf-binary',
        sizeBytes: 1024,
      })
      .expect(201);
    expect(completed.body.modelUrl).toContain('storage.test.invalid');

    await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/publish`)
      .set(adminAuth())
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/assets-3d/${slug}`)
      .expect(200);
    expect(detail.body.title).toContain('Neutral Cube');
    expect(detail.body.modelUrl).toContain('storage.test.invalid');

    const catalog = await request(app.getHttpServer())
      .get('/assets-3d?query=neutral&category=Reference&tag=sample')
      .expect(200);
    expect(catalog.body.items).toHaveLength(1);
    expect(catalog.body.items[0].thumbnailUrl).toBeNull();
  });

  it('supports replacement and unpublishing', async () => {
    const replacement = await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/uploads`)
      .set(adminAuth())
      .send({
        kind: 'model',
        filename: 'neutral-cube-v2.glb',
        contentType: 'model/gltf-binary',
        sizeBytes: 2048,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/uploads/complete`)
      .set(adminAuth())
      .send({
        kind: 'model',
        objectKey: replacement.body.objectKey,
        filename: 'neutral-cube-v2.glb',
        contentType: 'model/gltf-binary',
        sizeBytes: 2048,
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/assets-3d/${assetId}`)
      .set(adminAuth())
      .send({ description: 'Updated after replacement.' })
      .expect(200);
    expect(updated.body.modelFilename).toBe('neutral-cube-v2.glb');

    await request(app.getHttpServer())
      .post(`/admin/assets-3d/${assetId}/unpublish`)
      .set(adminAuth())
      .expect(201);
    await request(app.getHttpServer()).get(`/assets-3d/${slug}`).expect(404);
  });
});
