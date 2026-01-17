import type { PhysicsWorldContext } from '../../physics/world';
import { createColliderForEntity, createRigidBodyForEntity, removePhysicsForEntity } from '../../physics/factories';
import { createEntityId } from '../../ecs/entity';
import type { Entity } from '../../physics/types';
import { PROP_DRESSING_CONFIG, getBuildingArchetype, getTileDressing } from '../../content/propDressing';
import {
  WORLD_CONFIG,
  getTileIndexForPosition,
  getTileKey,
  getWorldTileCount
} from '../../content/world';

export type PropColliderManager = {
  update: (position: { x: number; z: number }) => void;
  dispose: () => void;
};

type PropColliderTile = {
  key: string;
  entities: Entity[];
};

const getDesiredTiles = (centerTileX: number, centerTileZ: number): Array<{ tileX: number; tileZ: number; key: string }> => {
  const { tilesX, tilesZ } = getWorldTileCount(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize);
  const desired: Array<{ tileX: number; tileZ: number; key: string }> = [];
  const radius = PROP_DRESSING_CONFIG.tileRadius;

  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const tileX = centerTileX + dx;
      const tileZ = centerTileZ + dz;

      if (tileX < 0 || tileZ < 0 || tileX >= tilesX || tileZ >= tilesZ) {
        continue;
      }

      desired.push({ tileX, tileZ, key: getTileKey(tileX, tileZ) });
    }
  }

  return desired;
};

export const createPropColliderManager = (physics: PhysicsWorldContext): PropColliderManager => {
  const tiles = new Map<string, PropColliderTile>();
  const { rapier } = physics;

  const addTile = (tileX: number, tileZ: number, key: string): void => {
    const dressing = getTileDressing(tileX, tileZ);
    const entities: Entity[] = [];

    dressing.buildings.forEach((placement) => {
      const archetype = getBuildingArchetype(placement.variantId);
      if (!archetype.hasCollider) {
        return;
      }

      const entity = createEntityId();
      const body = createRigidBodyForEntity(physics, {
        entity,
        descriptor: rapier
          .RigidBodyDesc.fixed()
          // Y-position at half-height centers the collider vertically (cuboid center).
          // Rotation from placement data is intentionally ignored for axis-aligned AABB colliders (MVP).
          .setTranslation(placement.position.x, archetype.height * 0.5, placement.position.z)
      });

      createColliderForEntity(physics, {
        entity,
        rigidBody: body,
        descriptor: rapier.ColliderDesc.cuboid(
          archetype.footprint.width * 0.5,
          archetype.height * 0.5,
          archetype.footprint.depth * 0.5
        )
      });

      entities.push(entity);
    });

    tiles.set(key, { key, entities });
  };

  const removeTile = (key: string): void => {
    const tile = tiles.get(key);
    if (!tile) {
      return;
    }

    tile.entities.forEach((entity) => removePhysicsForEntity(physics, entity));
    tiles.delete(key);
  };

  return {
    update: (position: { x: number; z: number }) => {
      const { tileX, tileZ } = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, position);
      const desiredTiles = getDesiredTiles(tileX, tileZ);
      const desiredKeys = new Set(desiredTiles.map((tile) => tile.key));

      for (const key of tiles.keys()) {
        if (!desiredKeys.has(key)) {
          removeTile(key);
        }
      }

      desiredTiles.forEach((tile) => {
        if (!tiles.has(tile.key)) {
          addTile(tile.tileX, tile.tileZ, tile.key);
        }
      });
    },
    dispose: () => {
      for (const key of tiles.keys()) {
        removeTile(key);
      }
    }
  };
};
