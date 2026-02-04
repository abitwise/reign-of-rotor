export type CannonConfig = {
  name: string;
  ammo: number;
  cooldownSeconds: number;
  range: number;
  damage: number;
  muzzleOffset: { x: number; y: number; z: number };
  impactFx: string;
};

export type MissileConfig = {
  name: string;
  ammo: number;
  cooldownSeconds: number;
  lockTimeSeconds: number;
  lockConeDegrees: number;
  lockRange: number;
  requireLineOfSight: boolean;
  speed: number;
  turnRateDeg: number;
  maxFlightSeconds: number;
  proximityRadius: number;
  damage: number;
  explosionRadius: number;
  launchOffset: { x: number; y: number; z: number };
  colliderRadius: number;
  explosionFx: string;
};

export const DEFAULT_CANNON_CONFIG: CannonConfig = {
  name: 'M230 Cannon',
  ammo: 1200,
  cooldownSeconds: 0.09,
  range: 1500,
  damage: 18,
  muzzleOffset: { x: 0, y: -0.1, z: 2.1 },
  impactFx: 'cannon-impact'
};

export const DEFAULT_MISSILE_CONFIG: MissileConfig = {
  name: 'AGM-114',
  ammo: 8,
  cooldownSeconds: 0.8,
  lockTimeSeconds: 1.2,
  lockConeDegrees: 18,
  lockRange: 2200,
  requireLineOfSight: true,
  speed: 180,
  turnRateDeg: 90,
  maxFlightSeconds: 10,
  proximityRadius: 6,
  damage: 120,
  explosionRadius: 12,
  launchOffset: { x: 0.8, y: -0.2, z: 1.8 },
  colliderRadius: 0.25,
  explosionFx: 'missile-explosion'
};
