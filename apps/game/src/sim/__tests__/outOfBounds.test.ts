import { describe, expect, it } from 'vitest';
import {
  createOutOfBoundsState,
  isWithinMissionBounds,
  updateOutOfBoundsState
} from '../outOfBounds';
import type { MissionBoundsConfig, MissionBounds } from '../../content/missions';

describe('out-of-bounds checks', () => {
  it('detects positions inside/outside a circle', () => {
    const bounds: MissionBounds = { type: 'circle', center: { x: 0, z: 0 }, radius: 100 };

    expect(isWithinMissionBounds(bounds, { x: 10, z: -10 })).toBe(true);
    expect(isWithinMissionBounds(bounds, { x: 120, z: 0 })).toBe(false);
  });

  it('detects positions inside/outside a rectangle', () => {
    const bounds: MissionBounds = {
      type: 'rect',
      center: { x: 50, z: -25 },
      halfWidth: 20,
      halfDepth: 10
    };

    expect(isWithinMissionBounds(bounds, { x: 60, z: -20 })).toBe(true);
    expect(isWithinMissionBounds(bounds, { x: 80, z: -20 })).toBe(false);
  });
});

describe('out-of-bounds countdown', () => {
  it('counts down outside bounds and resets when back inside', () => {
    const config: MissionBoundsConfig = { type: 'circle', radius: 100, warningSeconds: 5 };
    const bounds: MissionBounds = { type: 'circle', center: { x: 0, z: 0 }, radius: 100 };
    const state = createOutOfBoundsState(config);

    const expiredFirst = updateOutOfBoundsState({
      state,
      bounds,
      config,
      position: { x: 200, z: 0 },
      deltaSeconds: 2
    });
    expect(expiredFirst).toBe(false);
    expect(state.active).toBe(true);
    expect(state.remainingSeconds).toBe(3);

    updateOutOfBoundsState({
      state,
      bounds,
      config,
      position: { x: 0, z: 0 },
      deltaSeconds: 1
    });
    expect(state.active).toBe(false);
    expect(state.remainingSeconds).toBe(5);

    const expiredSecond = updateOutOfBoundsState({
      state,
      bounds,
      config,
      position: { x: 200, z: 0 },
      deltaSeconds: 5
    });
    expect(expiredSecond).toBe(true);
    expect(state.remainingSeconds).toBe(0);
  });
});
