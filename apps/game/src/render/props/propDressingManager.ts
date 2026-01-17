import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type InstancedMesh,
  type Scene
} from '@babylonjs/core';
import type { TransformProvider } from '../meshBindingSystem';
import {
  BIOME_PRESETS,
  BUILDING_ARCHETYPES,
  PROP_DRESSING_CONFIG,
  TREE_VARIANTS,
  getBuildingArchetype,
  getTileDressing,
  getTreeVariant
} from '../../content/propDressing';
import {
  WORLD_CONFIG,
  getTileIndexForPosition,
  getTileKey,
  getWorldTileCount
} from '../../content/world';
import type { Entity } from '../../physics/types';

export type PropDressingManagerOptions = {
  scene: Scene;
  transformProvider: TransformProvider;
};

type PropTile = {
  key: string;
  trees: InstancedMesh[];
  buildings: InstancedMesh[];
};

export class PropDressingManager {
  private readonly scene: Scene;
  private transformProvider: TransformProvider;
  private readonly treeMeshes = new Map<string, Mesh>();
  private readonly buildingMeshes = new Map<string, Mesh>();
  private readonly materials: StandardMaterial[] = [];
  private readonly tiles = new Map<string, PropTile>();
  private focusEntity: Entity | null = null;
  private lastCenterKey: string | null = null;
  private hasLoggedBiomes = false;

  constructor({ scene, transformProvider }: PropDressingManagerOptions) {
    this.scene = scene;
    this.transformProvider = transformProvider;
    this.buildBaseMeshes();
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
    this.refreshVisibleTiles(tileX, tileZ);
  }

  dispose(): void {
    this.tiles.forEach((tile) => this.disposeTile(tile));
    this.tiles.clear();
    this.treeMeshes.forEach((mesh) => mesh.dispose());
    this.treeMeshes.clear();
    this.buildingMeshes.forEach((mesh) => mesh.dispose());
    this.buildingMeshes.clear();
    this.materials.forEach((material) => material.dispose());
    this.materials.length = 0;
  }

  private buildBaseMeshes(): void {
    TREE_VARIANTS.forEach((variant) => {
      const trunk = MeshBuilder.CreateCylinder(
        `tree-${variant.id}-trunk`,
        {
          height: variant.trunkHeight,
          diameter: variant.trunkRadius * 2,
          tessellation: 6
        },
        this.scene
      );

      const canopy = MeshBuilder.CreateCylinder(
        `tree-${variant.id}-canopy`,
        {
          height: variant.canopyHeight,
          diameterTop: 0,
          diameterBottom: variant.canopyRadius * 2,
          tessellation: 6
        },
        this.scene
      );

      trunk.position = new Vector3(0, variant.trunkHeight * 0.5, 0);
      canopy.position = new Vector3(0, variant.trunkHeight + variant.canopyHeight * 0.5, 0);

      const material = new StandardMaterial(`tree-${variant.id}-material`, this.scene);
      material.diffuseColor = Color3.FromHexString(variant.canopyColor);
      material.specularColor = new Color3(0.05, 0.05, 0.05);
      this.materials.push(material);

      const merged = Mesh.MergeMeshes([trunk, canopy], true, true, undefined, false, true);
      if (!merged) {
        throw new Error(`Failed to build tree mesh for ${variant.id}`);
      }

      merged.material = material;
      merged.isVisible = false;
      merged.isPickable = false;
      merged.freezeWorldMatrix();
      this.treeMeshes.set(variant.id, merged);
    });

    BUILDING_ARCHETYPES.forEach((archetype) => {
      const material = new StandardMaterial(`building-${archetype.id}-material`, this.scene);
      material.diffuseColor = Color3.FromHexString(archetype.color);
      material.specularColor = new Color3(0.1, 0.1, 0.1);
      this.materials.push(material);

      const mesh = MeshBuilder.CreateBox(
        `building-${archetype.id}`,
        {
          width: archetype.footprint.width,
          height: archetype.height,
          depth: archetype.footprint.depth
        },
        this.scene
      );
      mesh.material = material;
      mesh.isVisible = false;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();
      this.buildingMeshes.set(archetype.id, mesh);
    });
  }

  private refreshVisibleTiles(centerTileX: number, centerTileZ: number): void {
    if (!this.hasLoggedBiomes && process.env.NODE_ENV !== 'production') {
      const biomeSummary = BIOME_PRESETS.map((preset) => preset.id).join(', ');
      console.debug?.(`Prop dressing biomes ready: ${biomeSummary}`);
      this.hasLoggedBiomes = true;
    }

    const { tilesX, tilesZ } = getWorldTileCount(WORLD_CONFIG.bounds, WORLD_CONFIG.tileSize);
    const desiredKeys = new Set<string>();

    for (let dz = -PROP_DRESSING_CONFIG.tileRadius; dz <= PROP_DRESSING_CONFIG.tileRadius; dz += 1) {
      for (let dx = -PROP_DRESSING_CONFIG.tileRadius; dx <= PROP_DRESSING_CONFIG.tileRadius; dx += 1) {
        const tileX = centerTileX + dx;
        const tileZ = centerTileZ + dz;

        if (tileX < 0 || tileZ < 0 || tileX >= tilesX || tileZ >= tilesZ) {
          continue;
        }

        const key = getTileKey(tileX, tileZ);
        desiredKeys.add(key);
        if (!this.tiles.has(key)) {
          this.tiles.set(key, this.buildTile(key, tileX, tileZ));
        }
      }
    }

    for (const [key, tile] of this.tiles.entries()) {
      if (!desiredKeys.has(key)) {
        this.disposeTile(tile);
        this.tiles.delete(key);
      }
    }
  }

  private buildTile(key: string, tileX: number, tileZ: number): PropTile {
    const dressing = getTileDressing(tileX, tileZ);
    const trees: InstancedMesh[] = [];
    const buildings: InstancedMesh[] = [];

    dressing.trees.forEach((placement) => {
      const variant = getTreeVariant(placement.variantId);
      const base = this.treeMeshes.get(variant.id);
      if (!base) {
        return;
      }

      const instance = base.createInstance(`tree-${key}-${trees.length}`);
      instance.position = new Vector3(placement.position.x, placement.position.y, placement.position.z);
      instance.scaling = new Vector3(placement.scale, placement.scale, placement.scale);
      instance.isPickable = false;
      trees.push(instance);
    });

    dressing.buildings.forEach((placement) => {
      const archetype = getBuildingArchetype(placement.variantId);
      const base = this.buildingMeshes.get(archetype.id);
      if (!base) {
        return;
      }

      const instance = base.createInstance(`building-${key}-${buildings.length}`);
      instance.position = new Vector3(placement.position.x, archetype.height * 0.5, placement.position.z);
      // Note: building physics colliders are axis-aligned AABBs and intentionally ignore this visual rotation (MVP limitation).
      instance.rotation = new Vector3(0, placement.rotation, 0);
      instance.isPickable = false;
      buildings.push(instance);
    });

    return { key, trees, buildings };
  }

  private disposeTile(tile: PropTile): void {
    tile.trees.forEach((instance) => instance.dispose());
    tile.buildings.forEach((instance) => instance.dispose());
  }
}
