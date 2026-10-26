#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  AnimationClip,
  CapsuleGeometry,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  SphereGeometry,
  Vector2,
  Vector3,
  VectorKeyframeTrack,
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
  process.argv[2] || 'samples/3d/stylized-embrace.glb',
);

const palette = {
  pink: new MeshStandardMaterial({
    color: new Color('#dc679f'),
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.35,
    dithering: true,
  }),
  blue: new MeshStandardMaterial({
    color: new Color('#8098aa'),
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.3,
    dithering: true,
  }),
};

function sculptedSphere(deform) {
  const geometry = new SphereGeometry(1, 48, 32);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const [x, y, z] = deform(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index),
    );
    positions.setXYZ(index, x, y, z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.normalizeNormals();
  return geometry;
}

const sphereGeometry = new SphereGeometry(1, 48, 32);
const jointGeometry = new SphereGeometry(1, 40, 28);
const headGeometry = sculptedSphere((x, y, z) => {
  const crownToJaw = (y + 1) * 0.5;
  const jawTaper = 0.78 + crownToJaw * 0.22;
  return [x * jawTaper, y * 1.08, z * jawTaper * 0.96];
});
const pelvisGeometry = sculptedSphere((x, y, z) => {
  const upperToLower = (1 - y) * 0.5;
  const contour = 0.9 + upperToLower * 0.1;
  return [x * contour, y * 0.94, z * contour];
});
function lathedGeometry(profile, rotationZ = 0) {
  const geometry = new LatheGeometry(
    profile.map(([radius, axis]) => new Vector2(radius, axis)),
    48,
  );
  if (rotationZ) geometry.rotateZ(rotationZ);
  geometry.computeVertexNormals();
  geometry.normalizeNormals();
  return geometry;
}

const recliningBodyGeometry = lathedGeometry(
  [
    [0.48, -0.72],
    [0.86, -0.55],
    [1, -0.1],
    [0.9, 0.7],
    [0.74, 1.8],
    [0.78, 2.65],
    [1.06, 3.35],
    [1, 3.72],
    [0.55, 4],
  ],
  -Math.PI / 2,
);
const uprightBodyGeometry = lathedGeometry([
  [0.14, 0.14],
  [0.22, 0.25],
  [0.22, 0.55],
  [0.3, 0.78],
  [0.34, 0.96],
  [0.3, 1.16],
  [0.14, 1.3],
]);
const up = new Vector3(0, 1, 0);

