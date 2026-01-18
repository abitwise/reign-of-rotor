import { WORLD_CONFIG } from './world';

export type TreeVariant = {
  id: string;
  trunkHeight: number;
  trunkRadius: number;
  canopyRadius: number;
  canopyHeight: number;
  trunkColor: string;
  canopyColor: string;
};

export type BuildingArchetype = {
  id: string;
  footprint: { width: number; depth: number };
  height: number;
  color: string;
  hasCollider: boolean;
};

export type BiomePreset = {
  id: string;
  treeDensity: number;
  buildingDensity: number;
  treeVariants: string[];
  buildingVariants: string[];
};

export type PropDressingConfig = {
  seed: number;
  tileRadius: number;
  maxTreesPerTile: number;
  maxBuildingsPerTile: number;
  roadSpacingTiles: number;
  roadWidth: number;
  roadOffsetY: number;
  greenPatchDensity: number;
  maxGreenPatchesPerTile: number;
  greenPatchSizeMin: number;
  greenPatchSizeMax: number;
  settlementVillageChance: number;
  settlementTownChance: number;
  settlementRoadChance: number;
  settlementVillageBuildings: { min: number; max: number };
  settlementTownBuildings: { min: number; max: number };
  settlementVillageRadius: number;
  settlementTownRadius: number;
};

export type TreePlacement = {
  variantId: string;
  position: { x: number; y: number; z: number };
  scale: number;
};

export type BuildingPlacement = {
  variantId: string;
  position: { x: number; y: number; z: number };
  rotation: number;
};

export type RoadPlacement = {
  position: { x: number; y: number; z: number };
  length: number;
  width: number;
  rotation: number;
};

export type GreenPatchPlacement = {
  position: { x: number; y: number; z: number };
  size: number;
};

export type TileDressing = {
  biomeId: string;
  trees: TreePlacement[];
  buildings: BuildingPlacement[];
  roads: RoadPlacement[];
  greenPatches: GreenPatchPlacement[];
};

export const TREE_VARIANTS: TreeVariant[] = [
  {
    id: 'pine-a',
    trunkHeight: 2.8,
    trunkRadius: 0.18,
    canopyRadius: 1.2,
    canopyHeight: 2.2,
    trunkColor: '#5b4636',
    canopyColor: '#2e5a3a'
  },
  {
    id: 'pine-b',
    trunkHeight: 3.2,
    trunkRadius: 0.2,
    canopyRadius: 1.4,
    canopyHeight: 2.6,
    trunkColor: '#544232',
    canopyColor: '#315f3d'
  },
  {
    id: 'oak-a',
    trunkHeight: 2.2,
    trunkRadius: 0.22,
    canopyRadius: 1.5,
    canopyHeight: 1.6,
    trunkColor: '#5e4a38',
    canopyColor: '#3f6b42'
  }
];

export const BUILDING_ARCHETYPES: BuildingArchetype[] = [
  {
    id: 'cottage-1',
    footprint: { width: 4, depth: 4.5 },
    height: 3,
    color: '#c9c1b3',
    hasCollider: false
  },
  {
    id: 'house-2',
    footprint: { width: 4.8, depth: 5.2 },
    height: 6,
    color: '#b9b1a5',
    hasCollider: true
  },
  {
    id: 'row-3',
    footprint: { width: 7.5, depth: 4.5 },
    height: 9,
    color: '#9aa0a6',
    hasCollider: true
  },
  {
    id: 'midrise-4',
    footprint: { width: 8, depth: 6.5 },
    height: 12,
    color: '#8f959b',
    hasCollider: true
  },
  {
    id: 'tower-5',
    footprint: { width: 9, depth: 7.5 },
    height: 15,
    color: '#7f8790',
    hasCollider: true
  },
  {
    id: 'warehouse-1',
    footprint: { width: 10, depth: 7 },
    height: 3,
    color: '#9a9ea2',
    hasCollider: true
  },
  {
    id: 'hangar-2',
    footprint: { width: 14, depth: 9 },
    height: 6,
    color: '#7b868f',
    hasCollider: true
  },
  {
    id: 'watchtower-3',
    footprint: { width: 3, depth: 3 },
    height: 9,
    color: '#9f8d72',
    hasCollider: true
  },
  {
    id: 'radar-hut-2',
    footprint: { width: 4, depth: 4 },
    height: 6,
    color: '#a1a9a5',
    hasCollider: true
  }
];

