export type RadarConfig = {
  name: string;
  maxHealth: number;
  detectionRange: number;
  colliderRadius: number;
  colliderHeight: number;
};

export type SamConfig = {
  name: string;
  maxHealth: number;
  lockTimeSeconds: number;
  lockConeDegrees: number;
  lockRange: number;
  cooldownSeconds: number;
  requireLineOfSight: boolean;
  missileSpeed: number;
  missileTurnRateDeg: number;
  missileMaxFlightSeconds: number;
  missileProximityRadius: number;
  missileDamage: number;
  missileExplosionRadius: number;
  missileLaunchOffset: { x: number; y: number; z: number };
  missileColliderRadius: number;
  explosionFx: string;
  colliderRadius: number;
  colliderHeight: number;
};

export type VehicleConfig = {
  name: string;
  maxHealth: number;
  colliderHalfExtents: { x: number; y: number; z: number };
  patrolSpeed: number;
};

export type EnemySpawn = {
  type: 'radar' | 'sam' | 'vehicle';
  position: { x: number; y: number; z: number };
  patrolPath?: { x: number; y: number; z: number }[];
};

export const DEFAULT_RADAR_CONFIG: RadarConfig = {
  name: 'Radar Site',
  maxHealth: 180,
  detectionRange: 5500,
  colliderRadius: 2.4,
  colliderHeight: 3.2
};

export const DEFAULT_SAM_CONFIG: SamConfig = {
  name: 'SAM Site',
  maxHealth: 220,
  lockTimeSeconds: 1.4,
  lockConeDegrees: 45,
  lockRange: 4200,
  cooldownSeconds: 6.5,
  requireLineOfSight: true,
  missileSpeed: 165,
  missileTurnRateDeg: 65,
  missileMaxFlightSeconds: 12,
  missileProximityRadius: 10,
  missileDamage: 90,
  missileExplosionRadius: 14,
  missileLaunchOffset: { x: 0, y: 1.8, z: 0 },
  missileColliderRadius: 0.35,
  explosionFx: 'sam-explosion',
  colliderRadius: 2.1,
  colliderHeight: 2.2
};

export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  name: 'Vehicle',
  maxHealth: 110,
  colliderHalfExtents: { x: 1.6, y: 1, z: 2.4 },
  patrolSpeed: 14
};

const DEFAULT_ENEMY_SPAWN_OFFSETS: EnemySpawn[] = [
  {
    type: 'radar',
    position: { x: 520, y: 0, z: 420 }
  },
  {
    type: 'sam',
    position: { x: -460, y: 0, z: 380 }
  },
  {
    type: 'vehicle',
    position: { x: 380, y: 0, z: -420 },
    patrolPath: [
      { x: 320, y: 0, z: -520 },
      { x: 520, y: 0, z: -360 }
    ]
  }
];

export const buildEnemySpawns = (origin: { x: number; z: number }): EnemySpawn[] =>
  DEFAULT_ENEMY_SPAWN_OFFSETS.map((spawn) => ({
    ...spawn,
    position: {
      x: origin.x + spawn.position.x,
      y: spawn.position.y,
      z: origin.z + spawn.position.z
    },
    patrolPath: spawn.patrolPath?.map((point) => ({
      x: origin.x + point.x,
      y: point.y,
      z: origin.z + point.z
    }))
  }));
