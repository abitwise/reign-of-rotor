import { describe, expect, it } from 'vitest';
import { DIFFICULTY_PRESETS } from '../../content/difficulty';
import { applyDamage, computeDamageCurve, createPlayerDamageState } from '../playerDamage';

const curves = DIFFICULTY_PRESETS.normal.degradation;

describe('player damage', () => {
  it('computes damage curves with expected bounds', () => {
    const curve = curves.enginePower;
    expect(computeDamageCurve(1, curve)).toBeCloseTo(1, 5);
    expect(computeDamageCurve(0, curve)).toBeCloseTo(curve.minMultiplier, 5);
  });

  it('applies hull and subsystem damage with scaling', () => {
    const preset = DIFFICULTY_PRESETS.normal;
    const state = createPlayerDamageState(preset);

    applyDamage(state, 22, 'sam', preset.player, preset.degradation);

    expect(state.hull).toBeCloseTo(preset.player.maxHull - 22, 5);
    expect(state.subsystems.engine).toBeCloseTo(0.83, 2);
    expect(state.subsystems.rotor).toBeCloseTo(0.83, 2);
    expect(state.effects.enginePowerScale).toBeLessThan(1);
  });
});