export const BIOME_PRESETS: BiomePreset[] = [
  {
    id: 'temperate',
    treeDensity: 10,
    buildingDensity: 0.2,
    treeVariants: ['pine-a', 'pine-b', 'oak-a'],
    buildingVariants: ['cottage-1', 'house-2']
  },
  {
    id: 'farmland',
    treeDensity: 7,
    buildingDensity: 0.25,
    treeVariants: ['oak-a', 'pine-a'],
    buildingVariants: ['cottage-1', 'house-2', 'warehouse-1']
  },
  {
    id: 'industrial',
    treeDensity: 4,
    buildingDensity: 0.4,
    treeVariants: ['pine-b'],
    buildingVariants: ['warehouse-1', 'hangar-2', 'watchtower-3', 'radar-hut-2']
  },
  {
    id: 'greenbelt',
    treeDensity: 13,
    buildingDensity: 0.1,
    treeVariants: ['pine-a', 'oak-a'],
    buildingVariants: ['cottage-1']
  }
];

export const PROP_DRESSING_CONFIG: PropDressingConfig = {
  seed: 48291,
  tileRadius: 2,
  maxTreesPerTile: 60,
  maxBuildingsPerTile: 6,
  roadSpacingTiles: 6,
  roadWidth: 14,
  roadOffsetY: 0.05,
  greenPatchDensity: 1.2,
  maxGreenPatchesPerTile: 6,
  greenPatchSizeMin: 60,
  greenPatchSizeMax: 180,
  settlementVillageChance: 0.35,
  settlementTownChance: 0.2,
  settlementRoadChance: 0.12,
  settlementVillageBuildings: { min: 6, max: 12 },
  settlementTownBuildings: { min: 12, max: 24 },
  settlementVillageRadius: 120,
  settlementTownRadius: 220
};

// Number of cardinal rotations for buildings (0°, 90°, 180°, 270°) to align with axis-aligned colliders
const CARDINAL_ROTATION_COUNT = 4;

const VARIANT_LOOKUP = new Map(TREE_VARIANTS.map((variant) => [variant.id, variant]));
const BUILDING_LOOKUP = new Map(BUILDING_ARCHETYPES.map((variant) => [variant.id, variant]));
const BIOME_LOOKUP = new Map(BIOME_PRESETS.map((preset) => [preset.id, preset]));

const VILLAGE_BUILDING_VARIANTS = ['cottage-1', 'house-2', 'row-3'];
const TOWN_BUILDING_VARIANTS = ['house-2', 'row-3', 'midrise-4', 'tower-5', 'warehouse-1', 'hangar-2'];

export const getTreeVariant = (id: string): TreeVariant => {
  const variant = VARIANT_LOOKUP.get(id);
  if (!variant) {
    throw new Error(`Unknown tree variant: ${id}`);
  }
  return variant;
};

export const getBuildingArchetype = (id: string): BuildingArchetype => {
  const archetype = BUILDING_LOOKUP.get(id);
  if (!archetype) {
    throw new Error(`Unknown building archetype: ${id}`);
  }
  return archetype;
};

export const getBiomePreset = (id: string): BiomePreset => {
  const preset = BIOME_LOOKUP.get(id);
  if (!preset) {
    throw new Error(`Unknown biome preset: ${id}`);
  }
  return preset;
};

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const hashTileSeed = (tileX: number, tileZ: number, seed: number): number => {
  const hash = (tileX * 73856093) ^ (tileZ * 19349663) ^ seed;
  return (hash >>> 0) + 1;
};

