import { describe, expect, it } from 'vitest';
import {
  BUILDING_ARCHETYPES,
  PROP_DRESSING_CONFIG,
  getBuildingArchetype,
  getTileDressing,
  getTreeVariant
} from '../propDressing';
import { WORLD_CONFIG } from '../world';

const getTileBounds = (tileX: number, tileZ: number) => {
  const minX = WORLD_CONFIG.bounds.minX + tileX * WORLD_CONFIG.tileSize;
  const minZ = WORLD_CONFIG.bounds.minZ + tileZ * WORLD_CONFIG.tileSize;
  return {
    minX,
    maxX: minX + WORLD_CONFIG.tileSize,
    minZ,
    maxZ: minZ + WORLD_CONFIG.tileSize
  };
};

describe('prop dressing placement', () => {
  it('produces deterministic placements for the same tile', () => {
    const first = getTileDressing(2, 3);
    const second = getTileDressing(2, 3);

    expect(first).toEqual(second);
  });

  it('keeps placements within tile bounds', () => {
    const tileX = 4;
    const tileZ = 1;
    const dressing = getTileDressing(tileX, tileZ);
    const bounds = getTileBounds(tileX, tileZ);

    dressing.trees.forEach((tree) => {
      expect(tree.position.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(tree.position.x).toBeLessThanOrEqual(bounds.maxX);
      expect(tree.position.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(tree.position.z).toBeLessThanOrEqual(bounds.maxZ);
      expect(() => getTreeVariant(tree.variantId)).not.toThrow();
    });

    dressing.buildings.forEach((building) => {
      expect(building.position.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(building.position.x).toBeLessThanOrEqual(bounds.maxX);
      expect(building.position.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(building.position.z).toBeLessThanOrEqual(bounds.maxZ);
      expect(() => getBuildingArchetype(building.variantId)).not.toThrow();
    });
  });

  it('respects density caps per tile', () => {
    const dressing = getTileDressing(5, 5);
    expect(dressing.trees.length).toBeLessThanOrEqual(PROP_DRESSING_CONFIG.maxTreesPerTile);
    expect(dressing.buildings.length).toBeLessThanOrEqual(PROP_DRESSING_CONFIG.maxBuildingsPerTile);
  });

  it('defines collider-relevant building archetypes', () => {
    const colliders = BUILDING_ARCHETYPES.filter((archetype) => archetype.hasCollider);
    expect(colliders.length).toBeGreaterThan(0);
  });
});
