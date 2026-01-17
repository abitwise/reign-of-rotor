export type AssetCategory = 'building' | 'tree' | 'vehicle' | 'hero' | 'prop' | 'terrain';

export type AssetBudgetProfile = {
  maxTriangles: number;
  maxMaterials: number;
  maxTextureSize: number;
};

export type AssetLodRequirement = {
  minLevels: number;
  requiresInstancing: boolean;
};

export type AssetLodEntry = {
  level: number;
  path: string;
  type: 'gltf' | 'glb';
};

export type AssetManifestEntry = {
  id: string;
  path: string;
  type: 'gltf' | 'glb';
  category: AssetCategory;
  lods: AssetLodEntry[];
  budget?: AssetBudgetProfile;
};

export type AssetManifest = {
  version: number;
  budgets: Record<string, AssetBudgetProfile>;
  lodRequirements: Record<string, AssetLodRequirement>;
  assets: AssetManifestEntry[];
};

const DEFAULT_BUDGET: AssetBudgetProfile = {
  maxTriangles: 1500,
  maxMaterials: 2,
  maxTextureSize: 1024
};

const DEFAULT_MANIFEST: AssetManifest = {
  version: 1,
  budgets: { default: DEFAULT_BUDGET },
  lodRequirements: {},
  assets: []
};

const isValidType = (value: unknown): value is AssetLodEntry['type'] =>
  value === 'gltf' || value === 'glb';

const isValidCategory = (value: unknown): value is AssetCategory =>
  value === 'building' ||
  value === 'tree' ||
  value === 'vehicle' ||
  value === 'hero' ||
  value === 'prop' ||
  value === 'terrain';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeBudgetProfile = (value: unknown): AssetBudgetProfile | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const maxTriangles = candidate.maxTriangles;
  const maxMaterials = candidate.maxMaterials;
  const maxTextureSize = candidate.maxTextureSize;

  const isValidMaxTriangles = isFiniteNumber(maxTriangles) && maxTriangles > 0;
  const isValidMaxMaterials = isFiniteNumber(maxMaterials) && maxMaterials > 0;
  const isValidMaxTextureSize = isFiniteNumber(maxTextureSize) && maxTextureSize > 0;

  if (!isValidMaxTriangles || !isValidMaxMaterials || !isValidMaxTextureSize) {
    return null;
  }

  return {
    maxTriangles,
    maxMaterials,
    maxTextureSize
  };
};

const normalizeLodEntry = (entry: unknown): AssetLodEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const level = candidate.level;
  const path = candidate.path;
  const type = candidate.type;

  if (
    !isFiniteNumber(level) ||
    level < 0 ||
    !Number.isInteger(level) ||
    typeof path !== 'string'
  ) {
    return null;
  }

  return {
    level,
    path,
    type: isValidType(type) ? type : 'gltf'
  };
};

const normalizeEntry = (entry: unknown): AssetManifestEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const id = candidate.id;
  const path = candidate.path;
  const type = candidate.type;
  const category = candidate.category;
  const lods = Array.isArray(candidate.lods) ? candidate.lods : [];
  const budget = candidate.budget;

  if (typeof id !== 'string' || typeof path !== 'string') {
    return null;
  }

  const normalizedType = isValidType(type) ? type : 'gltf';
  const normalizedLods = lods
    .map((lod) => normalizeLodEntry(lod))
    .filter((lod): lod is AssetLodEntry => Boolean(lod));

  const lodMap = new Map<number, AssetLodEntry>();
  normalizedLods.forEach((lod) => {
    if (!lodMap.has(lod.level)) {
      lodMap.set(lod.level, lod);
    }
  });

  if (!lodMap.has(0)) {
    lodMap.set(0, { level: 0, path, type: normalizedType });
  }

  const sortedLods = Array.from(lodMap.values()).sort((a, b) => a.level - b.level);
  const normalizedBudget = normalizeBudgetProfile(budget) ?? undefined;

  return {
    id,
    path,
    type: normalizedType,
    category: isValidCategory(category) ? category : 'prop',
    lods: sortedLods,
    budget: normalizedBudget
  };
};

export const loadAssetManifest = async (
  url = '/assets/manifest.json',
  fetcher: typeof fetch = fetch
): Promise<AssetManifest> => {
  try {
    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest (${response.status}) from ${url}`);
    }

    const raw = (await response.json()) as unknown;
    const manifest = parseManifest(raw);

    return manifest;
  } catch (error) {
    console.warn('Asset manifest unavailable, using empty manifest.', error);
    return DEFAULT_MANIFEST;
  }
};

const parseManifest = (raw: unknown): AssetManifest => {
  const source = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) ?? {};
  const assets = Array.isArray(source.assets) ? source.assets : [];
  const budgets = source.budgets;
  const lodRequirements = source.lodRequirements;
  const normalizedBudgets: Record<string, AssetBudgetProfile> = {};
  const normalizedLodRequirements: Record<string, AssetLodRequirement> = {};

  if (budgets && typeof budgets === 'object') {
    Object.entries(budgets).forEach(([key, value]) => {
      const normalized = normalizeBudgetProfile(value);
      if (normalized) {
        normalizedBudgets[key] = normalized;
      }
    });
  }

  if (lodRequirements && typeof lodRequirements === 'object') {
    Object.entries(lodRequirements).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      const candidate = value as Record<string, unknown>;
      const minLevels = candidate.minLevels;
      const requiresInstancing = candidate.requiresInstancing;

      const isValidMinLevels = isFiniteNumber(minLevels) && minLevels > 0 && Number.isInteger(minLevels);
      const isValidRequiresInstancing = typeof requiresInstancing === 'boolean';

      if (!isValidMinLevels || !isValidRequiresInstancing) {
        return;
      }

      normalizedLodRequirements[key] = {
        minLevels,
        requiresInstancing
      };
    });
  }
  const normalized: AssetManifestEntry[] = [];
  const seen = new Set<string>();

  assets.forEach((entry) => {
    const normalizedEntry = normalizeEntry(entry);
    if (!normalizedEntry) {
      console.warn('Skipping invalid manifest entry', entry);
      return;
    }

    if (seen.has(normalizedEntry.id)) {
      console.warn(`Duplicate asset id "${normalizedEntry.id}" in manifest; ignoring later entry.`);
      return;
    }

    seen.add(normalizedEntry.id);
    normalized.push(normalizedEntry);
  });

  return {
    version: typeof source.version === 'number' ? source.version : 1,
    budgets: Object.keys(normalizedBudgets).length > 0 ? normalizedBudgets : DEFAULT_MANIFEST.budgets,
    lodRequirements:
      Object.keys(normalizedLodRequirements).length > 0
        ? normalizedLodRequirements
        : DEFAULT_MANIFEST.lodRequirements,
    assets: normalized
  };
};
