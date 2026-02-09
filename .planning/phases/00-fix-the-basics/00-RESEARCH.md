# Phase 0: Fix the Basics - Research

**Researched:** 2026-02-09
**Domain:** Babylon.js rendering (procedural meshes, particles, terrain), Rapier physics tuning, HTML HUD
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Enemy Visibility
- Enemies need procedural meshes built from Babylon.js primitives (composed shapes, not external assets)
- All enemy types uniform military color (dark green/gray) -- not color-coded by type
- SAM sites, radar sites, and patrol vehicles each get distinct silhouettes but same color palette
- Add HUD markers (diamond/triangle icons) showing enemy positions so they can be spotted at distance

#### Flight Feel
- Target feel: arcade-smooth -- like Battlefield helicopters, forgiving and easy to pick up
- Stability assist always on and strong by default -- aggressive auto-leveling, hard to crash
- Auto-hover on collective release -- release R/F and helicopter holds altitude automatically
- General flight needs to be less twitchy, less sluggish, and more stable -- reduce torques, increase damping, tune assists to make first-time flying fun
- Overall: fun first, sim second

#### Missile & Weapon Visuals
- Player missiles: glowing emissive cylinder mesh + particle smoke/fire trail
- SAM missiles (fired at player): same visual treatment as player missiles -- visible and fair
- Cannon fire: bright tracer lines from gun to impact point -- classic helicopter game feedback
- Hit effects: simple explosion flash (quick bright flash + expanding sphere) -- minimal but clear
- All existing explosion/impact events need to be consumed and rendered

#### Terrain Appearance
- Current problems: obvious tiling repetition AND too flat/boring
- Target vibe: desert/arid -- sandy browns, rocky terrain, sparse vegetation, Middle East ops feel
- Scope: full terrain rework -- better heightmaps with hills/valleys, proper texture that doesn't tile obviously
- Include simple procedural props (box-shaped buildings, structures) scattered around to give sense of place
- Low-poly modern indie style maintained

### Claude's Discretion
- Exact procedural mesh geometry for each enemy type (SAM turret shape, radar dish shape, vehicle shape)
- Specific flight tuning values (torques, damping, assist strengths)
- Tracer line rendering technique (thin meshes, line system, or particle trail)
- Terrain heightmap generation algorithm and texture approach
- Procedural prop placement logic
- Exact explosion flash implementation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Summary

This phase fixes four broken fundamentals: invisible enemies, invisible weapons, unpleasant flight feel, and tiled-wallpaper terrain. The entire codebase uses Babylon.js 7.54.3 for rendering and Rapier 0.19.3 for physics. No new dependencies are needed.

The sim layer already produces all the events needed (explosion events, impact events, damage events, SAM missile positions, enemy unit positions). The problem is that the render layer never consumes these events to create visual feedback. Enemies have physics colliders but no meshes. Missiles have physics bodies but no meshes. Cannon fire does raycasts but draws no tracers. Explosions emit events that nothing reads. The render bootstrap (`render/bootstrap.ts`) only binds the player helicopter mesh; everything else is invisible.

The terrain uses flat `MeshBuilder.CreateGround` tiles with a DynamicTexture that has obvious grid lines and random green rectangles. There is no heightmap, no elevation variation, and the texture tiles obviously. The prop dressing system exists but uses temperate biomes (pine trees, green patches) instead of desert/arid.

**Primary recommendation:** Create a render-side visual binding layer that reads existing sim state each frame to create/update/dispose procedural meshes, particle systems, and line meshes for enemies, missiles, tracers, and explosions. Rework terrain material and heightmap generation. Retune flight physics values. All work is in the existing architecture -- no structural changes needed.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @babylonjs/core | 7.54.3 | 3D rendering, materials, particles, mesh building | Already the project renderer |
| @babylonjs/loaders | 7.54.3 | GLTF asset loading | Already installed, used for player mesh |
| @dimforge/rapier3d-compat | 0.19.3 | Physics simulation | Already the project physics engine |

