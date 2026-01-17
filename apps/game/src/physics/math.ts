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
