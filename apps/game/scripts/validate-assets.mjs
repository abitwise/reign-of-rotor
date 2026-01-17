import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../public/assets/manifest.json');

const allowedTypes = new Set(['gltf', 'glb']);
const allowedCategories = new Set(['building', 'tree', 'vehicle', 'hero', 'prop', 'terrain']);

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const report = async () => {
  let hasErrors = false;
  let hasWarnings = false;

  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  if (!manifest || typeof manifest !== 'object') {
    console.error('Manifest is not a valid object.');
    process.exit(1);
  }

  if (!manifest.budgets || typeof manifest.budgets !== 'object') {
    console.error('Manifest is missing budgets.');
    hasErrors = true;
  }

  if (!manifest.lodRequirements || typeof manifest.lodRequirements !== 'object') {
    console.error('Manifest is missing lodRequirements.');
    hasErrors = true;
  }

  const budgets = manifest.budgets ?? {};
  Object.entries(budgets).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      console.error(`Budget "${key}" is not an object.`);
      hasErrors = true;
      return;
    }

    const { maxTriangles, maxMaterials, maxTextureSize } = value;
    if (!isFiniteNumber(maxTriangles) || !isFiniteNumber(maxMaterials) || !isFiniteNumber(maxTextureSize)) {
      console.error(`Budget "${key}" is missing numeric limits.`);
      hasErrors = true;
      return;
    }

    if (maxTriangles <= 0 || maxMaterials <= 0 || maxTextureSize <= 0) {
      console.error(`Budget "${key}" must have positive limits.`);
      hasErrors = true;
    }
  });

  const lodRequirements = manifest.lodRequirements ?? {};
  Object.entries(lodRequirements).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      console.error(`lodRequirements "${key}" is not an object.`);
      hasErrors = true;
      return;
    }

    const { minLevels, requiresInstancing } = value;
    if (!isFiniteNumber(minLevels) || minLevels <= 0 || !Number.isInteger(minLevels) || typeof requiresInstancing !== 'boolean') {
      console.error(`lodRequirements "${key}" must include minLevels and requiresInstancing.`);
      hasErrors = true;
    }
  });

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  assets.forEach((asset) => {
    if (!asset || typeof asset !== 'object') {
      console.error('Asset entry is not an object.');
      hasErrors = true;
      return;
    }

    const { id, path: assetPath, type, category, lods } = asset;

    if (typeof id !== 'string') {
      console.error('Asset entry is missing required field "id".');
      hasErrors = true;
    }

    if (typeof assetPath !== 'string') {
      console.error('Asset entry is missing required field "path".');
      hasErrors = true;
    }

    if (!allowedTypes.has(type)) {
      console.error(`Asset "${id ?? 'unknown'}" has invalid type: ${type}`);
      hasErrors = true;
    }

    if (!allowedCategories.has(category)) {
      console.warn(`Asset "${id ?? 'unknown'}" has unknown category: ${category}`);
      hasWarnings = true;
    }

    if (!Array.isArray(lods) || lods.length === 0) {
      console.error(`Asset "${id ?? 'unknown'}" is missing lods.`);
      hasErrors = true;
      return;
    }

    const levels = new Set();
    lods.forEach((lod) => {
      if (!lod || typeof lod !== 'object') {
        console.error(`Asset "${id ?? 'unknown'}" has invalid lod entry.`);
        hasErrors = true;
        return;
      }

      const { level, path: lodPath, type: lodType } = lod;
      const isValidLevel = isFiniteNumber(level) && level >= 0 && Number.isInteger(level);
      const isValidPath = typeof lodPath === 'string';

      if (!isValidLevel || !isValidPath) {
        console.error(`Asset "${id ?? 'unknown'}" has invalid lod metadata.`);
        hasErrors = true;
      }

      if (!allowedTypes.has(lodType)) {
        console.error(`Asset "${id ?? 'unknown'}" has invalid lod type: ${lodType}`);
        hasErrors = true;
      }

      if (levels.has(level)) {
        console.error(`Asset "${id ?? 'unknown'}" has duplicate LOD level ${level}.`);
        hasErrors = true;
      }

      levels.add(level);
    });

    if (!levels.has(0)) {
      console.error(`Asset "${id ?? 'unknown'}" is missing LOD0.`);
      hasErrors = true;
    }

    if (category && lodRequirements[category]) {
      const { minLevels } = lodRequirements[category];
      if (lods.length < minLevels) {
        console.warn(
          `Asset "${id ?? 'unknown'}" has ${lods.length} LOD(s); expected at least ${minLevels}.`
        );
        hasWarnings = true;
      }
    }

    if (
      category &&
      allowedCategories.has(category) &&
      !budgets[category] &&
      !budgets.default
    ) {
      console.warn(`Asset "${id ?? 'unknown'}" has no budget profile for category "${category}".`);
      hasWarnings = true;
    }
  });

  if (hasWarnings) {
    console.warn('Asset validation completed with warnings.');
  } else {
    console.log('Asset validation completed with no warnings.');
  }

  if (hasErrors) {
    process.exit(1);
  }
};

report().catch((error) => {
  console.error('Asset validation failed.', error);
  process.exit(1);
});