### Supporting (already in codebase, no new packages)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| HTML/CSS DOM | n/a | HUD markers overlay | Enemy position markers rendered as CSS-positioned elements |
| Canvas 2D (DynamicTexture) | n/a | Procedural terrain textures | Generate per-tile terrain textures without tiling artifacts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOM HUD markers | Babylon.js GUI (AdvancedDynamicTexture) | DOM is simpler, already the pattern in this codebase. Babylon GUI adds overhead and another import. Use DOM. |
| DynamicTexture terrain | External texture files | External textures need assets pipeline and storage. Procedural DynamicTexture keeps the zero-external-assets pattern. Use DynamicTexture. |
| ParticleSystem for tracers | MeshBuilder.CreateLines | Lines are simpler and more performant for straight tracer lines. ParticleSystem better for smoke trails. Use Lines for tracers, ParticleSystem for missile trails. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Project Structure (relevant paths)
```
apps/game/src/
  render/
    bootstrap.ts          # Scene setup, render loop (onBeforeRender)
    meshBindingSystem.ts  # Entity -> Mesh binding with transform sync
    terrain/
      terrainChunkManager.ts  # Terrain tile streaming
    props/
      propDressingManager.ts  # Procedural prop instancing
  sim/
    enemies.ts            # Enemy state, SAM missiles, explosion events
    missile.ts            # Player missile state, explosion events
    cannon.ts             # Cannon state, impact events
    helicopterFlight.ts   # Flight physics, power model, stability assist
  content/
    enemies.ts            # Enemy configs (collider sizes, health, etc.)
    helicopters.ts        # Flight tuning values
    controls.ts           # Control input tuning
    propDressing.ts       # Biome presets, building/tree variants
    world.ts              # World bounds, tile config
  ui/
    root.ts               # HTML HUD overlay
```

### Pattern 1: Visual Binding Manager (new pattern for this phase)
**What:** A manager class that reads sim state each frame and creates/updates/disposes Babylon.js visual objects (meshes, particles, lines). Similar to existing `MeshBindingSystem` but for sim-owned entities that need procedural visuals.
**When to use:** For enemies, missiles, tracers, and explosions -- any entity that needs a visual representation but whose lifecycle is managed by the sim layer.
**Example:**
```typescript
// Source: Extrapolated from existing MeshBindingSystem pattern
export class EnemyVisualManager {
  private readonly meshes = new Map<Entity, AbstractMesh>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(enemies: EnemyState, transformProvider: TransformProvider): void {
    // Remove meshes for killed units
    for (const entity of enemies.killedUnits) {
      const mesh = this.meshes.get(entity);
      if (mesh) {
        mesh.dispose();
        this.meshes.delete(entity);
      }
    }

    // Create meshes for new units, update transforms for existing
    for (const unit of enemies.units) {
      let mesh = this.meshes.get(unit.entity);
      if (!mesh) {
        mesh = this.createEnemyMesh(unit.type);
        this.meshes.set(unit.entity, mesh);
      }
      const transform = transformProvider(unit.entity);
      if (transform) {
        mesh.position.set(transform.translation.x, transform.translation.y, transform.translation.z);
      }
    }
  }

  private createEnemyMesh(type: EnemyUnitType): AbstractMesh {
    // Build composed procedural mesh from primitives
    // ...
  }
}
```

### Pattern 2: Event-Driven VFX (consume sim events in render loop)
**What:** Read `explosionEvents`, `impactEvents`, `samMissiles` arrays from sim state during the Babylon.js `onBeforeRenderObservable` callback. Spawn transient visual effects (particle bursts, flash meshes) that self-dispose after a short duration.
**When to use:** For explosions, cannon impacts, any one-shot visual effect.
**Example:**
```typescript
// Source: Derived from Babylon.js ParticleSystem docs + existing event pattern
const processExplosionEvents = (
  events: SamExplosionEvent[],
  scene: Scene
): void => {
  for (const event of events) {
    // Quick flash sphere
    const flash = MeshBuilder.CreateSphere('flash', { diameter: event.radius * 0.5 }, scene);
    flash.position.set(event.position.x, event.position.y, event.position.z);
    const mat = new StandardMaterial('flashMat', scene);
    mat.emissiveColor = new Color3(1, 0.85, 0.4);
    mat.disableLighting = true;
    flash.material = mat;

    // Auto-dispose after ~200ms
    setTimeout(() => flash.dispose(), 200);
  }
};
```