const sampleCount = (density: number, maxCount: number, random: () => number): number => {
  const jitter = 0.7 + random() * 0.6;
  const target = density * jitter;
  const base = Math.floor(target);
  const extra = random() < target - base ? 1 : 0;
  return Math.min(maxCount, base + extra);
};

const pickFromList = <T>(items: T[], random: () => number): T =>
  items[Math.floor(random() * items.length)];

const clampToTile = (
  position: { x: number; z: number },
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): { x: number; z: number } => ({
  x: Math.min(maxX, Math.max(minX, position.x)),
  z: Math.min(maxZ, Math.max(minZ, position.z))
});

const isRoadColumn = (tileX: number): boolean => tileX % PROP_DRESSING_CONFIG.roadSpacingTiles === 0;

const isRoadRow = (tileZ: number): boolean => tileZ % PROP_DRESSING_CONFIG.roadSpacingTiles === 0;

const pickSettlementType = (
  tileX: number,
  tileZ: number,
  random: () => number
): 'village' | 'town' | null => {
  const onRoadColumn = isRoadColumn(tileX);
  const onRoadRow = isRoadRow(tileZ);
  const isIntersection = onRoadColumn && onRoadRow;
  const roll = random();

  if (isIntersection) {
    if (roll < PROP_DRESSING_CONFIG.settlementTownChance) {
      return 'town';
    }
    if (roll < PROP_DRESSING_CONFIG.settlementTownChance + PROP_DRESSING_CONFIG.settlementVillageChance) {
      return 'village';
    }
    return null;
  }

  if (onRoadColumn || onRoadRow) {
    return roll < PROP_DRESSING_CONFIG.settlementRoadChance ? 'village' : null;
  }

  return null;
};

const pickBiome = (tileX: number, tileZ: number): BiomePreset => {
  const random = createSeededRandom(hashTileSeed(tileX, tileZ, PROP_DRESSING_CONFIG.seed));
  const roll = random();
  if (roll < 0.35) {
    return getBiomePreset('temperate');
  }
  if (roll < 0.6) {
    return getBiomePreset('farmland');
  }
  if (roll < 0.85) {
    return getBiomePreset('greenbelt');
  }
  return getBiomePreset('industrial');
};

