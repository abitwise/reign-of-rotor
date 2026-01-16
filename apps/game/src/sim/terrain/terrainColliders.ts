import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorldContext } from '../../physics/world';
import { createColliderForEntity, createRigidBodyForEntity, removePhysicsForEntity } from '../../physics/factories';
import { createEntityId } from '../../ecs/entity';
import type { Entity } from '../../physics/types';
import {
  WORLD_CONFIG,
  getTileCenter,
  getTileIndexForPosition,
  getTileKey,
  getWorldTileCount
} from '../../content/world';

export type TerrainColliderManager = {
  update: (position: { x: number; z: number }) => void;
  dispose: () => void;
};

type TerrainColliderTile = {
  key: string;
  entity: Entity;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
};

const getDesiredTiles = (centerTileX: number, centerTileZ: number): Array<{ tileX: number; tileZ: number; key: string }> => {
  const { tilesX, tilesZ } = getWorldTileCount(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize);
  const desired: Array<{ tileX: number; tileZ: number; key: string }> = [];
  const radius = WORLD_CONFIG.physics.tileRadius;

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

export const createTerrainColliderManager = (physics: PhysicsWorldContext): TerrainColliderManager => {
  const tiles = new Map<string, TerrainColliderTile>();
  const { rapier } = physics;

  const addTile = (tileX: number, tileZ: number, key: string): void => {
    const entity = createEntityId();
    const center = getTileCenter(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, tileX, tileZ);

    const body = createRigidBodyForEntity(physics, {
      entity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(
        center.x,
        WORLD_CONFIG.physics.groundOffsetY,
        center.z
      )
    });

    const collider = createColliderForEntity(physics, {
      entity,
      rigidBody: body,
      descriptor: rapier.ColliderDesc.cuboid(
        WORLD_CONFIG.tileSize / 2,
        WORLD_CONFIG.physics.colliderHalfHeight,
        WORLD_CONFIG.tileSize / 2
      ).setFriction(WORLD_CONFIG.physics.friction)
    });

    tiles.set(key, { key, entity, body, collider });
  };

  const removeTile = (key: string): void => {
    const tile = tiles.get(key);
    if (!tile) {
      return;
    }

    removePhysicsForEntity(physics, tile.entity);
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