### Pattern 3: Procedural Heightmap via DynamicTexture + Vertex Displacement
**What:** Instead of using `CreateGroundFromHeightMap` (which requires an image URL), generate elevation data procedurally using a noise function, then apply it to ground mesh vertices via `mesh.getVerticesData(VertexBuffer.PositionKind)` and `mesh.updateVerticesData()`.
**When to use:** For the terrain rework. This avoids external texture dependencies while providing hills/valleys.
**Example:**
```typescript
// Source: Standard Babylon.js vertex manipulation approach
const ground = MeshBuilder.CreateGround('terrain', {
  width: tileSize,
  height: tileSize,
  subdivisions: 20
}, scene);

const positions = ground.getVerticesData(VertexBuffer.PositionKind);
if (positions) {
  for (let i = 1; i < positions.length; i += 3) {
    const x = positions[i - 1] + worldOffsetX;
    const z = positions[i + 1] + worldOffsetZ;
    positions[i] = noiseFunction(x, z); // y = height from noise
  }
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.createNormals(true); // Recalculate normals for lighting
}
```

### Anti-Patterns to Avoid
- **Spawning new meshes/materials every frame:** Pool or reuse meshes. Enemies persist for many frames -- create once, update transforms. Only explosions are transient.
- **Using setTimeout for VFX lifecycle in sim code:** VFX disposal must happen in the render layer. The `setTimeout` approach is fine for render-only transients but sim code must never depend on timers.
- **Mutating sim state from render code:** The existing architecture enforces this -- render is read-only. Visual managers must only READ enemy/missile/cannon state, never WRITE.
- **Using PBR materials for procedural meshes:** StandardMaterial is cheaper and sufficient for low-poly military style. PBR is overkill here.
- **Over-complex particle systems:** Keep particle counts low. A missile trail needs ~50-100 particles, not 1000. Explosions are quick flashes, not cinematic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Noise function for terrain | Custom Perlin/Simplex implementation | Simple layered sine waves or value noise with hash function | The codebase already has `hashTileSeed` and `createSeededRandom` in `propDressing.ts`. A few octaves of seeded value noise is sufficient for gentle desert hills. Full Perlin adds complexity for marginal benefit at this scale. |
| Particle system | Custom point sprite renderer | Babylon.js `ParticleSystem` | Already included in @babylonjs/core. Handles billboarding, color gradients, size over lifetime, emission rates, disposal. |
| Screen-space position projection | Manual matrix math | `Vector3.Project()` from Babylon.js | For projecting enemy world positions to screen coordinates for HUD markers. Babylon.js already provides this. |
| Entity lifecycle tracking | Custom diffing system | Map-based create/delete tracking with `killedUnits` array | The sim layer already provides `killedUnits` for cleanup and `units` array for current state. Simple Map keyed by Entity suffices. |

**Key insight:** The sim layer already does all the hard work (physics, AI, damage, events). The gap is purely visual -- creating meshes, particles, and HUD elements that read this existing state. This is a rendering problem, not a simulation problem.

## Common Pitfalls

### Pitfall 1: Terrain Heightmap Misaligned with Physics Colliders
**What goes wrong:** Visual terrain has hills but physics ground plane stays flat. Helicopter clips through visual hills or floats above valleys.
**Why it happens:** The terrain physics colliders in `sim/terrain/terrainColliders.ts` are flat box colliders at y=-2. If visual terrain gets height variation, physics needs to match.
**How to avoid:** Either (a) keep height variation very gentle (max 5-10m) so the flat physics approximation is acceptable with the existing collider system, or (b) update terrain colliders to use heightfield colliders. Option (a) is strongly recommended for this phase -- Rapier supports heightfield colliders but the streaming system would need significant rework.
**Warning signs:** Helicopter sinks into hills or hovers above valleys.

### Pitfall 2: ParticleSystem Leaks
**What goes wrong:** Particle systems for missile trails accumulate without disposal, causing memory growth and FPS drops.
**Why it happens:** Missile entities are pooled/reused. If the particle system is not stopped and disposed when the missile is removed, it persists invisibly.
**How to avoid:** Track particle systems in a Map<Entity, ParticleSystem>. When a missile is removed (via `missileMap` deletion or `samMissileMap` deletion), stop and dispose the associated particle system. Use `disposeOnStop = true` for one-shot explosion particles.
**Warning signs:** Growing particle system count in Babylon.js inspector, FPS degradation over time.

