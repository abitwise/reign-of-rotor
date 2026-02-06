export type CountermeasureConfig = {
  name: string;
  ammo: number;
  cooldownSeconds: number;
  decoyActiveSeconds: number;
  decoyRadius: number;
};

export const DEFAULT_COUNTERMEASURE_CONFIG: CountermeasureConfig = {
  name: 'Flares/Chaff',
  ammo: 12,
  cooldownSeconds: 0.9,
  decoyActiveSeconds: 1.6,
  decoyRadius: 120
};
