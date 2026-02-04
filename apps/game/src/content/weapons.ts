export type CannonConfig = {
  name: string;
  ammo: number;
  cooldownSeconds: number;
  range: number;
  damage: number;
  muzzleOffset: { x: number; y: number; z: number };
  impactFx: string;
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