### Pitfall 3: DOM HUD Marker Performance
**What goes wrong:** Creating/destroying DOM elements every frame for enemy markers causes layout thrashing and GC pressure.
**Why it happens:** Naive approach creates new divs each frame instead of pooling/reusing.
**How to avoid:** Create a fixed pool of marker DOM elements. Each frame, assign markers to visible enemies by updating `transform: translate()` and `display`. Hide unused markers. Use `will-change: transform` CSS hint.
**Warning signs:** Stuttering when many enemies visible, high DOM node count in DevTools.

### Pitfall 4: Flight Tuning Oscillation
**What goes wrong:** Increasing stability assist damping too much causes the helicopter to oscillate (wobble) instead of settling smoothly.
**Why it happens:** The stability assist applies angular velocity damping AND counter-torque for leveling. If both are too aggressive, they can fight each other, especially with the fixed timestep creating discrete jumps.
**How to avoid:** Tune in small increments. The damping factor (`stabilityAngularDamping`) is multiplicative per frame (0.85 = 15% reduction per tick). Making it much lower (e.g., 0.7) doubles the damping strength. Test with simple hover scenarios first. The leveling torque scale (`stabilityLevelingTorqueScale`) should be increased gradually from 0.7.
**Warning signs:** Helicopter vibrates when hovering, oscillates around level attitude.

### Pitfall 5: Procedural Mesh Not Receiving Correct Transforms
**What goes wrong:** Enemy meshes are created but don't track their physics body position, appearing stuck at origin.
**Why it happens:** The existing `MeshBindingSystem` only updates meshes bound via `bindings.bind()`. New visual managers must either use this system or implement their own transform sync.
**How to avoid:** Two options: (a) Use the existing `MeshBindingSystem.bind()` for enemy meshes (recommended -- consistent pattern), or (b) Manually read transforms from the `TransformProvider` in a custom update loop. Option (a) is cleaner but requires unbinding on kill. Option (b) gives more control.
**Warning signs:** Meshes visible at (0,0,0) but enemies are at their spawn positions.

### Pitfall 6: Terrain Texture Tiling Still Visible After Rework
**What goes wrong:** Even with a new desert texture, the tiling pattern is visible because the same DynamicTexture is applied to every tile with the same UV mapping.
**Why it happens:** All terrain chunks share a single material with `uScale`/`vScale` repeating. The texture itself tiles visibly.
**How to avoid:** Generate a unique DynamicTexture per tile (or per LOD group) using the seeded random system. Use procedural noise-based painting on the DynamicTexture to create natural variation -- vary sand color, add rocky patches, use tile-specific seed. Alternatively, use a single large-scale noise-based color variation applied via vertex colors on the terrain mesh (cheaper, no extra textures).
**Warning signs:** Obvious repeating pattern when flying at altitude.

## Code Examples

### Procedural Enemy Mesh: SAM Turret
```typescript
// Source: Babylon.js MeshBuilder API (Context7 verified, /babylonjs/documentation)
const createSamTurretMesh = (scene: Scene, material: StandardMaterial): Mesh => {
  // Base platform: low cylinder
  const base = MeshBuilder.CreateCylinder('sam-base', {
    height: 0.8,
    diameter: 3.2,
    tessellation: 8
  }, scene);
  base.position.y = 0.4;

  // Turret body: box on top
  const turret = MeshBuilder.CreateBox('sam-turret', {
    width: 1.4,
    height: 1.2,
    depth: 1.8
  }, scene);
  turret.position.y = 1.4;

  // Launcher tubes: two small cylinders angled upward
  const tube1 = MeshBuilder.CreateCylinder('sam-tube1', {
    height: 2.0,
    diameter: 0.35,
    tessellation: 6
  }, scene);
  tube1.position.set(0.4, 2.0, 0.3);
  tube1.rotation.x = -0.5; // Angled up

  const tube2 = tube1.clone('sam-tube2');
  tube2.position.x = -0.4;

  const merged = Mesh.MergeMeshes([base, turret, tube1, tube2], true, true);
  if (merged) {
    merged.material = material;
    merged.isPickable = false;
    merged.freezeWorldMatrix();
  }
  return merged!;
};
```

