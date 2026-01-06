import { describe, expect, it } from 'vitest';
import { NullEngine, Quaternion, Scene, UniversalCamera, Vector3 } from '@babylonjs/core';
import type { Transform } from '../../../physics/types';
import { CockpitCameraRig } from '../cockpitRig';

const identityTransform: Transform = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 }
};

const createRig = (
  options: {
    transform?: Transform;
    lookLimits?: { yaw: number; pitchUp: number; pitchDown: number };
    targetEntity?: number | null;
  } = {}
) => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const camera = new UniversalCamera('testCamera', Vector3.Zero(), scene);
  camera.rotationQuaternion = new Quaternion();

  const rig = new CockpitCameraRig({
    camera,
    transformProvider: () => options.transform ?? identityTransform,
    targetEntity: options.targetEntity ?? 1,
    lookLimits: options.lookLimits,
    pointerLockElement: null
  });

  return {
    rig,
    camera,
    dispose: () => {
      scene.dispose();
      engine.dispose();
    }
  };
};

describe('CockpitCameraRig', () => {
  it('positions the camera at the entity transform with cockpit offset applied', () => {
    const rigContext = createRig({
      transform: {
        translation: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      }
    });

    rigContext.rig.update(1 / 60);

    expect(rigContext.camera.position.x).toBeCloseTo(1);
    expect(rigContext.camera.position.y).toBeCloseTo(3.35); // 2 + default offset.y (1.35)
    expect(rigContext.camera.position.z).toBeCloseTo(3.45); // 3 + default offset.z (0.45)

    rigContext.dispose();
  });

  it('clamps look deltas to configured limits when updating rotation', () => {
    const lookLimits = {
      yaw: Math.PI / 3,
      pitchUp: Math.PI / 6,
      pitchDown: Math.PI / 4
    };

    const rigContext = createRig({ lookLimits });
    rigContext.rig.applyLookDelta(Math.PI, Math.PI);

    for (let i = 0; i < 120; i += 1) {
      rigContext.rig.update(1 / 60);
    }

    const euler = rigContext.camera.rotationQuaternion?.toEulerAngles();
    expect(euler).toBeTruthy();
    expect(Math.abs(euler!.y)).toBeLessThanOrEqual(lookLimits.yaw + 0.01);
    expect(Math.abs(euler!.y)).toBeGreaterThan(lookLimits.yaw * 0.9);
    expect(euler!.x).toBeLessThanOrEqual(0);
    expect(Math.abs(euler!.x + lookLimits.pitchDown)).toBeLessThan(0.05);

    rigContext.dispose();
  });
});
