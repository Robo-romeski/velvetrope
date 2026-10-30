# 3D asset library

EpicSexual includes a public catalog at `/assets-3d` and an administrator
workspace at `/admin/assets-3d`. Published assets are public. Draft metadata,
model URLs, and previews require the `admin` role.

## Storage configuration

Models and thumbnails use private S3-compatible object storage. Set these on the
backend:

```dotenv
S3_ASSET_BUCKET=epicsexual-private-assets
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
```

`S3_ASSET_BUCKET` falls back to `S3_PHOTO_BUCKET` so an existing private bucket
can be reused. Keep public bucket access disabled. The API issues short-lived
signed PUT and GET URLs.

Because browsers upload and read objects directly, configure bucket CORS for
the production site and local frontend. An AWS S3 example:

```json
[
  {
    "AllowedOrigins": [
      "https://epicsexual.com",
      "https://www.epicsexual.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Run the normal TypeORM migration command after deployment:

```bash
cd backend
npm run migration:run
```

Migration `1738000000025-Assets3dLibrary.ts` creates the metadata table. Object
files remain outside the database.

## Add an asset

1. Sign in with an administrator account.
2. Open `/admin/assets-3d` and select **Add asset**.
3. Enter the title, category, description, and comma-separated tags.
4. Upload a `.glb` or standalone `.gltf` model.
5. Optionally upload a JPEG, PNG, or WebP thumbnail.
6. Inspect the private interactive preview.
7. Save metadata and select **Publish asset**.

Uploading another model or thumbnail from the editor replaces the current
object only after the new upload validates successfully. Unpublishing removes
the public page immediately without deleting its files.

GLB is recommended because it packages geometry, animation, textures, and
materials together. Standalone `.gltf` files are accepted only when buffers and
images are embedded as data URIs. Models are limited to 100 MB; thumbnails are
limited to 5 MB.

## Neutral sample workflow

The repository includes an animated neutral cube at
`samples/3d/neutral-cube.glb`. Regenerate it after changing the sample script:

```bash
node scripts/generate-neutral-3d-sample.mjs
```

To exercise login → draft → signed upload → validation → publish against a
configured environment:

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='replace-me' \
API_BASE_URL=http://localhost:3010 \
scripts/publish-sample-3d-asset.sh
```

The script prints the published slug. Open `/assets-3d/<slug>` to verify camera
controls, material rendering, and the sample’s **Slow turn** animation.

## Stylized figure sample

The repository also includes a full 3D, two-figure pose with stylized human
proportions, non-explicit rounded geometry, and a seamless four-second
**Hip thrust** clip. The upper body hinges from the pelvis while the kneeling
figure’s thighs pivot from fixed knees to follow the moving hips. Its knees,
shins, and feet remain planted; the buttocks maintain surface contact and the
torso counter-rotates to limit head travel. The authored three-quarter view
keeps the reclining figure’s wide leg separation visible:

```bash
node scripts/generate-embrace-3d-sample.mjs
```

This writes `samples/3d/stylized-embrace.glb`. Pass that path through the admin
upload workflow to preview it from every angle and tune playback speed.

## Gettin' Jiggy With It sample

The second two-figure sample depicts a forward-leaning straddle over a supine
partner. The lower figure's knees are raised and spread while the upper
figure's hands, knees, lower legs, and feet stay planted. Two four-second clips
are included: **Controlled bounce** and **Pelvic rock**.

```bash
node scripts/generate-jiggy-3d-sample.mjs
```

This writes `samples/3d/gettin-jiggy-with-it.glb`. Upload it as a separate
asset so the original stylized-embrace sample remains available.

## Validation and privacy

- Every write endpoint is protected by the backend JWT and `admin` role guard.
- Public list/detail queries select only `published` rows.
- Signed object keys are scoped to one asset and upload kind.
- The server checks extension, content type, and object size after upload.
- GLB uploads must contain a valid glTF 2 binary header and declared byte size.
- glTF JSON must declare version 2.0 and may not reference external files.
- Unsupported or corrupt runtime models show the thumbnail fallback and
  recovery guidance instead of breaking the detail page.
