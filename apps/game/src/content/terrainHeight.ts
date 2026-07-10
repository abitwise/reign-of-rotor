/**
 * Shared terrain height field.
 *
 * Lives in content/ rather than render/ because both the renderer (vertex
 * displacement) and the sim (entity placement) must agree on ground height.
 * Sim must never import from render.
 */

/**
 * Simple integer hash for noise corners.
 * Returns a value in [0, 1).
 */
const hashNoise = (x: number, z: number): number =>
  (((x * 73856093) ^ (z * 19349663) ^ 48291) >>> 0) % 65536 / 65536;

/**
 * Smoothstep interpolation (Hermite).
 */
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * Single octave of value noise using bilinear interpolation with smoothstep.
 */
const valueNoise = (x: number, z: number): number => {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fz = smoothstep(z - iz);

  const n00 = hashNoise(ix, iz);
  const n10 = hashNoise(ix + 1, iz);
  const n01 = hashNoise(ix, iz + 1);
  const n11 = hashNoise(ix + 1, iz + 1);

  const nx0 = n00 + (n10 - n00) * fx;
  const nx1 = n01 + (n11 - n01) * fx;

  return nx0 + (nx1 - nx0) * fz;
};

/**
 * Multi-octave value noise terrain height at a world position.
 * Returns height in meters (gentle hills, base amplitude ~8m).
 */
export const terrainHeight = (worldX: number, worldZ: number): number => {
  const octaves = 3;
  const baseAmplitude = 8;
  const baseFrequency = 0.002;

  let amplitude = baseAmplitude;
  let frequency = baseFrequency;
  let height = 0;

  for (let i = 0; i < octaves; i += 1) {
    height += (valueNoise(worldX * frequency, worldZ * frequency) - 0.5) * 2 * amplitude;
    amplitude *= 0.45;
    frequency *= 2.1;
  }

  return height;
};