### Procedural Enemy Mesh: Radar Dish
```typescript
const createRadarDishMesh = (scene: Scene, material: StandardMaterial): Mesh => {
  // Support tower: tall thin cylinder
  const tower = MeshBuilder.CreateCylinder('radar-tower', {
    height: 3.5,
    diameter: 0.6,
    tessellation: 6
  }, scene);
  tower.position.y = 1.75;

  // Dish: disc/sphere segment at top
  const dish = MeshBuilder.CreateDisc('radar-dish', {
    radius: 1.8,
    tessellation: 8
  }, scene);
  dish.position.set(0, 3.5, 0.2);
  dish.rotation.x = Math.PI * 0.5 - 0.3; // Tilted up slightly

  // Base: flat cylinder
  const base = MeshBuilder.CreateCylinder('radar-base', {
    height: 0.4,
    diameter: 2.0,
    tessellation: 8
  }, scene);
  base.position.y = 0.2;

  const merged = Mesh.MergeMeshes([tower, dish, base], true, true);
  if (merged) {
    merged.material = material;
    merged.isPickable = false;
  }
  return merged!;
};
```

### Procedural Enemy Mesh: Patrol Vehicle
```typescript
const createVehicleMesh = (scene: Scene, material: StandardMaterial): Mesh => {
  // Body: elongated box
  const body = MeshBuilder.CreateBox('vehicle-body', {
    width: 2.4,
    height: 1.4,
    depth: 4.2
  }, scene);
  body.position.y = 0.9;

  // Cabin: smaller box on top front
  const cabin = MeshBuilder.CreateBox('vehicle-cabin', {
    width: 2.0,
    height: 0.8,
    depth: 1.6
  }, scene);
  cabin.position.set(0, 1.8, -0.8);

  const merged = Mesh.MergeMeshes([body, cabin], true, true);
  if (merged) {
    merged.material = material;
    merged.isPickable = false;
  }
  return merged!;
};
```

### Military Material (shared across all enemy types)
```typescript
// Source: Babylon.js StandardMaterial API (Context7 verified)
const createMilitaryMaterial = (scene: Scene): StandardMaterial => {
  const material = new StandardMaterial('military', scene);
  material.diffuseColor = new Color3(0.28, 0.32, 0.26); // olive drab
  material.specularColor = new Color3(0.08, 0.08, 0.06);
  material.emissiveColor = new Color3(0.02, 0.02, 0.02);
  return material;
};
```

### Missile Trail Particle System
```typescript
// Source: Babylon.js ParticleSystem API (Context7 verified, /babylonjs/documentation)
const createMissileTrail = (scene: Scene, emitter: AbstractMesh): ParticleSystem => {
  const ps = new ParticleSystem('missileTrail', 80, scene);
  // Use a default flare texture or create a simple white DynamicTexture
  ps.createPointEmitter(new Vector3(0, 0, -0.5), new Vector3(0, 0, -1));
  ps.emitter = emitter;
  ps.minSize = 0.3;
  ps.maxSize = 0.8;
  ps.minLifeTime = 0.3;
  ps.maxLifeTime = 0.8;
  ps.emitRate = 60;
  ps.color1 = new Color4(1, 0.8, 0.3, 1);
  ps.color2 = new Color4(0.6, 0.6, 0.6, 0.8);
  ps.colorDead = new Color4(0.3, 0.3, 0.3, 0);
  ps.addSizeGradient(0, 0.3);
  ps.addSizeGradient(1, 0.05);
  ps.gravity = new Vector3(0, -1, 0);
  ps.minEmitPower = 1;
  ps.maxEmitPower = 2;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  return ps;
};
```

### Cannon Tracer Line
```typescript
// Source: Babylon.js CreateLines API (Context7 verified, /babylonjs/documentation)
const createTracerLine = (
  scene: Scene,
  origin: Vector3,
  hit: Vector3
): LinesMesh => {
  const tracer = MeshBuilder.CreateLines('tracer', {
    points: [origin, hit],
    updatable: false
  }, scene);
  tracer.color = new Color3(1, 0.9, 0.3); // bright yellow-orange
  tracer.alpha = 0.9;

  // Auto-dispose after ~100ms (2-3 render frames)
  const observer = scene.onBeforeRenderObservable.add(() => {
    tracer.dispose();
    scene.onBeforeRenderObservable.remove(observer);
  });
  // Or use a frame counter for deterministic cleanup

  return tracer;
};
```

