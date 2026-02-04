/**
 * Shared math utilities for physics calculations
 */

/**
 * Rotates a 3D vector by a quaternion rotation.
 * Uses quaternion multiplication: v' = q * v * q^-1
 *
 * @param vector - The vector to rotate
 * @param rotation - The quaternion rotation (x, y, z, w)
 * @returns The rotated vector
 */
export const rotateVector = (
  vector: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number; w: number }
): { x: number; y: number; z: number } => {
  const { x, y, z } = vector;
  const qx = rotation.x;
  const qy = rotation.y;
  const qz = rotation.z;
  const qw = rotation.w;

  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx
  };
};

/**
 * Calculates the Euclidean length (magnitude) of a 3D vector.
 *
 * @param value - The 3D vector
 * @returns The length of the vector
 */
export const length = (value: { x: number; y: number; z: number }): number =>
  Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);

/**
 * Calculates the dot product of two 3D vectors.
 *
 * @param a - The first vector
 * @param b - The second vector
 * @returns The dot product
 */
export const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Clamps a value between a minimum and maximum.
 *
 * @param value - The value to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped value
 */
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Normalizes a 3D vector to unit length.
 * Returns a default vector (0, 0, 1) if the input magnitude is near zero.
 *
 * @param value - The vector to normalize
 * @returns The normalized vector
 */
export const normalize = (value: { x: number; y: number; z: number }): { x: number; y: number; z: number } => {
  const magnitude = length(value);
  if (magnitude <= 0.00001) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: value.x / magnitude,
    y: value.y / magnitude,
    z: value.z / magnitude
  };
};

/**
 * Rotates a vector towards another vector by a maximum angle.
 * Uses spherical linear interpolation (SLERP) to smoothly rotate from one direction to another.
 *
 * @param from - The starting direction (should be normalized)
 * @param to - The target direction (should be normalized)
 * @param maxRadiansDelta - The maximum rotation angle in radians
 * @returns The rotated vector (normalized)
 */
export const rotateTowards = (
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  maxRadiansDelta: number
): { x: number; y: number; z: number } => {
  const dotValue = clamp(dot(from, to), -1, 1);
  const angle = Math.acos(dotValue);
  if (angle <= 0.00001) {
    return to;
  }
  const clampedAngle = Math.min(angle, maxRadiansDelta);
  const t = clampedAngle / angle;
  const sinAngle = Math.sin(angle);
  if (sinAngle <= 0.00001) {
    return to;
  }
  const coeffFrom = Math.sin((1 - t) * angle) / sinAngle;
  const coeffTo = Math.sin(t * angle) / sinAngle;
  const blended = {
    x: from.x * coeffFrom + to.x * coeffTo,
    y: from.y * coeffFrom + to.y * coeffTo,
    z: from.z * coeffFrom + to.z * coeffTo
  };
  return normalize(blended);
};
