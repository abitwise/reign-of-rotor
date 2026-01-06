export type AssetManifestEntry = {
  id: string;
  path: string;
  type: 'gltf' | 'glb';
};

export type AssetManifest = {
  version: number;
  assets: AssetManifestEntry[];
};

const DEFAULT_MANIFEST: AssetManifest = {
  version: 1,
  assets: []
};

const isValidType = (value: unknown): value is AssetManifestEntry['type'] =>
  value === 'gltf' || value === 'glb';

const normalizeEntry = (entry: unknown): AssetManifestEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const id = candidate.id;
  const path = candidate.path;
  const type = candidate.type;

  if (typeof id !== 'string' || typeof path !== 'string') {
    return null;
  }

  return {
    id,
    path,
    type: isValidType(type) ? type : 'gltf'
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
    assets: normalized
  };
};
