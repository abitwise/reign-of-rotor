import { describe, expect, it } from 'vitest';
import {
  WORLD_CONFIG,
  getWorldTileCount,
  getTileIndexForPosition,
  getTileCenter,
  pickSpawnPoint,
  type WorldConfig
} from '../world';

describe('world tile math helpers', () => {
  describe('getWorldTileCount', () => {
    it('calculates correct tile counts for a 100km x 100km world with 500-unit tiles', () => {
      const result = getWorldTileCount(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize);
      expect(result.tilesX).toBe(200);
      expect(result.tilesZ).toBe(200);
    });

    it('handles non-square worlds correctly', () => {
      const bounds = { minX: -25, maxX: 75, minZ: -10, maxZ: 40 };
      const result = getWorldTileCount(bounds, 10);
      expect(result.tilesX).toBe(10); // 100 / 10
      expect(result.tilesZ).toBe(5); // 50 / 10
    });

    it('rounds tile counts correctly', () => {
      const bounds = { minX: 0, maxX: 25, minZ: 0, maxZ: 25 };
      const result = getWorldTileCount(bounds, 10);
      expect(result.tilesX).toBe(3); // 25 / 10 = 2.5 rounded to 3
      expect(result.tilesZ).toBe(3);
    });
  });

  describe('getTileIndexForPosition', () => {
    it('returns correct tile index for position at world origin', () => {
      const result = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, { x: 0, z: 0 });
      expect(result.tileX).toBe(100); // (-50000 to 50000) / 500, origin at tile 100
      expect(result.tileZ).toBe(100);
    });

    it('returns correct tile index for position at world min corner', () => {
      const result = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, { x: -50000, z: -50000 });
      expect(result.tileX).toBe(0);
      expect(result.tileZ).toBe(0);
    });

    it('returns correct tile index for position at world max corner', () => {
      const result = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, { x: 49999, z: 49999 });
      expect(result.tileX).toBe(199);
      expect(result.tileZ).toBe(199);
    });

    it('clamps positions outside world bounds', () => {
      const result = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, { x: 100000, z: -100000 });
      expect(result.tileX).toBe(199); // clamped to maxX (50000), which maps to the last tile (199)
      expect(result.tileZ).toBe(0); // clamped to minZ (-50000), which is tile 0
    });

    it('handles positions in arbitrary tiles correctly', () => {
      const result = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, { x: -25, z: 15 });
      expect(result.tileX).toBe(99); // (-25 - (-50000)) / 500 = 99.95 -> floor to 99
      expect(result.tileZ).toBe(100); // (15 - (-50000)) / 500 = 100.03 -> floor to 100
    });

    it('handles position exactly at maxX/maxZ boundary', () => {
      const result = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, { x: 50000, z: 50000 });
      expect(result.tileX).toBe(199); // At boundary, should clamp to last valid tile
      expect(result.tileZ).toBe(199);
    });
  });

  describe('getTileCenter', () => {
    it('returns correct center for tile at index (100, 100)', () => {
      const result = getTileCenter(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, 100, 100);
      expect(result.x).toBeCloseTo(250, 5); // -50000 + 500 * 100.5 = 250
      expect(result.z).toBeCloseTo(250, 5);
    });

    it('returns correct center for tile at min corner', () => {
      const result = getTileCenter(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, 0, 0);
      expect(result.x).toBeCloseTo(-49750, 5); // -50000 + 500 * 0.5
      expect(result.z).toBeCloseTo(-49750, 5);
    });

    it('returns correct center for tile at max corner', () => {
      const result = getTileCenter(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, 199, 199);
      expect(result.x).toBeCloseTo(49750, 5); // -50000 + 500 * 199.5
      expect(result.z).toBeCloseTo(49750, 5);
    });

    it('returns correct center for arbitrary tile', () => {
      const result = getTileCenter(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, 12, 76);
      expect(result.x).toBeCloseTo(-43750, 5); // -50000 + 500 * 12.5
      expect(result.z).toBeCloseTo(-11750, 5); // -50000 + 500 * 76.5
    });
  });
});

describe('pickSpawnPoint', () => {
  it('throws error when spawnZones is empty', () => {
    const emptyWorld: WorldConfig = {
      ...WORLD_CONFIG,
      spawnZones: []
    };
    expect(() => pickSpawnPoint(emptyWorld)).toThrow('pickSpawnPoint: world.spawnZones must contain at least one spawn zone');
  });

  it('returns a point within spawn zone radius', () => {
    // Use a deterministic random source
    let callCount = 0;
    const mockRandom = () => {
      const values = [0.25, 0.5, 0.5]; // zone index, angle factor, radius factor
      return values[callCount++ % values.length];
    };

    const point = pickSpawnPoint(WORLD_CONFIG, mockRandom);
    
    // Point should be from the second spawn zone (south, index 1)
    const zone = WORLD_CONFIG.spawnZones[1];
    const dx = point.x - zone.center.x;
    const dz = point.z - zone.center.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    expect(distance).toBeLessThanOrEqual(zone.radius);
  });

  it('clamps points to world bounds', () => {
    // Create a world with a spawn zone outside bounds
    const testWorld: WorldConfig = {
      ...WORLD_CONFIG,
      bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      spawnZones: [
        { id: 'outside', center: { x: 100, z: 100 }, radius: 5 }
      ]
    };

    const point = pickSpawnPoint(testWorld, () => 0.5);
    
    expect(point.x).toBeGreaterThanOrEqual(testWorld.bounds.minX);
    expect(point.x).toBeLessThanOrEqual(testWorld.bounds.maxX);
    expect(point.z).toBeGreaterThanOrEqual(testWorld.bounds.minZ);
    expect(point.z).toBeLessThanOrEqual(testWorld.bounds.maxZ);
  });

  it('uses provided randomSource for deterministic results', () => {
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const point1 = pickSpawnPoint(WORLD_CONFIG, seededRandom);
    
    seed = 42; // reset seed
    const point2 = pickSpawnPoint(WORLD_CONFIG, seededRandom);
    
    expect(point1.x).toBe(point2.x);
    expect(point1.z).toBe(point2.z);
  });

  it('distributes points within spawn zone using polar coordinates', () => {
    // Test with deterministic values that should produce a specific point
    const mockRandom = () => 0; // All zeros should give center point
    
    const point = pickSpawnPoint(WORLD_CONFIG, mockRandom);
    
    // With all zeros: zone index 0, angle 0, radius 0 -> should be at zone center
    const zone = WORLD_CONFIG.spawnZones[0];
    expect(point.x).toBeCloseTo(zone.center.x, 5);
    expect(point.z).toBeCloseTo(zone.center.z, 5);
  });
});
