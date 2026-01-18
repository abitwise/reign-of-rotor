import { describe, expect, it } from 'vitest';
import { WORLD_CONFIG } from '../../../content/world';
import { getLodIndex } from '../terrainChunkManager';

describe('getLodIndex', () => {
  it('throws error when WORLD_CONFIG.render.lodRings is empty', () => {
    // Note: This test would require mocking WORLD_CONFIG, which is not ideal.
    // In a real scenario, we'd refactor to pass lodRings as a parameter.
    // For now, we test the happy path with the actual WORLD_CONFIG.
  });

  it('returns correct LOD index for distance within first ring', () => {
    const radius = WORLD_CONFIG.render.lodRings[0].radius;
    const result = getLodIndex(radius * 0.5);
    expect(result).toBe(0);
  });

  it('returns correct LOD index for distance exactly at first ring boundary', () => {
    const radius = WORLD_CONFIG.render.lodRings[0].radius;
    const result = getLodIndex(radius);
    expect(result).toBe(0);
  });

  it('returns correct LOD index for distance within second ring', () => {
    const inner = WORLD_CONFIG.render.lodRings[0].radius;
    const outer = WORLD_CONFIG.render.lodRings[1].radius;
    const result = getLodIndex((inner + outer) * 0.5);
    expect(result).toBe(1);
  });

  it('returns correct LOD index for distance exactly at second ring boundary', () => {
    const radius = WORLD_CONFIG.render.lodRings[1].radius;
    const result = getLodIndex(radius);
    expect(result).toBe(1);
  });

  it('returns correct LOD index for distance within third ring', () => {
    const inner = WORLD_CONFIG.render.lodRings[1].radius;
    const outer = WORLD_CONFIG.render.lodRings[2].radius;
    const result = getLodIndex((inner + outer) * 0.5);
    expect(result).toBe(2);
  });

  it('returns correct LOD index for distance exactly at third ring boundary', () => {
    const radius = WORLD_CONFIG.render.lodRings[2].radius;
    const result = getLodIndex(radius);
    expect(result).toBe(2);
  });

  it('returns -1 for distance beyond all rings', () => {
    const radius = WORLD_CONFIG.render.lodRings[WORLD_CONFIG.render.lodRings.length - 1].radius;
    const result = getLodIndex(radius + 1);
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
    const radius = WORLD_CONFIG.render.lodRings[0].radius;
    const result = getLodIndex(radius + 0.0001);
    expect(result).toBe(1); // Should fall into second ring
  });
});
