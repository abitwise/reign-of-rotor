import { beforeAll, describe, expect, it } from 'vitest';
import { createPhysicsWorld } from '../../physics/world';
import { loadRapier } from '../../physics/rapierInstance';
import { createPropColliderManager } from '../terrain/propColliders';
import { PROP_DRESSING_CONFIG, getBuildingArchetype, getTileDressing } from '../../content/propDressing';
import { WORLD_CONFIG, getTileIndexForPosition, getWorldTileCount } from '../../content/world';

const getDesiredTiles = (centerTileX: number, centerTileZ: number): Array<{ tileX: number; tileZ: number }> => {
  const { tilesX, tilesZ } = getWorldTileCount(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize);
  const desired: Array<{ tileX: number; tileZ: number }> = [];
  const radius = PROP_DRESSING_CONFIG.tileRadius;

  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const tileX = centerTileX + dx;
      const tileZ = centerTileZ + dz;

      if (tileX < 0 || tileZ < 0 || tileX >= tilesX || tileZ >= tilesZ) {
        continue;
      }

      desired.push({ tileX, tileZ });
    }
  }

  return desired;
};

const countExpectedColliders = (position: { x: number; z: number }): number => {
  const { tileX, tileZ } = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, position);
  const tiles = getDesiredTiles(tileX, tileZ);

  return tiles.reduce((total, tile) => {
    const dressing = getTileDressing(tile.tileX, tile.tileZ);
    const tileCount = dressing.buildings.filter((building) =>
      getBuildingArchetype(building.variantId).hasCollider
    ).length;
    return total + tileCount;
  }, 0);
};

describe('prop collider streaming', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('creates colliders for buildings with collider flags inside the streaming radius', () => {
    const physics = createPhysicsWorld(rapier);
    const props = createPropColliderManager(physics);

    const position = { x: 0, z: 0 };
    props.update(position);

    expect(physics.world.colliders.len()).toBe(countExpectedColliders(position));
  });

  it('updates collider count when moving between tiles', () => {
    const physics = createPhysicsWorld(rapier);
    const props = createPropColliderManager(physics);

    const first = { x: -10, z: -10 };
    const second = { x: 20, z: 5 };

    props.update(first);
    expect(physics.world.colliders.len()).toBe(countExpectedColliders(first));

    props.update(second);
    expect(physics.world.colliders.len()).toBe(countExpectedColliders(second));
  });
});
