#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  AnimationClip,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
} from '../frontend/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js';

class NodeFileReader {
  result = null;
  onloadend = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader ??= NodeFileReader;

const output = resolve(
  process.argv[2] || 'samples/3d/neutral-cube.glb',
);
const root = new Group();
root.name = 'NeutralSample';

const cube = new Mesh(
  new BoxGeometry(1.6, 1.6, 1.6),
  new MeshStandardMaterial({
    color: new Color('#6f75a8'),
    metalness: 0.18,
    roughness: 0.52,
  }),
);
cube.name = 'NeutralCube';
root.add(cube);

const quaternion = (angle) =>
  new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
const rotations = [
  quaternion(0),
  quaternion(Math.PI),
  quaternion(Math.PI * 2),
];
const track = new QuaternionKeyframeTrack(
  'NeutralCube.quaternion',
  [0, 2, 4],
  rotations.flatMap((value) => [value.x, value.y, value.z, value.w]),
);
const clip = new AnimationClip('Slow turn', 4, [track]);

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(root, {
  animations: [clip],
  binary: true,
  onlyVisible: true,
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.from(result));
console.log(`Wrote ${output} (${result.byteLength} bytes)`);
