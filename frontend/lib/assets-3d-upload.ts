export type SignedAssetUpload = {
  url: string;
  headers: Record<string, string>;
  objectKey: string;
  kind: 'model' | 'thumbnail';
  expiresInSeconds: number;
};

export function modelContentType(file: File) {
  if (file.name.toLocaleLowerCase().endsWith('.glb')) {
    return file.type || 'model/gltf-binary';
  }
  return file.type || 'model/gltf+json';
}

export function uploadToSignedUrl(
  file: File,
  upload: SignedAssetUpload,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', upload.url);
    Object.entries(upload.headers).forEach(([name, value]) =>
      request.setRequestHeader(name, value),
    );
    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Object storage rejected the upload (${request.status}).`));
      }
    });
    request.addEventListener('error', () =>
      reject(
        new Error(
          'The upload could not reach object storage. Check bucket CORS and try again.',
        ),
      ),
    );
    request.send(file);
  });
}