### Explosion Flash Effect
```typescript
const createExplosionFlash = (
  scene: Scene,
  position: { x: number; y: number; z: number },
  radius: number
): void => {
  const flash = MeshBuilder.CreateSphere('explosion', {
    diameter: radius * 0.6,
    segments: 8
  }, scene);
  flash.position.set(position.x, position.y, position.z);

  const mat = new StandardMaterial('explosionMat', scene);
  mat.emissiveColor = new Color3(1, 0.85, 0.4);
  mat.disableLighting = true;
  mat.alpha = 0.9;
  flash.material = mat;

  let frameCount = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    frameCount++;
    // Expand and fade over ~10 frames (~167ms at 60fps)
    const t = frameCount / 10;
    flash.scaling.setAll(1 + t * 2);
    mat.alpha = Math.max(0, 0.9 - t);
    if (frameCount >= 10) {
      flash.dispose();
      mat.dispose();
      scene.onBeforeRenderObservable.remove(observer);
    }
  });
};
```

### HUD Enemy Marker (DOM-based)
```typescript
const createEnemyMarkerPool = (container: HTMLElement, maxMarkers: number): {
  update: (
    enemies: EnemyUnit[],
    camera: Camera,
    engine: Engine
  ) => void;
} => {
  const markers: HTMLElement[] = [];
  for (let i = 0; i < maxMarkers; i++) {
    const el = document.createElement('div');
    el.className = 'enemy-marker';
    el.style.display = 'none';
    el.style.position = 'absolute';
    el.style.willChange = 'transform';
    container.appendChild(el);
    markers.push(el);
  }

  return {
    update: (enemies, camera, engine) => {
      const viewWidth = engine.getRenderWidth();
      const viewHeight = engine.getRenderHeight();
      const viewMatrix = camera.getViewMatrix();
      const projMatrix = camera.getProjectionMatrix();
      const viewport = camera.viewport;

      let markerIndex = 0;
      for (const unit of enemies) {
        if (markerIndex >= maxMarkers) break;
        const worldPos = unit.body.translation();
        const screenPos = Vector3.Project(
          new Vector3(worldPos.x, worldPos.y + 2, worldPos.z),
          Matrix.Identity(),
          viewMatrix.multiply(projMatrix),
          { x: 0, y: 0, width: viewWidth, height: viewHeight }
        );
        // Only show if in front of camera
        if (screenPos.z > 0 && screenPos.z < 1) {
          const el = markers[markerIndex];
          el.style.display = '';
          el.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px)`;
          markerIndex++;
        }
      }
      // Hide unused markers
      for (let i = markerIndex; i < maxMarkers; i++) {
        markers[i].style.display = 'none';
      }
    }
  };
};
```

### Desert Terrain Texture (DynamicTexture)
```typescript
const createDesertTerrainMaterial = (scene: Scene): StandardMaterial => {
  const material = new StandardMaterial('desertTerrain', scene);
  material.diffuseColor = new Color3(0.82, 0.72, 0.55); // sandy base
  material.specularColor = new Color3(0.04, 0.04, 0.03);

  const textureSize = 512;
  const texture = new DynamicTexture('desertTex', textureSize, scene, false);
  const ctx = texture.getContext();

  // Base sand color with noise variation
  const imageData = ctx.createImageData(textureSize, textureSize);
  const rng = createSeededRandom(42);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const px = (i / 4) % textureSize;
    const py = Math.floor(i / 4 / textureSize);
    const noise = (rng() - 0.5) * 30;
    // Base sandy color with subtle variation
    imageData.data[i] = Math.min(255, Math.max(0, 209 + noise));     // R
    imageData.data[i + 1] = Math.min(255, Math.max(0, 184 + noise)); // G
    imageData.data[i + 2] = Math.min(255, Math.max(0, 140 + noise)); // B
    imageData.data[i + 3] = 255;
    // Add rocky patches
    if (rng() < 0.03) {
      imageData.data[i] = 150 + rng() * 40;
      imageData.data[i + 1] = 130 + rng() * 30;
      imageData.data[i + 2] = 100 + rng() * 30;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  texture.update();
  material.diffuseTexture = texture;

  return material;
};
```

### Simple Value Noise for Terrain Height
```typescript
// Source: Adapted from existing hashTileSeed pattern in content/propDressing.ts
const terrainHeight = (worldX: number, worldZ: number, seed: number): number => {
  // Multi-octave value noise using existing hash pattern
  let height = 0;
  let amplitude = 8; // max height in meters
  let frequency = 0.002; // wavelength ~500m

  for (let octave = 0; octave < 3; octave++) {
    const ix = Math.floor(worldX * frequency);
    const iz = Math.floor(worldZ * frequency);
    const fx = worldX * frequency - ix;
    const fz = worldZ * frequency - iz;

    // Hash corners
    const h00 = hashNoise(ix, iz, seed + octave);
    const h10 = hashNoise(ix + 1, iz, seed + octave);
    const h01 = hashNoise(ix, iz + 1, seed + octave);
    const h11 = hashNoise(ix + 1, iz + 1, seed + octave);

    // Bilinear interpolation with smoothstep
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    const v = (h00 * (1 - sx) + h10 * sx) * (1 - sz) +
              (h01 * (1 - sx) + h11 * sx) * sz;

    height += v * amplitude;
    amplitude *= 0.45;
    frequency *= 2.1;
  }

  return height;
};

const hashNoise = (x: number, z: number, seed: number): number => {
  const hash = ((x * 73856093) ^ (z * 19349663) ^ seed) >>> 0;
  return (hash % 65536) / 65536; // 0..1
};
```

### Recommended Flight Tuning Values
```typescript
// Source: Analysis of current values and arcade flight model goals
// Current values are in content/helicopters.ts (DEFAULT_HELICOPTER_FLIGHT)
const ARCADE_FLIGHT_TUNING: HelicopterFlightTuning = {
  density: 200,                      // Keep same
  maxLiftForce: 240,                 // UP from 200 -- more responsive collective
  maxPitchTorque: 10,                // DOWN from 18 -- less twitchy
  maxRollTorque: 8,                  // DOWN from 16 -- less twitchy
  maxYawTorque: 10,                  // DOWN from 16 -- smoother yaw
  linearDamping: 0.6,                // UP from 0.2 -- stops faster, less drift
  angularDamping: 3.0,               // UP from 1.4 -- much less wobble
  stabilityAngularDamping: 0.7,      // DOWN from 0.85 -- stronger damping (multiplicative)
  stabilityLevelingTorqueScale: 1.2, // UP from 0.7 -- stronger auto-leveling
  stabilityLevelingDeadzone: 0.01,   // DOWN from 0.02 -- levels more aggressively
  nominalRotorRpm: 1,                // Keep same
  minRotorRpm: 0.6,                  // Keep same
  maxRotorRpm: 1.05,                 // Keep same
  rpmResponse: 2.4,                  // Keep same
  rpmMarginToTarget: 0.35,           // Keep same
  powerAvailable: 1,                 // Keep same
  powerCollectiveScale: 0.85,        // Keep same
  powerManeuverScale: 0.45,          // Keep same
  powerSpeedRelief: 0.2,             // Keep same
  powerSpeedReference: 30,           // Keep same
  powerMaxRequired: 1.35,            // Keep same
  minAuthorityScale: 0.55,           // Keep same
  powerMarginForFullAuthority: 0.15  // Keep same
};

// Additionally: hover assist needs behavior change
// Current: only activates when collective is 0.3-0.7
// Needed: auto-hover when collective input is 0 (no R/F key pressed)
// This means checking control.collective.raw === 0 and holding altitude
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `CreateGround` flat tiles | Vertex-displaced ground with noise heightmap | This phase | Terrain gets elevation variation |
| Grid + random rectangle DynamicTexture | Desert-themed procedural DynamicTexture | This phase | Terrain looks like desert, not grid paper |
| Temperate biome props (pine trees, green patches) | Desert/arid props (sparse scrub, sandy buildings) | This phase | Props match desert aesthetic |
| No enemy meshes (invisible colliders) | Procedural composed meshes from Babylon.js primitives | This phase | Enemies visible and identifiable |
| No weapon visuals | Emissive meshes + particles + line tracers | This phase | Weapons provide visual feedback |

**Deprecated/outdated:**
- The current `createTerrainMaterial` function in `terrainChunkManager.ts` draws grid lines and green rectangles. This entire function must be replaced.
- The current biome presets in `propDressing.ts` are temperate (pine-a, pine-b, oak-a). These need a desert variant added or the existing ones modified.
- The current `applyHoverAssist` only works when `heli.assists.hover` is toggled on AND collective is 0.3-0.7. The decision requires auto-hover on collective release regardless of toggle state.

## Open Questions

1. **Per-tile vs shared DynamicTexture for terrain**
   - What we know: A shared texture will still tile visibly. Per-tile unique textures give perfect variation but cost more memory.
   - What's unclear: How many tiles are visible at once (max ~81 at LOD ring radius 9)? Is 81 x 512x512 RGBA textures (~100MB) acceptable?
   - Recommendation: Use vertex colors on terrain mesh instead of per-tile textures. Vertex colors add zero texture memory, provide per-vertex color variation, and integrate naturally with the existing ground mesh. Fall back to a shared material with very low-contrast base texture. This is the recommended approach.

2. **Terrain height variation vs physics**
   - What we know: Current terrain colliders are flat box colliders. Rapier supports heightfield colliders.
   - What's unclear: How much rework the terrain streaming system needs to support heightfield colliders.
   - Recommendation: Keep height variation gentle (max ~8m amplitude) for this phase. The visual improvement is significant even with gentle hills. Physics colliders stay flat but offset downward slightly to prevent clipping on peaks. Mark heightfield collider support as a later enhancement.

3. **Auto-hover implementation**
   - What we know: Decision says "auto-hover on collective release" (R/F not pressed). Current hover assist is a toggle (X key) that dampens lateral drift.
   - What's unclear: Should auto-hover hold exact altitude or just reduce descent rate? Should it engage when collective.raw === 0 or when no keys are pressed?
   - Recommendation: Implement as altitude-hold: when collective.raw === 0, apply a force to counter gravity and hold the current altitude. This gives the "release and float" feel. The existing hover toggle can be repurposed or kept as an additional lateral-drift damper.

4. **Tracer rendering lifetime**
   - What we know: Tracers should be visible from gun to impact point.
   - What's unclear: Should tracers persist for a fixed duration (e.g., 100ms) or fade over time?
   - Recommendation: Render tracer as a line that exists for 2-3 render frames (~33-50ms). This gives the "flash" appearance of a tracer round without accumulating. Could also use a thin elongated box mesh for more visual weight.

## Sources

### Primary (HIGH confidence)
- `/babylonjs/documentation` (Context7) - ParticleSystem API, MeshBuilder.CreateLines, CreateGroundFromHeightMap, StandardMaterial emissive properties
- Codebase analysis: All source files under `apps/game/src/` (direct reading)
  - `sim/enemies.ts` - Enemy state, explosion events, killed units tracking
  - `sim/missile.ts` - Player missile state, explosion events
  - `sim/cannon.ts` - Cannon impact events
  - `sim/helicopterFlight.ts` - Flight physics, stability assist, hover assist
  - `render/bootstrap.ts` - Render loop setup, existing bind flow
  - `render/meshBindingSystem.ts` - Entity-to-mesh binding pattern
  - `render/terrain/terrainChunkManager.ts` - Current terrain implementation
  - `render/props/propDressingManager.ts` - Prop instancing pattern
  - `content/helicopters.ts` - Current flight tuning values
  - `content/controls.ts` - Control input tuning
  - `content/enemies.ts` - Enemy configs (collider sizes used as mesh size reference)
  - `content/propDressing.ts` - Biome presets, seeded random system, hash function
  - `content/world.ts` - World config (100km x 100km, 500m tiles)
  - `ui/root.ts` - Existing HUD overlay pattern (DOM-based)

### Secondary (MEDIUM confidence)
- Babylon.js official docs (via Context7) - ParticleSystem creation patterns, vertex manipulation for heightmaps
- Package.json analysis: @babylonjs/core 7.54.3, @dimforge/rapier3d-compat 0.19.3

### Tertiary (LOW confidence)
- Flight tuning recommendations (based on analysis of arcade helicopter game feel, not verified against specific reference implementations)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed, no new dependencies, APIs verified via Context7
- Architecture: HIGH - All patterns derived from existing codebase patterns, extending not replacing
- Pitfalls: HIGH - Identified from direct code analysis of current implementation gaps
- Flight tuning values: MEDIUM - Directionally correct based on physics analysis but will need iterative adjustment
- Terrain approach: MEDIUM - Vertex color vs DynamicTexture tradeoff needs validation during implementation

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable stack, no fast-moving dependencies)
