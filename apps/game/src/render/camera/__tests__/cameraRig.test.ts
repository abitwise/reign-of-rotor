import { describe, expect, it } from 'vitest';
import { MeshBuilder, NullEngine, Quaternion, Scene, UniversalCamera, Vector3 } from '@babylonjs/core';
import type { Transform } from '../../../physics/types';
import { CameraRig } from '../cameraRig';

const identityTransform: Transform = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 }
};

const createRig = () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const camera = new UniversalCamera('testCamera', Vector3.Zero(), scene);
  camera.rotationQuaternion = new Quaternion();

  const rig = new CameraRig({
    camera,
    transformProvider: () => identityTransform
  });

  return {
    rig,
    scene,
    engine
  };
};

describe('CameraRig', () => {
  it('toggles camera mode state between cockpit and chase', () => {
    const { rig, scene, engine } = createRig();

    expect(rig.getMode()).toBe('cockpit');
    rig.toggleMode();
    expect(rig.getMode()).toBe('chase');
    rig.toggleMode();
    expect(rig.getMode()).toBe('cockpit');

    scene.dispose();
    engine.dispose();
  });

  it('hides helicopter mesh in cockpit mode and shows it in chase mode', () => {
    const { rig, scene, engine } = createRig();
    const mesh = MeshBuilder.CreateBox('heli', { size: 1 }, scene);

    rig.setTargetMesh(mesh);
    rig.setMode('cockpit');
    expect(mesh.isEnabled()).toBe(false);

    rig.setMode('chase');
    expect(mesh.isEnabled()).toBe(true);

    scene.dispose();
    engine.dispose();
  });
});
