import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
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

const createTerrainMaterial = (scene: Scene): StandardMaterial => {
  const material = new StandardMaterial('terrainMaterial', scene);
  material.diffuseColor = new Color3(0.85, 0.79, 0.62);
  material.specularColor = new Color3(0.06, 0.05, 0.04);
  material.emissiveColor = new Color3(0.05, 0.045, 0.035);

  const gridTexture = new DynamicTexture('terrainGrid', 512, scene, false);
  const ctx = gridTexture.getContext();
  ctx.fillStyle = '#d9c98b';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#b79f63';
  ctx.lineWidth = 2;

  for (let i = 0; i < 28; i += 1) {
    const x = Math.floor(Math.random() * 480);
    const y = Math.floor(Math.random() * 480);
    const w = 24 + Math.floor(Math.random() * 80);
    const h = 24 + Math.floor(Math.random() * 80);
    ctx.fillStyle = '#7fa86a';
    ctx.fillRect(x, y, w, h);
  }

  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  gridTexture.update();
  material.diffuseTexture = gridTexture;
  material.diffuseTexture.uScale = WORLD_CONFIG.render.textureScale;
  material.diffuseTexture.vScale = WORLD_CONFIG.render.textureScale;
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