function sphere(
  name,
  position,
  scale,
  material,
  geometry = sphereGeometry,
) {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.fromArray(position);
  mesh.scale.fromArray(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function capsule(name, start, end, radius, material, scale = [1, 1, 1]) {
  const from = new Vector3(...start);
  const to = new Vector3(...end);
  const direction = to.clone().sub(from);
  const length = Math.max(0.01, direction.length() - radius * 2);
  const mesh = new Mesh(
    new CapsuleGeometry(radius, length, 12, 32),
    material,
  );
  mesh.geometry.normalizeNormals();
  mesh.name = name;
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  mesh.scale.fromArray(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function extremity(
  name,
  position,
  from,
  radius,
  material,
  proportions,
) {
  const direction = new Vector3(...position).sub(new Vector3(...from));
  const mesh = new Mesh(sphereGeometry, material);
  mesh.name = name;
  mesh.position.fromArray(position);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  mesh.scale.set(
    radius * proportions[0],
    radius * proportions[1],
    radius * proportions[2],
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function limbPair(
  parent,
  prefix,
  shoulder,
  leftElbow,
  leftHand,
  rightElbow,
  rightHand,
  radius,
  material,
) {
  parent.add(
    capsule(
      `${prefix}LeftUpper`,
      shoulder.left,
      leftElbow,
      radius,
      material,
    ),
    capsule(
      `${prefix}LeftLower`,
      leftElbow,
      leftHand,
      radius * 0.82,
      material,
    ),
    sphere(
      `${prefix}LeftElbow`,
      leftElbow,
      [radius * 0.94, radius * 0.94, radius * 0.94],
      material,
      jointGeometry,
    ),
    extremity(
      `${prefix}LeftHand`,
      leftHand,
      leftElbow,
      radius,
      material,
      [0.78, 1.38, 0.62],
    ),
    capsule(
      `${prefix}RightUpper`,
      shoulder.right,
      rightElbow,
      radius,
      material,
    ),
    capsule(
      `${prefix}RightLower`,
      rightElbow,
      rightHand,
      radius * 0.82,
      material,
    ),
    sphere(
      `${prefix}RightElbow`,
      rightElbow,
      [radius * 0.94, radius * 0.94, radius * 0.94],
      material,
      jointGeometry,
    ),
    extremity(
      `${prefix}RightHand`,
      rightHand,
      rightElbow,
      radius,
      material,
      [0.78, 1.38, 0.62],
    ),
  );
}

function offset(to, from) {
  return to.map((value, index) => value - from[index]);
}

function articulatedLeg({
  parent,
  prefix,
  hip,
  knee,
  ankle,
  foot,
  thighRadius,
  shinRadius,
  material,
}) {
  const hipRig = new Group();
  hipRig.name = `${prefix}HipRig`;
  hipRig.position.fromArray(hip);

  const kneeOffset = offset(knee, hip);
  hipRig.add(
    capsule(
      `${prefix}Thigh`,
      [0, 0, 0],
      kneeOffset,
      thighRadius,
      material,
    ),
  );

  const kneeRig = new Group();
  kneeRig.name = `${prefix}KneeRig`;
  kneeRig.position.fromArray(kneeOffset);
  kneeRig.add(
    sphere(
      `${prefix}Knee`,
      [0, 0, 0],
      [
        thighRadius * 0.95,
        thighRadius * 0.95,
        thighRadius * 0.95,
      ],
      material,
      jointGeometry,
    ),
    capsule(
      `${prefix}Shin`,
      [0, 0, 0],
      offset(ankle, knee),
      shinRadius,
      material,
    ),
    extremity(
      `${prefix}Foot`,
      offset(foot, knee),
      offset(ankle, knee),
      shinRadius,
      material,
      [0.9, 1.72, 0.7],
    ),
  );

  hipRig.add(kneeRig);
  parent.add(hipRig);
  return { hipRig, kneeRig };
}

function plantedKneelingLeg({
  parent,
  prefix,
  hip,
  knee,
  ankle,
  foot,
  thighRadius,
  shinRadius,
  material,
}) {
  const thighDirection = new Vector3(...offset(hip, knee));
  const thighLength = thighDirection.length();
  const thighRig = new Group();
  thighRig.name = `${prefix}ThighRig`;
  thighRig.position.fromArray(knee);
  thighRig.quaternion.setFromUnitVectors(
    up,
    thighDirection.clone().normalize(),
  );
  thighRig.add(
    capsule(
      `${prefix}Thigh`,
      [0, 0, 0],
      [0, thighLength, 0],
      thighRadius,
      material,
    ),
  );

  const plantedLowerLeg = new Group();
  plantedLowerLeg.name = `${prefix}PlantedLowerLeg`;
  plantedLowerLeg.add(
    sphere(
      `${prefix}Knee`,
      knee,
      [
        thighRadius * 0.95,
        thighRadius * 0.95,
        thighRadius * 0.95,
      ],
      material,
      jointGeometry,
    ),
    capsule(
      `${prefix}Shin`,
      knee,
      ankle,
      shinRadius,
      material,
    ),
    extremity(
      `${prefix}Foot`,
      foot,
      ankle,
      shinRadius,
      material,
      [0.9, 1.72, 0.7],
    ),
  );

  parent.add(thighRig, plantedLowerLeg);
  return { thighRig, thighLength };
}

const scene = new Group();
scene.name = 'StylizedEmbrace';

const reclining = new Group();
reclining.name = 'RecliningFigure';
scene.add(reclining);

reclining.add(
  sphere(
    'RecliningHead',
    [-1.72, 0.58, 0],
    [0.25, 0.27, 0.25],
    palette.pink,
    headGeometry,
  ),
  capsule(
    'RecliningNeck',
    [-1.54, 0.52, 0],
    [-1.25, 0.46, 0],
    0.105,
    palette.pink,
  ),
  sphere(
    'RecliningChest',
    [-0.98, 0.47, 0],
    [0.43, 0.28, 0.3],
    palette.pink,
    recliningBodyGeometry,
  ),
);

limbPair(
  reclining,
  'RecliningArm',
  {
    left: [-1.02, 0.55, 0.24],
    right: [-1.02, 0.55, -0.24],
  },
  [-0.2, 0.31, 0.4],
  [0.42, 0.35, 0.34],
  [-0.2, 0.31, -0.4],
  [0.42, 0.35, -0.34],
  0.095,
  palette.pink,
);

articulatedLeg({
  parent: reclining,
  prefix: 'RecliningLeft',
  hip: [0.48, 0.56, 0.18],
  knee: [0.12, 1.18, 1.05],
  ankle: [0.82, 1.52, 1.34],
  foot: [0.95, 1.58, 1.45],
  thighRadius: 0.17,
  shinRadius: 0.13,
  material: palette.pink,
});

articulatedLeg({
  parent: reclining,
  prefix: 'RecliningRight',
  hip: [0.48, 0.56, -0.18],
  knee: [0.12, 1.18, -1.05],
  ankle: [0.82, 1.52, -1.34],
  foot: [0.95, 1.58, -1.45],
  thighRadius: 0.17,
  shinRadius: 0.13,
  material: palette.pink,
});

const upright = new Group();
upright.name = 'UprightFigure';
scene.add(upright);

const uprightHipPivot = [0.96, 0.27, 0];
const uprightTorso = new Group();
uprightTorso.name = 'UprightTorsoRig';
uprightTorso.position.fromArray(uprightHipPivot);
upright.add(uprightTorso);
uprightTorso.add(
  sphere(
    'UprightHead',
    [-0.46, 1.58, 0],
    [0.25, 0.27, 0.25],
    palette.blue,
    headGeometry,
  ),
  capsule(
    'UprightNeck',
    [-0.42, 1.36, 0],
    [-0.28, 1.11, 0],
    0.105,
    palette.blue,
  ),
  sphere(
    'UprightChest',
    [-0.16, 0, 0],
    [1, 1, 1],
    palette.blue,
    uprightBodyGeometry,
  ),
);

limbPair(
  uprightTorso,
  'UprightArm',
  {
    left: [-0.32, 0.95, 0.23],
    right: [-0.32, 0.95, -0.23],
  },
  [-0.2, 0.48, 0.36],
  [-0.52, 0.18, 0.28],
  [-0.2, 0.48, -0.36],
  [-0.52, 0.18, -0.28],
  0.1,
  palette.blue,
);

const uprightPelvis = new Group();
uprightPelvis.name = 'UprightPelvisRig';
uprightPelvis.position.fromArray(uprightHipPivot);
upright.add(uprightPelvis);
uprightPelvis.add(
  sphere(
    'UprightHips',
    [0, 0, 0],
    [0.3, 0.23, 0.25],
    palette.blue,
    pelvisGeometry,
  ),
  sphere(
    'UprightLeftButtock',
    [0.14, -0.025, 0.14],
    [0.21, 0.22, 0.18],
    palette.blue,
    pelvisGeometry,
  ),
  sphere(
    'UprightRightButtock',
    [0.14, -0.025, -0.14],
    [0.21, 0.22, 0.18],
    palette.blue,
    pelvisGeometry,
  ),
);
uprightPelvis.add(uprightTorso);
uprightTorso.position.set(0, 0, 0);

const uprightLegs = new Group();
uprightLegs.name = 'UprightPlantedLegs';
upright.add(uprightLegs);

const uprightLeftLeg = {
  hip: [0.94, 0.29, 0.2],
  knee: [0.46, 0.2, 0.7],
  ankle: [1.2, 0.13, 0.7],
  foot: [1.36, 0.12, 0.7],
};
const uprightRightLeg = {
  hip: [0.94, 0.29, -0.2],
  knee: [0.46, 0.2, -0.7],
  ankle: [1.2, 0.13, -0.7],
  foot: [1.36, 0.12, -0.7],
};

const uprightLeftThigh = plantedKneelingLeg({
  parent: uprightLegs,
  prefix: 'UprightLeft',
  ...uprightLeftLeg,
  thighRadius: 0.16,
  shinRadius: 0.125,
  material: palette.blue,
});

const uprightRightThigh = plantedKneelingLeg({
  parent: uprightLegs,
  prefix: 'UprightRight',
  ...uprightRightLeg,
  thighRadius: 0.16,
  shinRadius: 0.125,
  material: palette.blue,
});

const times = Array.from({ length: 17 }, (_, index) => index * 0.25);
const motion = times.map((time) => Math.sin(Math.PI * time));
const breath = times.map(
  (time) => (1 - Math.cos((Math.PI * 2 * time) / 4)) * 0.5,
);
const pelvisAngles = motion.map((value) => value * 0.045);
const pelvisTargets = motion.map((value, index) => {
  const angle = pelvisAngles[index];
  const restingButtockY = -0.025;
  const rotatedButtockY =
    Math.sin(angle) * 0.14 + Math.cos(angle) * restingButtockY;
  return [
    uprightHipPivot[0] - value * 0.07,
    uprightHipPivot[1] + restingButtockY - rotatedButtockY,
    0,
  ];
});
const pelvisPositions = pelvisTargets.flat();
const recliningChestScales = breath.flatMap((value) => [
  0.43 * (1 + value * 0.01),
  0.28 * (1 + value * 0.035),
  0.3 * (1 + value * 0.01),
]);

function rotations(axis, values) {
  return values.flatMap((angle) => {
    const value = new Quaternion().setFromAxisAngle(
      axis,
      angle,
    );
    return [value.x, value.y, value.z, value.w];
  });
}

function hipTargets(baseHip, pelvisTarget, pelvisAngle) {
  const localX = baseHip[0] - uprightHipPivot[0];
  const localY = baseHip[1] - uprightHipPivot[1];
  const cos = Math.cos(pelvisAngle);
  const sin = Math.sin(pelvisAngle);
  return [
    pelvisTarget[0] + localX * cos - localY * sin,
    pelvisTarget[1] + localX * sin + localY * cos,
    baseHip[2],
  ];
}

function aimedRotations(knee, targets) {
  return targets.flatMap((target) => {
    const direction = new Vector3(...offset(target, knee));
    const value = new Quaternion().setFromUnitVectors(
      up,
      direction.normalize(),
    );
    return [value.x, value.y, value.z, value.w];
  });
}

function reachScales(knee, targets, baseLength) {
  return targets.flatMap((target) => {
    const length = new Vector3(...offset(target, knee)).length();
    return [1, length / baseLength, 1];
  });
}

const zAxis = new Vector3(0, 0, 1);
const leftHipTargets = pelvisTargets.map((target, index) =>
  hipTargets(uprightLeftLeg.hip, target, pelvisAngles[index]),
);
const rightHipTargets = pelvisTargets.map((target, index) =>
  hipTargets(uprightRightLeg.hip, target, pelvisAngles[index]),
);

const animation = new AnimationClip('Hip thrust', 4, [
  new VectorKeyframeTrack(
    'UprightPelvisRig.position',
    times,
    pelvisPositions,
  ),
  new QuaternionKeyframeTrack(
    'UprightPelvisRig.quaternion',
    times,
    rotations(
      zAxis,
      pelvisAngles,
    ),
  ),
  new QuaternionKeyframeTrack(
    'UprightTorsoRig.quaternion',
    times,
    rotations(
      zAxis,
      motion.map((value) => value * -0.095),
    ),
  ),
  new QuaternionKeyframeTrack(
    'UprightLeftThighRig.quaternion',
    times,
    aimedRotations(uprightLeftLeg.knee, leftHipTargets),
  ),
  new VectorKeyframeTrack(
    'UprightLeftThighRig.scale',
    times,
    reachScales(
      uprightLeftLeg.knee,
      leftHipTargets,
      uprightLeftThigh.thighLength,
    ),
  ),
  new QuaternionKeyframeTrack(
    'UprightRightThighRig.quaternion',
    times,
    aimedRotations(uprightRightLeg.knee, rightHipTargets),
  ),
  new VectorKeyframeTrack(
    'UprightRightThighRig.scale',
    times,
    reachScales(
      uprightRightLeg.knee,
      rightHipTargets,
      uprightRightThigh.thighLength,
    ),
  ),
  new VectorKeyframeTrack(
    'RecliningChest.scale',
    times,
    recliningChestScales,
  ),
]);

scene.position.set(0, -1.1, 0);
// Keep a three-quarter presentation so the leg spread reads in the default camera.
scene.rotation.y = 0.08;

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, {
  animations: [animation],
  binary: true,
  onlyVisible: true,
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.from(result));
console.log(`Wrote ${output} (${result.byteLength} bytes)`);
