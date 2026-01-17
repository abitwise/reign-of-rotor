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

export type TileDressing = {
  biomeId: string;
  trees: TreePlacement[];
  buildings: BuildingPlacement[];
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
    id: 'farmhouse',
    footprint: { width: 3.6, depth: 4.4 },
    height: 2.6,
    color: '#b7b0a3',
    hasCollider: false
  },
  {
    id: 'warehouse',
    footprint: { width: 6.5, depth: 4.5 },
    height: 3.8,
    color: '#8a8f94',
    hasCollider: true
  },
  {
    id: 'hangar',
    footprint: { width: 7.5, depth: 6.2 },
    height: 4.2,
    color: '#7b868f',
    hasCollider: true
  },
  {
    id: 'watchtower',
    footprint: { width: 2.4, depth: 2.4 },
    height: 6,
    color: '#9f8d72',
    hasCollider: true
  },
  {
    id: 'radar-hut',
    footprint: { width: 3.2, depth: 3.2 },
    height: 3.2,
    color: '#a1a9a5',
    hasCollider: true
  }
];

export const BIOME_PRESETS: BiomePreset[] = [
  {
    id: 'temperate',
    treeDensity: 6,
    buildingDensity: 0.6,
    treeVariants: ['pine-a', 'pine-b', 'oak-a'],
    buildingVariants: ['farmhouse', 'warehouse']
  },
  {
    id: 'farmland',
    treeDensity: 3.5,
    buildingDensity: 0.9,
    treeVariants: ['oak-a', 'pine-a'],
    buildingVariants: ['farmhouse', 'warehouse', 'radar-hut']
  },
  {
    id: 'industrial',
    treeDensity: 1.8,
    buildingDensity: 1.4,
    treeVariants: ['pine-b'],
    buildingVariants: ['warehouse', 'hangar', 'watchtower', 'radar-hut']
  }
];

export const PROP_DRESSING_CONFIG: PropDressingConfig = {
  seed: 48291,
  tileRadius: 2,
  maxTreesPerTile: 12,
  maxBuildingsPerTile: 3
};

// Number of cardinal rotations for buildings (0°, 90°, 180°, 270°) to align with axis-aligned colliders
const CARDINAL_ROTATION_COUNT = 4;

const VARIANT_LOOKUP = new Map(TREE_VARIANTS.map((variant) => [variant.id, variant]));
const BUILDING_LOOKUP = new Map(BUILDING_ARCHETYPES.map((variant) => [variant.id, variant]));
const BIOME_LOOKUP = new Map(BIOME_PRESETS.map((preset) => [preset.id, preset]));

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

const pickBiome = (tileX: number, tileZ: number): BiomePreset => {
  const random = createSeededRandom(hashTileSeed(tileX, tileZ, PROP_DRESSING_CONFIG.seed));
  const roll = random();
  if (roll < 0.45) {
    return getBiomePreset('temperate');
  }
  if (roll < 0.75) {
    return getBiomePreset('farmland');
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

  return {
    biomeId: biome.id,
    trees,
    buildings
  };
};
