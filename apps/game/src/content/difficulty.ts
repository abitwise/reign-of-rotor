import type { SamConfig } from './enemies';

export type DifficultyId = 'easy' | 'normal' | 'hard';

export type SamDifficultyTuning = {
  lockTimeMultiplier: number;
  accuracyMultiplier: number;
  damageMultiplier: number;
};

export type DamageCurve = {
  minMultiplier: number;
  exponent: number;
};

export type SubsystemDegradationConfig = {
  enginePower: DamageCurve;
  rotorLift: DamageCurve;
  rotorTorque: DamageCurve;
  avionics: DamageCurve;
  weapons: DamageCurve;
  sensors: DamageCurve;
};

export type PlayerDamageTuning = {
  maxHull: number;
  missileDamageMultiplier: number;
  crashDamageMultiplier: number;
  subsystemDamageMultiplier: number;
};

export type DifficultyPreset = {
  id: DifficultyId;
  label: string;
  sam: SamDifficultyTuning;
  player: PlayerDamageTuning;
  degradation: SubsystemDegradationConfig;
};

const BASE_SUBSYSTEM_CURVES: SubsystemDegradationConfig = {
  enginePower: { minMultiplier: 0.4, exponent: 1.35 },
  rotorLift: { minMultiplier: 0.45, exponent: 1.5 },
  rotorTorque: { minMultiplier: 0.45, exponent: 1.55 },
  avionics: { minMultiplier: 0.6, exponent: 1.25 },
  weapons: { minMultiplier: 0.5, exponent: 1.35 },
  sensors: { minMultiplier: 0.55, exponent: 1.3 }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const adjustCurves = (minOffset: number, exponentScale: number): SubsystemDegradationConfig => {
  const apply = (curve: DamageCurve): DamageCurve => ({
    minMultiplier: clamp(curve.minMultiplier + minOffset, 0.2, 0.95),
    exponent: clamp(curve.exponent * exponentScale, 0.6, 2.5)
  });

  return {
    enginePower: apply(BASE_SUBSYSTEM_CURVES.enginePower),
    rotorLift: apply(BASE_SUBSYSTEM_CURVES.rotorLift),
    rotorTorque: apply(BASE_SUBSYSTEM_CURVES.rotorTorque),
    avionics: apply(BASE_SUBSYSTEM_CURVES.avionics),
    weapons: apply(BASE_SUBSYSTEM_CURVES.weapons),
    sensors: apply(BASE_SUBSYSTEM_CURVES.sensors)
  };
};

export const DIFFICULTY_PRESETS: Record<DifficultyId, DifficultyPreset> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    sam: {
      lockTimeMultiplier: 1.25,
      accuracyMultiplier: 0.85,
      damageMultiplier: 0.75
    },
    player: {
      maxHull: 130,
      missileDamageMultiplier: 0.85,
      crashDamageMultiplier: 16,
      subsystemDamageMultiplier: 0.7
    },
    degradation: adjustCurves(0.12, 0.9)
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    sam: {
      lockTimeMultiplier: 1,
      accuracyMultiplier: 1,
      damageMultiplier: 1
    },
    player: {
      maxHull: 110,
      missileDamageMultiplier: 1,
      crashDamageMultiplier: 18,
      subsystemDamageMultiplier: 0.85
    },
    degradation: adjustCurves(0, 1)
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    sam: {
      lockTimeMultiplier: 0.85,
      accuracyMultiplier: 1.15,
      damageMultiplier: 1.2
    },
    player: {
      maxHull: 95,
      missileDamageMultiplier: 1.15,
      crashDamageMultiplier: 20,
      subsystemDamageMultiplier: 1
    },
    degradation: adjustCurves(-0.08, 1.1)
  }
};

export const DEFAULT_DIFFICULTY_PRESET = DIFFICULTY_PRESETS.normal;

export const applySamDifficulty = (config: SamConfig, tuning: SamDifficultyTuning): SamConfig => ({
  ...config,
  lockTimeSeconds: config.lockTimeSeconds * tuning.lockTimeMultiplier,
  lockConeDegrees: config.lockConeDegrees * tuning.accuracyMultiplier,
  missileTurnRateDeg: config.missileTurnRateDeg * tuning.accuracyMultiplier,
  missileDamage: config.missileDamage * tuning.damageMultiplier
});
