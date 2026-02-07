import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { GameState } from '../boot/createApp';
import type { PlayerInputState } from '../core/input/playerInput';
import type { EnemyState, EnemyUnitType } from './enemies';
import type { ConvoyState } from './convoy';
import type { MissionBounds, MissionObjectiveTemplate, MissionPlan } from '../content/missions';
import type { NavigationTarget } from '../content/avionics';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import { spawnRadarEmitter, spawnSamSite, spawnVehicle } from './enemies';
import type { RadarConfig, SamConfig, VehicleConfig } from '../content/enemies';

export type MissionObjectiveStatus = 'pending' | 'complete' | 'failed';

export type MissionObjective = {
  id: string;
  label: string;
  type: MissionObjectiveTemplate['type'];
  targetType?: MissionObjectiveTemplate['targetType'];
  requiredCount: number;
  totalTargets: number;
  destroyedCount: number;
  status: MissionObjectiveStatus;
  targetEntities: Entity[];
};

export type MissionCompletionState = {
  available: boolean;
  promptActive: boolean;
  continueSelected: boolean;
  completed: boolean;
};

export type MissionRuntime = {
  seed: number;
  templateId: string;
  templateName: string;
  summary: string;
  status: 'active' | 'completed' | 'failed';
  objectives: MissionObjective[];
  completion: MissionCompletionState;
  navigationTarget: NavigationTarget | null;
  bounds: MissionBounds;
};

export type MissionSpawnResult = {
  targetsByType: Record<EnemyUnitType, Entity[]>;
};

export const spawnMissionEnemies = ({
  state,
  physics,
  plan,
  configs
}: {
  state: EnemyState;
  physics: PhysicsWorldContext;
  plan: MissionPlan;
  configs: { radar: RadarConfig; sam: SamConfig; vehicle: VehicleConfig };
}): MissionSpawnResult => {
  const targetsByType: Record<EnemyUnitType, Entity[]> = {
    radar: [],
    sam: [],
    vehicle: []
  };

  for (const spawn of plan.enemySpawns) {
    switch (spawn.type) {
      case 'radar': {
        const radar = spawnRadarEmitter(state, physics, configs.radar, spawn.position);
        targetsByType.radar.push(radar.unit.entity);
        break;
      }
      case 'sam': {
        const sam = spawnSamSite(state, physics, configs.sam, spawn.position);
        targetsByType.sam.push(sam.unit.entity);
        break;
      }
      case 'vehicle': {
        const vehicle = spawnVehicle(state, physics, configs.vehicle, {
          position: spawn.position,
          patrolPath: spawn.patrolPath
        });
        targetsByType.vehicle.push(vehicle.unit.entity);
        break;
      }
      default:
        break;
    }
  }

  return { targetsByType };
};

export const createMissionRuntime = ({
  seed,
  templateId,
  templateName,
  summary,
  objectives,
  targetsByType,
  navigationTarget,
  bounds
}: {
  seed: number;
  templateId: string;
  templateName: string;
  summary: string;
  objectives: MissionObjectiveTemplate[];
  targetsByType: Record<EnemyUnitType, Entity[]>;
  navigationTarget: NavigationTarget | null;
  bounds: MissionBounds;
}): MissionRuntime => {
  const runtimeObjectives = objectives.map((objective) => {
    const targets = objective.targetType ? targetsByType[objective.targetType] ?? [] : [];
    const totalTargets = targets.length;
    const requiredCount = Math.max(0, objective.requiredCount ?? totalTargets);
    return {
      id: objective.id,
      label: objective.label,
      type: objective.type,
      targetType: objective.targetType,
      requiredCount,
      totalTargets,
      destroyedCount: 0,
      status: 'pending',
      targetEntities: [...targets]
    } as MissionObjective;
  });

  return {
    seed,
    templateId,
    templateName,
    summary,
    status: 'active',
    objectives: runtimeObjectives,
    completion: {
      available: false,
      promptActive: false,
      continueSelected: false,
      completed: false
    },
    navigationTarget,
    bounds
  };
};

export const createMissionSystem = ({
  mission,
  enemies,
  convoy,
  input,
  gameState
}: {
  mission: MissionRuntime;
  enemies: EnemyState;
  convoy: ConvoyState | null;
  input: PlayerInputState;
  gameState: GameState;
}): LoopSystem => ({
  id: 'sim.missionDirector',
  phase: SystemPhase.PostPhysics,
  step: () => {
    if (gameState.isPaused || mission.status !== 'active') {
      return;
    }

    updateMissionObjectives(mission, enemies, convoy);

    if (mission.completion.available) {
      if (input.confirmMissionComplete) {
        mission.status = 'completed';
        mission.completion.completed = true;
        mission.completion.promptActive = false;
      } else if (input.continueMission) {
        mission.completion.promptActive = false;
        mission.completion.continueSelected = true;
      } else if (!mission.completion.continueSelected) {
        mission.completion.promptActive = true;
      }
    }
  }
});

const updateMissionObjectives = (
  mission: MissionRuntime,
  enemies: EnemyState,
  convoy: ConvoyState | null
): void => {
  let allComplete = true;

  for (const objective of mission.objectives) {
    if (objective.status === 'complete') {
      continue;
    }

    if (objective.type === 'escort') {
      if (convoy?.completed) {
        objective.status = 'complete';
        objective.destroyedCount = objective.requiredCount;
      } else {
        objective.status = 'pending';
        allComplete = false;
      }
      continue;
    }

    const targetEntities = objective.targetEntities;
    let aliveCount = 0;
    for (const entity of targetEntities) {
      if (enemies.unitMap.has(entity)) {
        aliveCount += 1;
      }
    }

    const destroyedCount = Math.max(0, objective.totalTargets - aliveCount);
    objective.destroyedCount = destroyedCount;

    if (destroyedCount >= objective.requiredCount) {
      objective.status = 'complete';
    } else {
      objective.status = 'pending';
      allComplete = false;
    }
  }

  mission.completion.available = allComplete && mission.objectives.length > 0;
  if (!mission.completion.available) {
    mission.completion.promptActive = false;
    mission.completion.continueSelected = false;
  }
};
