import { Color3, MeshBuilder, StandardMaterial, Vector3, VertexBuffer } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import type { TransformProvider } from '../meshBindingSystem';
import {
  WORLD_CONFIG,
  getTileCenter,
  getTileIndexForPosition,
  getTileKey,
  getWorldTileCount
} from '../../content/world';
import { terrainHeight } from '../../content/terrainHeight';
import type { Entity } from '../../physics/types';

export type TerrainChunkManagerOptions = {
  scene: Scene;
  transformProvider: TransformProvider;
};

type TerrainChunk = {
  key: string;
  tileX: number;
  tileZ: number;
  lodIndex: number;
  mesh: AbstractMesh;
};

// Re-exported for existing render-side importers; the height field is shared
// with the sim via content/ so entity placement matches vertex displacement.
export { terrainHeight };

/**
 * Hash for vertex color variation (different seed from height noise).
 */
const colorHash = (x: number, z: number): number =>
  (((x * 12345689) ^ (z * 98765431) ^ 77777) >>> 0) % 65536 / 65536;

const createTerrainMaterial = (scene: Scene): StandardMaterial => {
  const material = new StandardMaterial('terrainMaterial', scene);
  // White diffuse so vertex colors show through unmodified
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = new Color3(0.04, 0.04, 0.03);
  material.emissiveColor = new Color3(0, 0, 0);
  return material;
};

export const getLodIndex = (distance: number): number => {
  const lodRings = WORLD_CONFIG.render.lodRings;
  if (!lodRings || lodRings.length === 0) {
    throw new Error('getLodIndex: WORLD_CONFIG.render.lodRings must contain at least one LOD ring');
  }
  for (let i = 0; i < lodRings.length; i += 1) {
    if (distance <= lodRings[i].radius) {
      return i;
    }
  }
  return -1;
};

export class TerrainChunkManager {
  private readonly scene: Scene;
  private transformProvider: TransformProvider;
  private readonly material: StandardMaterial;
  private readonly chunks = new Map<string, TerrainChunk>();
  private focusEntity: Entity | null = null;
  private lastCenterKey: string | null = null;

  constructor({ scene, transformProvider }: TerrainChunkManagerOptions) {
    this.scene = scene;
    this.transformProvider = transformProvider;
    this.material = createTerrainMaterial(scene);
  }

  setTransformProvider(transformProvider: TransformProvider): void {
    this.transformProvider = transformProvider;
  }

  setFocusEntity(entity: Entity | null): void {
    this.focusEntity = entity;
    this.lastCenterKey = null;
  }

  update(): void {
    if (!this.focusEntity) {
      return;
    }

    const transform = this.transformProvider(this.focusEntity);
    if (!transform) {
      return;
    }

    const { tileX, tileZ } = getTileIndexForPosition(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, {
      x: transform.translation.x,
      z: transform.translation.z
    });

    const centerKey = getTileKey(tileX, tileZ);
    if (centerKey === this.lastCenterKey) {
      return;
    }

    this.lastCenterKey = centerKey;
    this.refreshVisibleChunks(tileX, tileZ);
  }

  dispose(): void {
    this.chunks.forEach((chunk) => {
      chunk.mesh.dispose();
    });
    this.chunks.clear();
    this.material.dispose();
  }

  private refreshVisibleChunks(centerTileX: number, centerTileZ: number): void {
    const { tilesX, tilesZ } = getWorldTileCount(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize);
    const desired = new Map<string, { tileX: number; tileZ: number; lodIndex: number }>();

    const maxRing = WORLD_CONFIG.render.lodRings[WORLD_CONFIG.render.lodRings.length - 1].radius;
    for (let dz = -maxRing; dz <= maxRing; dz += 1) {
      for (let dx = -maxRing; dx <= maxRing; dx += 1) {
        const tileX = centerTileX + dx;
        const tileZ = centerTileZ + dz;

        if (tileX < 0 || tileZ < 0 || tileX >= tilesX || tileZ >= tilesZ) {
          continue;
        }

        const ringDistance = Math.max(Math.abs(dx), Math.abs(dz));
        const lodIndex = getLodIndex(ringDistance);
        if (lodIndex === -1) {
          continue;
        }

        const key = getTileKey(tileX, tileZ);
        desired.set(key, { tileX, tileZ, lodIndex });
      }
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!desired.has(key)) {
        chunk.mesh.dispose();
        this.chunks.delete(key);
      }
    }

    for (const [key, spec] of desired.entries()) {
      if (this.chunks.has(key)) {
        continue;
      }

      const lod = WORLD_CONFIG.render.lodRings[spec.lodIndex];
      const center = getTileCenter(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize, spec.tileX, spec.tileZ);
      const mesh = MeshBuilder.CreateGround(
        `terrain-${key}`,
        {
          width: WORLD_CONFIG.tileSize,
          height: WORLD_CONFIG.tileSize,
          subdivisions: lod.subdivisions
        },
        this.scene
      );
      mesh.position = new Vector3(center.x, 0, center.z);

      // Vertex displacement for hills
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
      if (positions) {
        const vertexCount = positions.length / 3;
        const vertexColors = new Float32Array(vertexCount * 4);

        for (let i = 0; i < vertexCount; i += 1) {
          const pi = i * 3;
          const ci = i * 4;

          // Compute world position from local vertex + mesh center
          const worldX = positions[pi] + center.x;
          const worldZ = positions[pi + 2] + center.z;

          // Displace vertex height
          positions[pi + 1] = terrainHeight(worldX, worldZ);

          // Per-vertex color variation for desert appearance
          const hashX = Math.floor(worldX * 0.5);
          const hashZ = Math.floor(worldZ * 0.5);
          const noise1 = colorHash(hashX, hashZ);
          const noise2 = colorHash(hashX + 7, hashZ + 13);
          const noise3 = colorHash(hashX + 31, hashZ + 53);

          // Check for rocky patch
          const rockyCheck = colorHash(hashX + 97, hashZ + 61);
          if (rockyCheck < 0.05) {
            // Rocky/darker patch
            vertexColors[ci] = 0.59 + (noise1 - 0.5) * 0.04;
            vertexColors[ci + 1] = 0.51 + (noise2 - 0.5) * 0.04;
            vertexColors[ci + 2] = 0.39 + (noise3 - 0.5) * 0.04;
          } else {
            // Sandy base with noise variation
            vertexColors[ci] = 0.82 + (noise1 - 0.5) * 0.12;
            vertexColors[ci + 1] = 0.72 + (noise2 - 0.5) * 0.12;
            vertexColors[ci + 2] = 0.55 + (noise3 - 0.5) * 0.12;
          }
          vertexColors[ci + 3] = 1.0;
        }

        mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
        mesh.setVerticesData(VertexBuffer.ColorKind, vertexColors);
        mesh.createNormals(true);
      }

      mesh.receiveShadows = true;
      mesh.material = this.material;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();

      this.chunks.set(key, {
        key,
        tileX: spec.tileX,
        tileZ: spec.tileZ,
        lodIndex: spec.lodIndex,
        mesh
      });
    }
  }
}
