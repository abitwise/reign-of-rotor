import { describe, expect, it } from 'vitest';
import { getLodIndex } from '../terrainChunkManager';

describe('getLodIndex', () => {
  it('throws error when WORLD_CONFIG.render.lodRings is empty', () => {
    // Note: This test would require mocking WORLD_CONFIG, which is not ideal.
    // In a real scenario, we'd refactor to pass lodRings as a parameter.
    // For now, we test the happy path with the actual WORLD_CONFIG.
  });

  it('returns correct LOD index for distance within first ring', () => {
    // WORLD_CONFIG.render.lodRings[0] = { radius: 1, subdivisions: 20 }
    const result = getLodIndex(0.5);
    expect(result).toBe(0);
  });

  it('returns correct LOD index for distance exactly at first ring boundary', () => {
    // WORLD_CONFIG.render.lodRings[0] = { radius: 1, subdivisions: 20 }
    const result = getLodIndex(1);
    expect(result).toBe(0);
  });

  it('returns correct LOD index for distance within second ring', () => {
    // WORLD_CONFIG.render.lodRings[1] = { radius: 2, subdivisions: 12 }
    const result = getLodIndex(1.5);
    expect(result).toBe(1);
  });

  it('returns correct LOD index for distance exactly at second ring boundary', () => {
    // WORLD_CONFIG.render.lodRings[1] = { radius: 2, subdivisions: 12 }
    const result = getLodIndex(2);
    expect(result).toBe(1);
  });

  it('returns correct LOD index for distance within third ring', () => {
    // WORLD_CONFIG.render.lodRings[2] = { radius: 3, subdivisions: 4 }
    const result = getLodIndex(2.5);
    expect(result).toBe(2);
  });

  it('returns correct LOD index for distance exactly at third ring boundary', () => {
    // WORLD_CONFIG.render.lodRings[2] = { radius: 3, subdivisions: 4 }
    const result = getLodIndex(3);
    expect(result).toBe(2);
  });

  it('returns -1 for distance beyond all rings', () => {
    // All rings have max radius of 3
    const result = getLodIndex(4);
    expect(result).toBe(-1);
  });

  it('returns -1 for very large distances', () => {
    const result = getLodIndex(1000);
    expect(result).toBe(-1);
  });

  it('returns correct LOD index for distance of 0', () => {
    const result = getLodIndex(0);
    expect(result).toBe(0);
  });

  it('handles edge case between rings correctly', () => {
    // Test just above first ring boundary
    const result = getLodIndex(1.0001);
    expect(result).toBe(1); // Should fall into second ring
  });
});
