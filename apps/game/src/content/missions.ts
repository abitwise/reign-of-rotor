import type { EnemySpawn, VehicleConfig } from './enemies';
import { WORLD_CONFIG, clampToWorldBounds, type WorldConfig } from './world';

export type MissionTemplateId = 'convoy-strike' | 'radar-sweep' | 'escort';

export type MissionObjectiveTemplate = {
  id: string;
  label: string;
  type: 'destroy' | 'escort';
  targetType?: 'radar' | 'sam' | 'vehicle';
  requiredCount?: number;
};

export type MissionWaypointTemplate = {
  id: string;
  label: string;
  offset: { x: number; z: number };
};

export type MissionTemplate = {
  id: MissionTemplateId;
  name: string;
  summary: string;
  objectives: MissionObjectiveTemplate[];
  enemySpawns: EnemySpawn[];
  convoy?: {
    routeOffsets: { x: number; z: number }[];
    unitCount: number;
  };
  primaryWaypoint: MissionWaypointTemplate;
};

export type MissionDirectorConfig = {
  minDistanceFromPlayer: number;
  maxDistanceFromPlayer: number;
  rotationVarianceDegrees: number;
  convoySpacing: number;
  convoySpeed: number;
};

export type MissionBoundsConfig =
  | {
      type: 'circle';
      radius: number;
      warningSeconds: number;
    }
  | {
      type: 'rect';
      halfWidth: number;
      halfDepth: number;
      warningSeconds: number;
    };

export type MissionBounds =
  | {
      type: 'circle';
      center: { x: number; z: number };
      radius: number;
    }
  | {
      type: 'rect';
      center: { x: number; z: number };
      halfWidth: number;
      halfDepth: number;
    };

export type ConvoyPlan = {
  route: { x: number; y: number; z: number }[];
  unitCount: number;
  spacing: number;
  speed: number;
};

export type MissionPlan = {
  seed: number;
  origin: { x: number; z: number };
  template: MissionTemplate;
  enemySpawns: EnemySpawn[];
  convoyPlan: ConvoyPlan | null;
  primaryWaypoint: { label: string; position: { x: number; z: number } } | null;
};

export const MISSION_DIRECTOR_CONFIG: MissionDirectorConfig = {
  minDistanceFromPlayer: 6500,
  maxDistanceFromPlayer: 14000,
  rotationVarianceDegrees: 360,
  convoySpacing: 18,
  convoySpeed: 12
};

export const MISSION_BOUNDS_CONFIG: MissionBoundsConfig = {
  type: 'circle',
  radius: 20000,
  warningSeconds: 20
};

export const DEFAULT_CONVOY_VEHICLE_CONFIG: VehicleConfig = {
  name: 'Convoy Vehicle',
  maxHealth: 120,
  colliderHalfExtents: { x: 1.6, y: 1, z: 2.6 },
  patrolSpeed: 12
};

const CONVOY_ROUTE: { x: number; z: number }[] = [
  { x: -420, z: -360 },
  { x: 120, z: 180 },
  { x: 460, z: 420 }
];

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'convoy-strike',
    name: 'Convoy Strike',
    summary: 'Eliminate a moving convoy and its radar overwatch.',
    objectives: [
      {
        id: 'convoy-destroy',
        label: 'Destroy convoy vehicles',
        type: 'destroy',
        targetType: 'vehicle'
      },
      {
        id: 'radar-destroy',
        label: 'Eliminate radar site',
        type: 'destroy',
        targetType: 'radar',
        requiredCount: 1
      }
    ],
    enemySpawns: [
      {
        type: 'vehicle',
        position: { x: -380, y: 0, z: -320 },
        patrolPath: CONVOY_ROUTE.map((point) => ({ x: point.x, y: 0, z: point.z }))
      },
      {
        type: 'vehicle',
        position: { x: -410, y: 0, z: -360 },
        patrolPath: CONVOY_ROUTE.map((point) => ({ x: point.x + 20, y: 0, z: point.z + 20 }))
      },
      {
        type: 'vehicle',
        position: { x: -440, y: 0, z: -400 },
        patrolPath: CONVOY_ROUTE.map((point) => ({ x: point.x + 40, y: 0, z: point.z + 40 }))
      },
      {
        type: 'radar',
        position: { x: 520, y: 0, z: 180 }
      },
      {
        type: 'sam',
        position: { x: 420, y: 0, z: 80 }
      }
    ],
    primaryWaypoint: {
      id: 'convoy-waypoint',
      label: 'Convoy',
      offset: { x: 120, z: 180 }
    }
  },
  {
    id: 'radar-sweep',
    name: 'Radar Sweep',
    summary: 'Neutralize radar and SAM coverage in the AO.',
    objectives: [
      {
        id: 'radar',
        label: 'Destroy radar site',
        type: 'destroy',
        targetType: 'radar',
        requiredCount: 1
      },
      {
        id: 'sam',
        label: 'Disable SAM launcher',
        type: 'destroy',
        targetType: 'sam',
        requiredCount: 1
      }
    ],
    enemySpawns: [
      {
        type: 'radar',
        position: { x: -120, y: 0, z: -80 }
      },
      {
        type: 'sam',
        position: { x: 160, y: 0, z: 120 }
      },
      {
        type: 'vehicle',
        position: { x: 220, y: 0, z: -160 }
      }
    ],
    primaryWaypoint: {
      id: 'radar-waypoint',
      label: 'Radar',
      offset: { x: -120, z: -80 }
    }
  },
  {
    id: 'escort',
    name: 'Escort Run',
    summary: 'Escort a friendly convoy through hostile territory.',
    objectives: [
      {
        id: 'escort',
        label: 'Escort convoy to destination',
        type: 'escort'
      }
    ],
    enemySpawns: [
      {
        type: 'sam',
        position: { x: -240, y: 0, z: 260 }
      },
      {
        type: 'vehicle',
        position: { x: 180, y: 0, z: -220 }
      }
    ],
    convoy: {
      routeOffsets: [
        { x: -420, z: -340 },
        { x: -40, z: 140 },
        { x: 420, z: 420 }
      ],
      unitCount: 2
    },
    primaryWaypoint: {
      id: 'escort-destination',
      label: 'Convoy Dest',
      offset: { x: 420, z: 420 }
    }
  }
];

