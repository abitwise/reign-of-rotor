import { beforeAll, describe, expect, it } from 'vitest';
import { createPhysicsWorld } from '../../physics/world';
import { loadRapier } from '../../physics/rapierInstance';
import { createTerrainColliderManager } from '../terrain/terrainColliders';
import { WORLD_CONFIG } from '../../content/world';

const expectedTileCount = (radius: number): number => (radius * 2 + 1) ** 2;

describe('terrain collider streaming', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('creates colliders around the focus position and keeps counts stable when moving', () => {
    const physics = createPhysicsWorld(rapier);
    const terrain = createTerrainColliderManager(physics);
    const radius = WORLD_CONFIG.physics.tileRadius;

    terrain.update({ x: 0, z: 0 });
    expect(physics.world.colliders.len()).toBe(expectedTileCount(radius));

    terrain.update({ x: 10, z: -10 });
    expect(physics.world.colliders.len()).toBe(expectedTileCount(radius));
  });
});
