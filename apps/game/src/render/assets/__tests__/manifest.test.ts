import { describe, expect, it, vi } from 'vitest';
import { loadAssetManifest } from '../manifest';

const createResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe('loadAssetManifest', () => {
  it('parses valid manifest entries', async () => {
    const manifestBody = {
      version: 1,
      budgets: {
        default: { maxTriangles: 1200, maxMaterials: 2, maxTextureSize: 1024 }
      },
      lodRequirements: {
        tree: { minLevels: 2, requiresInstancing: true }
      },
      assets: [{ id: 'test-mesh', path: '/assets/test.gltf', type: 'gltf' }]
    };

    const fetcher = vi.fn(async () => createResponse(manifestBody));
    const manifest = await loadAssetManifest('/assets/manifest.json', fetcher);

    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0]).toEqual({
      id: 'test-mesh',
      path: '/assets/test.gltf',
      type: 'gltf',
      category: 'prop',
      lods: [
        {
          level: 0,
          path: '/assets/test.gltf',
          type: 'gltf'
        }
      ],
      budget: undefined
    });
    expect(manifest.budgets).toEqual({
      default: { maxTriangles: 1200, maxMaterials: 2, maxTextureSize: 1024 }
    });
    expect(manifest.lodRequirements).toEqual({
      tree: { minLevels: 2, requiresInstancing: true }
    });
  });

  it('returns an empty manifest when fetch fails', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network error');
    });

    const manifest = await loadAssetManifest('/assets/missing.json', fetcher);

    expect(manifest.assets).toEqual([]);
    expect(manifest.version).toBe(1);
  });

  it('skips invalid manifest entries', async () => {
    const manifestBody = {
      version: 2,
      assets: [
        { id: 12, path: null },
        {
          id: 'valid',
          path: '/assets/ok.glb',
          type: 'glb',
          category: 'building',
          lods: [{ level: 0, path: '/assets/ok.glb', type: 'glb' }]
        }
      ]
    };

    const fetcher = vi.fn(async () => createResponse(manifestBody));
    const manifest = await loadAssetManifest('/assets/manifest.json', fetcher);

    expect(manifest.assets).toEqual([
      {
        id: 'valid',
        path: '/assets/ok.glb',
        type: 'glb',
        category: 'building',
        lods: [
          {
            level: 0,
            path: '/assets/ok.glb',
            type: 'glb'
          }
        ],
        budget: undefined
      }
    ]);
    expect(manifest.version).toBe(2);
  });
});