export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const createMissionPlan = ({
  seed,
  playerSpawn,
  config = MISSION_DIRECTOR_CONFIG,
  templates = MISSION_TEMPLATES,
  world = WORLD_CONFIG
}: {
  seed: number;
  playerSpawn: { x: number; z: number };
  config?: MissionDirectorConfig;
  templates?: MissionTemplate[];
  world?: WorldConfig;
}): MissionPlan => {
  if (!templates || templates.length === 0) {
    throw new Error('createMissionPlan: templates array must not be empty');
  }

  const random = createSeededRandom(seed);
  const template = templates[Math.floor(random() * templates.length)];

  const distance =
    config.minDistanceFromPlayer + random() * (config.maxDistanceFromPlayer - config.minDistanceFromPlayer);
  const angle = random() * Math.PI * 2;
  const origin = clampToWorldBounds(world.bounds, {
    x: playerSpawn.x + Math.cos(angle) * distance,
    z: playerSpawn.z + Math.sin(angle) * distance
  });

  const rotation = (random() * config.rotationVarianceDegrees * Math.PI) / 180;

  const enemySpawns = template.enemySpawns.map((spawn) =>
    offsetSpawn(origin, spawn, rotation)
  );

  const convoyPlan = template.convoy
    ? buildConvoyPlan(template.convoy, origin, rotation, config)
    : null;

  const primaryWaypoint = template.primaryWaypoint
    ? {
        label: template.primaryWaypoint.label,
        position: rotateOffset(origin, template.primaryWaypoint.offset, rotation)
      }
    : null;

  return {
    seed,
    origin,
    template,
    enemySpawns,
    convoyPlan,
    primaryWaypoint
  };
};

export const createMissionBounds = (
  origin: { x: number; z: number },
  config: MissionBoundsConfig = MISSION_BOUNDS_CONFIG
): MissionBounds => {
  if (config.type === 'rect') {
    return {
      type: 'rect',
      center: { x: origin.x, z: origin.z },
      halfWidth: config.halfWidth,
      halfDepth: config.halfDepth
    };
  }

  return {
    type: 'circle',
    center: { x: origin.x, z: origin.z },
    radius: config.radius
  };
};

const buildConvoyPlan = (
  convoy: NonNullable<MissionTemplate['convoy']>,
  origin: { x: number; z: number },
  rotation: number,
  config: MissionDirectorConfig
): ConvoyPlan => ({
  route: convoy.routeOffsets.map((offset) => {
    const rotated = rotateOffset(origin, offset, rotation);
    return { x: rotated.x, y: 0, z: rotated.z };
  }),
  unitCount: convoy.unitCount,
  spacing: config.convoySpacing,
  speed: config.convoySpeed
});

const offsetSpawn = (
  origin: { x: number; z: number },
  spawn: EnemySpawn,
  rotation: number
): EnemySpawn => ({
  ...spawn,
  position: toWorldPosition(origin, spawn.position, rotation),
  patrolPath: spawn.patrolPath?.map((point) => toWorldPosition(origin, point, rotation))
});

const toWorldPosition = (
  origin: { x: number; z: number },
  offset: { x: number; y: number; z: number },
  rotation: number
): { x: number; y: number; z: number } => {
  const rotated = rotateOffset(origin, { x: offset.x, z: offset.z }, rotation);
  return {
    x: rotated.x,
    y: offset.y,
    z: rotated.z
  };
};

const rotateOffset = (
  origin: { x: number; z: number },
  offset: { x: number; z: number },
  rotation: number
): { x: number; z: number } => {
  if (!rotation) {
    return {
      x: origin.x + offset.x,
      z: origin.z + offset.z
    };
  }

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotatedX = offset.x * cos - offset.z * sin;
  const rotatedZ = offset.x * sin + offset.z * cos;
  return {
    x: origin.x + rotatedX,
    z: origin.z + rotatedZ
  };
};
