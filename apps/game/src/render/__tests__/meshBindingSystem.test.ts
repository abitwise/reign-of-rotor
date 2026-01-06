import { describe, expect, it, vi } from 'vitest';
import { MeshBuilder, NullEngine, Quaternion, Scene } from '@babylonjs/core';
import { MeshBindingSystem } from '../meshBindingSystem';

describe('MeshBindingSystem', () => {
  it('applies transforms from the provider to bound meshes', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreateBox('box', {}, scene);

    const bindings = new MeshBindingSystem({
      transformProvider: () => ({
        translation: { x: 2, y: 4, z: -1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      })
    });

    bindings.bind(1, mesh);
    bindings.updateFromTransforms();

    expect(mesh.position.asArray()).toEqual([2, 4, -1]);
    expect(mesh.rotationQuaternion).toBeInstanceOf(Quaternion);

    scene.dispose();
    engine.dispose();
  });

  it('signals missing transforms when provider returns null', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreateBox('box', {}, scene);

    const onMissing = vi.fn();
    const bindings = new MeshBindingSystem({
      transformProvider: () => null,
      onMissingTransform: onMissing
    });

    bindings.bind(42, mesh);
    bindings.updateFromTransforms();

    expect(onMissing).toHaveBeenCalledWith(42);

    scene.dispose();
    engine.dispose();
  });
});