export const getTileDressing = (tileX: number, tileZ: number): TileDressing => {
  const seed = hashTileSeed(tileX, tileZ, PROP_DRESSING_CONFIG.seed + 101);
  const random = createSeededRandom(seed);
  const biome = pickBiome(tileX, tileZ);

  const tileMinX = WORLD_CONFIG.bounds.minX + tileX * WORLD_CONFIG.tileSize;
  const tileMinZ = WORLD_CONFIG.bounds.minZ + tileZ * WORLD_CONFIG.tileSize;
  const tileMaxX = tileMinX + WORLD_CONFIG.tileSize;
  const tileMaxZ = tileMinZ + WORLD_CONFIG.tileSize;
  const tileCenterX = tileMinX + WORLD_CONFIG.tileSize * 0.5;
  const tileCenterZ = tileMinZ + WORLD_CONFIG.tileSize * 0.5;

  const treeCount = sampleCount(biome.treeDensity, PROP_DRESSING_CONFIG.maxTreesPerTile, random);
  const buildingCount = sampleCount(
    biome.buildingDensity,
    PROP_DRESSING_CONFIG.maxBuildingsPerTile,
    random
  );

  const trees: TreePlacement[] = [];
  for (let i = 0; i < treeCount; i += 1) {
    const variantId = pickFromList(biome.treeVariants, random);
    const position = {
      x: tileMinX + random() * (tileMaxX - tileMinX),
      y: 0,
      z: tileMinZ + random() * (tileMaxZ - tileMinZ)
    };
    const scale = 0.85 + random() * 0.4;
    trees.push({ variantId, position, scale });
  }

  const buildings: BuildingPlacement[] = [];
  for (let i = 0; i < buildingCount; i += 1) {
    const variantId = pickFromList(biome.buildingVariants, random);
    const position = {
      x: tileMinX + random() * (tileMaxX - tileMinX),
      y: 0,
      z: tileMinZ + random() * (tileMaxZ - tileMinZ)
    };
    const rotation = Math.floor(random() * CARDINAL_ROTATION_COUNT) * (Math.PI / 2);
    buildings.push({ variantId, position, rotation });
  }

  const roads: RoadPlacement[] = [];
  if (isRoadColumn(tileX)) {
    roads.push({
      position: { x: tileCenterX, y: PROP_DRESSING_CONFIG.roadOffsetY, z: tileCenterZ },
      length: WORLD_CONFIG.tileSize,
      width: PROP_DRESSING_CONFIG.roadWidth,
      rotation: 0
    });
  }
  if (isRoadRow(tileZ)) {
    roads.push({
      position: { x: tileCenterX, y: PROP_DRESSING_CONFIG.roadOffsetY, z: tileCenterZ },
      length: WORLD_CONFIG.tileSize,
      width: PROP_DRESSING_CONFIG.roadWidth,
      rotation: Math.PI / 2
    });
  }

  const greenPatches: GreenPatchPlacement[] = [];
  const greenPatchCount = sampleCount(
    PROP_DRESSING_CONFIG.greenPatchDensity,
    PROP_DRESSING_CONFIG.maxGreenPatchesPerTile,
    random
  );
  for (let i = 0; i < greenPatchCount; i += 1) {
    const size =
      PROP_DRESSING_CONFIG.greenPatchSizeMin +
      random() * (PROP_DRESSING_CONFIG.greenPatchSizeMax - PROP_DRESSING_CONFIG.greenPatchSizeMin);
    greenPatches.push({
      position: {
        x: tileMinX + random() * (tileMaxX - tileMinX),
        y: PROP_DRESSING_CONFIG.roadOffsetY * 0.5,
        z: tileMinZ + random() * (tileMaxZ - tileMinZ)
      },
      size
    });
  }

  const settlementRandom = createSeededRandom(hashTileSeed(tileX, tileZ, PROP_DRESSING_CONFIG.seed + 909));
  const settlementType = pickSettlementType(tileX, tileZ, settlementRandom);
  if (settlementType) {
    const centerJitter = WORLD_CONFIG.tileSize * 0.15;
    const center = clampToTile(
      {
        x: tileCenterX + (settlementRandom() - 0.5) * centerJitter,
        z: tileCenterZ + (settlementRandom() - 0.5) * centerJitter
      },
      tileMinX + 20,
      tileMaxX - 20,
      tileMinZ + 20,
      tileMaxZ - 20
    );

    const variantPool = settlementType === 'town' ? TOWN_BUILDING_VARIANTS : VILLAGE_BUILDING_VARIANTS;
    const buildingRange =
      settlementType === 'town'
        ? PROP_DRESSING_CONFIG.settlementTownBuildings
        : PROP_DRESSING_CONFIG.settlementVillageBuildings;
    const radius =
      settlementType === 'town'
        ? PROP_DRESSING_CONFIG.settlementTownRadius
        : PROP_DRESSING_CONFIG.settlementVillageRadius;
    const count =
      buildingRange.min +
      Math.floor(settlementRandom() * (buildingRange.max - buildingRange.min + 1));

    for (let i = 0; i < count; i += 1) {
      const angle = settlementRandom() * Math.PI * 2;
      const distance = Math.sqrt(settlementRandom()) * radius;
      const rawPosition = {
        x: center.x + Math.cos(angle) * distance,
        z: center.z + Math.sin(angle) * distance
      };
      const clamped = clampToTile(rawPosition, tileMinX, tileMaxX, tileMinZ, tileMaxZ);
      const rotation = Math.floor(settlementRandom() * CARDINAL_ROTATION_COUNT) * (Math.PI / 2);
      const variantId = pickFromList(variantPool, settlementRandom);
      buildings.push({ variantId, position: { x: clamped.x, y: 0, z: clamped.z }, rotation });
    }
  }

  return {
    biomeId: biome.id,
    trees,
    buildings,
    roads,
    greenPatches
  };
};
