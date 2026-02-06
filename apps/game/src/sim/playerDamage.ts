import type RAPIER from '@dimforge/rapier3d-compat';
import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { GameState } from '../boot/createApp';
import type { EnemyState } from './enemies';
import type { MissionRuntime } from './missionDirector';
import type { DifficultyPreset, SubsystemDegradationConfig, PlayerDamageTuning, DamageCurve } from '../content/difficulty';
import type { AltimeterState } from './altimeter';
import { LandingState } from './altimeter';
import type { Entity } from '../physics/types';

export type DamageCause = 'sam' | 'crash' | 'unknown';

export type PlayerDamageEffects = {
  enginePowerScale: number;
  rotorLiftScale: number;
  rotorTorqueScale: number;
  avionicsScale: number;
  weaponsScale: number;
  sensorsScale: number;
};

export type PlayerSubsystemHealth = {
  engine: number;
  rotor: number;
  avionics: number;
  weapons: number;
  sensors: number;
};

export type PlayerDamageState = {
  maxHull: number;
  hull: number;
  subsystems: PlayerSubsystemHealth;
  effects: PlayerDamageEffects;
  lastDamageCause: DamageCause | null;
  destroyed: boolean;
  lastLandingState: LandingState;
};

export type DamageableHeli = {
  entity: Entity;
  body: RAPIER.RigidBody;
  altimeter: AltimeterState;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const computeDamageCurve = (health: number, curve: DamageCurve): number => {
  const clamped = clamp01(health);
  return curve.minMultiplier + (1 - curve.minMultiplier) * Math.pow(clamped, curve.exponent);
};

export const computeDamageEffects = (
  subsystems: PlayerSubsystemHealth,
  curves: SubsystemDegradationConfig
): PlayerDamageEffects => ({
  enginePowerScale: computeDamageCurve(subsystems.engine, curves.enginePower),
  rotorLiftScale: computeDamageCurve(subsystems.rotor, curves.rotorLift),
  rotorTorqueScale: computeDamageCurve(subsystems.rotor, curves.rotorTorque),
  avionicsScale: computeDamageCurve(subsystems.avionics, curves.avionics),
  weaponsScale: computeDamageCurve(subsystems.weapons, curves.weapons),
  sensorsScale: computeDamageCurve(subsystems.sensors, curves.sensors)
});

export const createPlayerDamageState = (difficulty: DifficultyPreset): PlayerDamageState => {
  const subsystems = {
    engine: 1,
    rotor: 1,
    avionics: 1,
    weapons: 1,
    sensors: 1
  };

  return {
    maxHull: difficulty.player.maxHull,
    hull: difficulty.player.maxHull,
    subsystems,
    effects: computeDamageEffects(subsystems, difficulty.degradation),
    lastDamageCause: null,
    destroyed: false,
    lastLandingState: LandingState.Airborne
  };
};

export const applyDamage = (
  state: PlayerDamageState,
  amount: number,
  cause: DamageCause,
  tuning: PlayerDamageTuning,
  curves: SubsystemDegradationConfig
): void => {
  if (amount <= 0 || state.destroyed) {
    return;
  }

  state.hull = clamp01((state.hull - amount) / state.maxHull) * state.maxHull;
  state.lastDamageCause = cause;

  const normalized = amount / state.maxHull;
  const subsystemDelta = normalized * tuning.subsystemDamageMultiplier;
  state.subsystems.engine = clamp01(state.subsystems.engine - subsystemDelta);
  state.subsystems.rotor = clamp01(state.subsystems.rotor - subsystemDelta);
  state.subsystems.avionics = clamp01(state.subsystems.avionics - subsystemDelta);
  state.subsystems.weapons = clamp01(state.subsystems.weapons - subsystemDelta);
  state.subsystems.sensors = clamp01(state.subsystems.sensors - subsystemDelta);

  state.effects = computeDamageEffects(state.subsystems, curves);

  if (state.hull <= 0.001) {
    state.destroyed = true;
  }
};

export const createPlayerDamageSystem = ({
  heli,
  state,
  mission,
  enemies,
  gameState,
  difficulty
}: {
  heli: DamageableHeli;
  state: PlayerDamageState;
  mission: MissionRuntime;
  enemies: EnemyState;
  gameState: GameState;
  difficulty: DifficultyPreset;
}): LoopSystem => ({
  id: `sim.playerDamage.${heli.entity}`,
  phase: SystemPhase.PostPhysics,
  step: () => {
    if (gameState.isPaused || mission.status !== 'active') {
      return;
    }

    const tuning = difficulty.player;
    const curves = difficulty.degradation;

    if (state.lastLandingState !== heli.altimeter.landingState) {
      state.lastLandingState = heli.altimeter.landingState;
      if (heli.altimeter.landingState === LandingState.Crashed) {
        const crashDamage = heli.altimeter.impactSeverity * tuning.crashDamageMultiplier;
        applyDamage(state, crashDamage, 'crash', tuning, curves);
      }
    }

    if (!state.destroyed && enemies.explosionEvents.length > 0) {
      const position = heli.body.translation();
      for (const explosion of enemies.explosionEvents) {
        const radius = explosion.radius;
        if (radius <= 0) {
          continue;
        }
        const dx = position.x - explosion.position.x;
        const dy = position.y - explosion.position.y;
        const dz = position.z - explosion.position.z;
        const distanceSq = dx * dx + dy * dy + dz * dz;
        const radiusSq = radius * radius;
        if (distanceSq > radiusSq) {
          continue;
        }
        const distance = Math.sqrt(distanceSq);
        const falloff = 1 - distance / radius;
        const scaledDamage = explosion.damage * falloff * tuning.missileDamageMultiplier;
        applyDamage(state, scaledDamage, 'sam', tuning, curves);
      }
    }

    if (state.destroyed && mission.status === 'active') {
      mission.status = 'failed';
      if (!state.lastDamageCause) {
        state.lastDamageCause = 'unknown';
      }
    }
  }
});
