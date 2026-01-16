export type WorldBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type TerrainLodRing = {
  radius: number;
  subdivisions: number;
};

export type TerrainRenderConfig = {
  lodRings: TerrainLodRing[];
  textureScale: number;
};

export type TerrainPhysicsConfig = {
  tileRadius: number;
  groundOffsetY: number;
  colliderHalfHeight: number;
  friction: number;
};

export type SpawnZone = {
  id: string;
  center: { x: number; z: number };
  radius: number;
};

export type WorldConfig = {
  bounds: WorldBounds;
  tileSize: number;
  render: TerrainRenderConfig;
  physics: TerrainPhysicsConfig;
  spawnZones: SpawnZone[];
};

export const WORLD_CONFIG: WorldConfig = {
  bounds: {
    minX: -50,
    maxX: 50,
    minZ: -50,
    maxZ: 50
  },
  // Physics stability: keep coordinates bounded within 100x100 so floating-origin rebasing is unnecessary for MVP.
  tileSize: 10,
  render: {
    lodRings: [
      { radius: 1, subdivisions: 20 },
      { radius: 2, subdivisions: 12 },
      { radius: 3, subdivisions: 4 }
    ],
    textureScale: 1.6
  },
  physics: {
    tileRadius: 2,
    groundOffsetY: -2,
    colliderHalfHeight: 2,
    friction: 1.1
  },
  spawnZones: [
    { id: 'north', center: { x: 0, z: -30 }, radius: 8 },
    { id: 'south', center: { x: 0, z: 30 }, radius: 8 },
    { id: 'east', center: { x: 30, z: 0 }, radius: 8 },
    { id: 'west', center: { x: -30, z: 0 }, radius: 8 }
  ]
};

export const getWorldSize = (bounds: WorldBounds): { width: number; depth: number } => ({
  width: bounds.maxX - bounds.minX,
  depth: bounds.maxZ - bounds.minZ
});

export const getWorldTileCount = (bounds: WorldBounds, tileSize: number): { tilesX: number; tilesZ: number } => {
  const { width, depth } = getWorldSize(bounds);
  return {
    tilesX: Math.round(width / tileSize),
    tilesZ: Math.round(depth / tileSize)
  };
};

export const clampToWorldBounds = (bounds: WorldBounds, position: { x: number; z: number }): { x: number; z: number } => ({
  x: Math.min(bounds.maxX, Math.max(bounds.minX, position.x)),
  z: Math.min(bounds.maxZ, Math.max(bounds.minZ, position.z))
});

export const getTileIndexForPosition = (
  bounds: WorldBounds,
  tileSize: number,
  position: { x: number; z: number }
): { tileX: number; tileZ: number } => {
  const clamped = clampToWorldBounds(bounds, position);
  return {
    tileX: Math.floor((clamped.x - bounds.minX) / tileSize),
    tileZ: Math.floor((clamped.z - bounds.minZ) / tileSize)
  };
};

export const getTileCenter = (
  bounds: WorldBounds,
  tileSize: number,
  tileX: number,
  tileZ: number
): { x: number; z: number } => ({
  x: bounds.minX + tileSize * (tileX + 0.5),
  z: bounds.minZ + tileSize * (tileZ + 0.5)
});

export const getTileKey = (tileX: number, tileZ: number): string => `${tileX}:${tileZ}`;

export const pickSpawnPoint = (
  world: WorldConfig,
  randomSource: () => number = Math.random
): { x: number; z: number } => {
  if (!world.spawnZones || world.spawnZones.length === 0) {
    throw new Error('pickSpawnPoint: world.spawnZones must contain at least one spawn zone');
  }
  const zone = world.spawnZones[Math.floor(randomSource() * world.spawnZones.length)];
  const angle = randomSource() * Math.PI * 2;
  const radius = Math.sqrt(randomSource()) * zone.radius;

  const rawPoint = {
    x: zone.center.x + Math.cos(angle) * radius,
    z: zone.center.z + Math.sin(angle) * radius
  };

  return clampToWorldBounds(world.bounds, rawPoint);
};
