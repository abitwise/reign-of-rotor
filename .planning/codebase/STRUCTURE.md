# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
apps/game/
├── src/
│   ├── main.ts                     # Application entry point
│   ├── style.css                   # Global styles
│   ├── boot/                       # Application initialization and wiring
│   │   ├── createApp.ts            # App factory: orchestrates physics, renderer, gameplay
│   │   ├── gameplay.ts             # Gameplay bootstrap: spawns entities, registers systems
│   │   ├── layout.ts               # HTML layout setup
│   │   └── config.ts               # Feature flags and app configuration
│   ├── core/                       # Core loop and input infrastructure
│   │   ├── loop/
│   │   │   ├── fixedTimestepLoop.ts   # 60 Hz main loop with accumulator
│   │   │   ├── systemScheduler.ts     # System phase execution scheduler
│   │   │   └── types.ts               # SystemPhase enum, LoopSystem interface
│   │   └── input/
│   │       ├── playerInput.ts         # Input state, bindings, input system
│   │       ├── keyboardInput.ts       # Low-level keyboard sampler
│   │       ├── controlState.ts        # Processed input (authority-aware, trim-influenced)
│   │       ├── mouseLookController.ts # Cockpit head movement from mouse
│   │       └── trimUtils.ts           # Trim state management utilities
│   ├── ecs/                        # Entity-Component System (lightweight)
│   │   ├── entity.ts               # Entity ID factory
│   │   └── components/
│   │       └── helicopter.ts       # Helicopter flight tuning and assists component types
│   ├── physics/                    # Rapier physics engine integration
│   │   ├── world.ts                # Physics world context, entity transform queries
│   │   ├── bootstrap.ts            # Rapier WASM loader and world initialization
│   │   ├── physicsSystem.ts        # Physics step system (registered in scheduler)
│   │   ├── factories.ts            # Rigid body and collider creation helpers
│   │   ├── handleMap.ts            # Entity ID ↔ Rapier handle bidirectional mapping
│   │   ├── collisions.ts           # Collision event buffer, event draining
│   │   ├── rapierInstance.ts       # Rapier WASM instance loader
│   │   ├── math.ts                 # Vector math utilities (normalize, rotate, etc.)
│   │   ├── types.ts                # Entity type, Transform type
│   │   └── index.ts                # Physics module exports
│   ├── sim/                        # Gameplay simulation systems
│   │   ├── helicopterFlight.ts     # Player helicopter flight controller
│   │   ├── cannon.ts               # Cannon weapon system with raycasting
│   │   ├── missile.ts              # Missile weapon system (projectile physics)
│   │   ├── countermeasures.ts      # Flare countermeasure system
│   │   ├── enemies.ts              # Enemy AI: radar sites, SAM sites, vehicles
│   │   ├── missionDirector.ts      # Mission objectives, enemy spawning, tracking
│   │   ├── altimeter.ts            # Altitude tracking and landing detection
│   │   ├── convoy.ts               # Convoy vehicle spawning and patrol logic
│   │   ├── playerDamage.ts         # Player health and damage application
│   │   ├── missionStats.ts         # Mission statistics tracking
│   │   ├── telemetry.ts            # Frame metrics collection
│   │   ├── outOfBounds.ts          # Mission boundary enforcement
│   │   └── terrain/
│   │       ├── terrainColliders.ts     # Ground collision system (streaming)
│   │       ├── terrainStreamingSystem.ts # Terrain chunk loading/unloading
│   │       ├── propColliders.ts        # Decorative object collision system
│   │       └── propColliderStreamingSystem.ts # Prop loading/unloading
│   ├── render/                     # Babylon.js rendering layer
│   │   ├── bootstrap.ts            # Renderer initialization (scene, camera, lights)
│   │   ├── meshBindingSystem.ts    # Entity → Mesh mapping and transform sync
│   │   ├── assets/
│   │   │   ├── assetLoader.ts      # Glb/texture asset async loading
│   │   │   └── manifest.ts         # Asset manifest schema and loading
│   │   ├── camera/
│   │   │   ├── cameraRig.ts        # Cockpit and chase camera implementations
│   │   │   └── cameraModeSystem.ts # Camera mode toggle system
│   │   ├── terrain/
│   │   │   └── terrainChunkManager.ts # Streaming heightmap chunks
│   │   └── props/
│   │       └── propDressingManager.ts # Streaming decorative objects
│   ├── ui/                         # HTML overlay HUD and UI
│   │   ├── root.ts                 # Root UI container, layout, provider wiring
│   │   ├── hudReadouts.ts          # Avionics, combat, mission, threat readout builders
│   │   ├── attitudeIndicator.ts    # Attitude indicator canvas component
│   │   ├── debugOverlay.ts         # Debug telemetry overlay (feature-flagged)
│   │   └── __tests__/              # UI unit tests
│   ├── content/                    # Data-driven configuration and constants
│   │   ├── helicopters.ts          # Helicopter flight tuning presets
│   │   ├── weapons.ts              # Cannon and missile configurations
│   │   ├── countermeasures.ts      # Flare configuration
│   │   ├── enemies.ts              # Enemy unit specs (SAM, radar, vehicle)
│   │   ├── missions.ts             # Mission templates and objectives
│   │   ├── difficulty.ts           # Difficulty presets and modifiers
│   │   ├── world.ts                # World size, spawn points, bounds
│   │   ├── avionics.ts             # HUD alert thresholds and labels
│   │   ├── controls.ts             # Control tuning presets (deadzone, scale)
│   │   ├── propDressing.ts         # Decorative object definitions
│   │   └── __tests__/              # Content validation tests
│   ├── debug/                      # Developer-only debug tools (feature-flagged)
│   │   └── (debug utilities here)
│   └── __tests__/                  # Integration and unit tests
├── public/
│   ├── index.html                  # HTML entry point
│   ├── assets/
│   │   └── manifest.json           # Asset manifest (glb models, textures)
│   └── (game assets)
├── e2e/
│   └── smoke.spec.ts               # Playwright end-to-end smoke test
├── vite.config.ts                  # Vite build configuration (port 5173, @ alias)
├── vitest.config.ts                # Vitest configuration
├── playwright.config.ts            # Playwright E2E configuration
├── tsconfig.json                   # TypeScript strict mode configuration
├── package.json                    # Dependencies and scripts
└── README.md
```

## Directory Purposes

**`src/boot/`**
- Purpose: Application bootstrap and initialization orchestration
- Contains: App factory, gameplay bootstrap, HTML layout, configuration
- Key files: `createApp.ts` (orchestrator), `gameplay.ts` (system registration)

**`src/core/`**
- Purpose: Core loop infrastructure and input capture
- Contains: Fixed timestep loop, system scheduler, keyboard input, control state processing
- Key files: `loop/fixedTimestepLoop.ts` (60 Hz tick driver), `input/playerInput.ts` (input bindings)

**`src/ecs/`**
- Purpose: Lightweight entity-component definitions
- Contains: Entity ID factory, component type definitions
- Not a full ECS runtime; components live in specific subsystem state objects

**`src/physics/`**
- Purpose: Rapier physics engine integration and queries
- Contains: Physics world, entity-handle mapping, collision events, factory methods
- Key files: `world.ts` (physics context), `factories.ts` (body/collider creation)

**`src/sim/`**
- Purpose: Gameplay simulation systems and logic
- Contains: Flight controller, weapons, AI, missions, damage, terrain streaming
- Pattern: Each subsystem (`helicopterFlight.ts`, `cannon.ts`, etc.) exports state builder, system factory, and entity spawner

**`src/render/`**
- Purpose: Babylon.js rendering and visual updates
- Contains: Scene setup, mesh bindings, camera rigs, terrain/prop streaming, asset loading
- Key files: `bootstrap.ts` (scene initialization), `meshBindingSystem.ts` (entity → mesh sync)

**`src/ui/`**
- Purpose: HTML overlay HUD and UI components
- Contains: Root UI container, readout builders, attitude indicator, debug overlay
- Pattern: Providers are called in Late phase to fetch fresh data for rendering

**`src/content/`**
- Purpose: Data-driven configuration and tuning constants
- Contains: Helicopter specs, weapon configs, mission templates, difficulty presets, world config
- Lifecycle: Immutable, loaded at bootstrap, read during gameplay

**`src/debug/`**
- Purpose: Developer-only utilities (guarded by `VITE_ENABLE_DEBUG`)
- Contains: Debug overlays, flight telemetry display, cheat systems
- Committed: Yes (behind feature flag)

## Key File Locations

**Entry Points:**
- `src/main.ts`: Application entry point; finds `#root`, creates game app
- `src/boot/createApp.ts`: Main app factory; orchestrates physics, renderer, gameplay bootstrap
- `src/boot/gameplay.ts`: Gameplay initialization; spawns player, enemies, registers all simulation systems
- `public/index.html`: HTML entry point with `#root` div

**Configuration:**
- `src/boot/config.ts`: Feature flags (`enableDebugOverlay`)
- `src/content/controls.ts`: Control axis tuning (deadzone, scale)
- `src/content/difficulty.ts`: Difficulty presets with enemy aggressiveness scaling
- `vite.config.ts`: Vite configuration; `@` alias points to `src/`

**Core Simulation:**
- `src/sim/helicopterFlight.ts`: Flight controller with forces, torques, assist systems
- `src/sim/cannon.ts`: Raycast-based weapon with ammo/cooldown
- `src/sim/missile.ts`: Projectile-based weapon system
- `src/sim/enemies.ts`: Enemy spawning, AI pathfinding, SAM guidance

**Physics:**
- `src/physics/world.ts`: Physics world context and entity transform queries
- `src/physics/factories.ts`: Rigid body and collider creation
- `src/physics/handleMap.ts`: Bidirectional entity ID ↔ Rapier handle mapping

**Rendering:**
- `src/render/meshBindingSystem.ts`: Syncs mesh positions/rotations from physics
- `src/render/camera/cameraRig.ts`: Cockpit and chase camera implementations
- `src/render/terrain/terrainChunkManager.ts`: Streaming heightmap chunks

**Input:**
- `src/core/input/playerInput.ts`: Input state, bindings, input system
- `src/core/input/controlState.ts`: Processed input with trim state
- `src/core/input/keyboardInput.ts`: Low-level keyboard sampler

**Testing:**
- `src/sim/__tests__/`: Simulation system unit tests
- `src/render/__tests__/`: Rendering system unit tests
- `src/physics/__tests__/`: Physics integration tests
- `e2e/smoke.spec.ts`: Playwright E2E smoke test

## Naming Conventions

**Files:**
- Kebab-case: `fixedTimestepLoop.ts`, `meshBindingSystem.ts`, `playerInput.ts`
- Index exports: `index.ts` (e.g., `src/physics/index.ts`)
- Test files: `.test.ts` or `.spec.ts` co-located with source (e.g., `helicopterFlight.test.ts`)

**Directories:**
- Lowercase, multi-word with hyphens: `core/`, `ecs/`, `sim/`, `physics/`, `render/`, `ui/`, `content/`, `debug/`
- Subdirectory grouping: `camera/`, `terrain/`, `props/`, `assets/` group related systems

**Functions:**
- System factories: `create*System()` → returns `LoopSystem` (e.g., `createHelicopterFlightSystem`)
- State factories: `create*State()` → returns stateful context (e.g., `createCannonState`)
- Entity spawners: `spawn*()` → creates entity with physics/render bindings (e.g., `spawnPlayerHelicopter`)
- Bootstrap functions: `bootstrap*()` → async initialization (e.g., `bootstrapPhysics`, `bootstrapRenderer`)
- Builders: `build*()` → construct data structures (e.g., `buildAvionicsReadout`, `buildMissionPlan`)

**Types:**
- Component types: `C` prefix (e.g., `CHelicopterFlight`, `CPlayerInput`)
- Context types: `*Context` (e.g., `PhysicsWorldContext`, `RenderContext`, `GameplayContext`)
- Config types: `*Config` (e.g., `CannonConfig`, `SamConfig`, `ControlTuning`)
- State types: `*State` (e.g., `CannonState`, `EnemyState`, `GameState`)
- Event types: `*Event` (e.g., `CannonImpactEvent`, `SamExplosionEvent`)
- Template/definition types: `*Template` (e.g., `MissionTemplate`, `MissionObjectiveTemplate`)

**Classes:**
- `LoopSystem` implementations: Factories return interface; no classes (functional pattern)
- Core classes: `FixedTimestepLoop`, `SystemScheduler`, `MeshBindingSystem`, `KeyboardInputSampler`, `CameraRig`
- External library wrappers: `RenderAssetLoader`, `TerrainChunkManager`, `PropDressingManager`

## Where to Add New Code

**New Gameplay Feature (e.g., new weapon system):**
- Primary code: `src/sim/[feature].ts` (system factory, state builder, spawner)
- Tests: `src/sim/__tests__/[feature].test.ts`
- Content config: `src/content/[feature].ts` (tuning parameters)
- Registration: Add `create[Feature]State()` and `create[Feature]System()` calls in `src/boot/gameplay.ts`
- UI integration: Add provider callback in `src/boot/createApp.ts` wiring (if HUD display needed)

**New UI Component:**
- Primary code: `src/ui/[component].ts` or inline in `src/ui/root.ts`
- Tests: `src/ui/__tests__/[component].test.ts`
- Provider wiring: Add `set[Component]Provider` callback in `createRootUi` return object
- Data source: Implement provider in `createApp` to pull from gameplay context

**New Rendering System:**
- Primary code: `src/render/[system].ts`
- Tests: `src/render/__tests__/[system].test.ts`
- Bootstrap: Add initialization in `bootstrapRenderer` or as system in scheduler
- Physics integration: If entity-bound, use transform provider and mesh binding system

**New Physics Query (e.g., raycast, overlap):**
- Primary code: Add method to `PhysicsWorldContext` in `src/physics/world.ts`
- Usage: Call from simulation systems (post-physics phase preferred for collision queries)

**New Content Configuration:**
- File: `src/content/[domain].ts` (e.g., `src/content/newWeapon.ts`)
- Pattern: Export `DEFAULT_[TYPE]_CONFIG` const; allow difficulty modifiers in `src/content/difficulty.ts`
- Usage: Import and pass to state/system factories during gameplay bootstrap

**New Input Binding:**
- Primary code: Add key to `PlayerInputBindings` in `src/core/input/playerInput.ts`
- Processing: Add axis/pulse handling in `PlayerInputState` type and `bootstrapPlayerInput`
- Usage: Access from `input.state` parameter in gameplay systems

## Special Directories

**`src/__tests__/`**
- Purpose: Integration tests, cross-layer tests
- Generated: No (hand-written)
- Committed: Yes

**`src/debug/`**
- Purpose: Development-only code (feature-flagged)
- Generated: No
- Committed: Yes (behind `VITE_ENABLE_DEBUG` flag)
- Clean up: Remove or gate behind flags before production release

**`public/assets/`**
- Purpose: Game assets (3D models, textures, audio)
- Generated: No (externally created, added manually)
- Committed: Tracked by manifest (`public/assets/manifest.json`), actual files may be ignored

**`node_modules/`**
- Purpose: Dependencies
- Generated: Yes (via `pnpm install`)
- Committed: No (listed in `pnpm-lock.yaml`)

## Module Entry Points

**Physics Module:**
- Export: `src/physics/index.ts`
- Re-exports: Core types (`Entity`, `Transform`), factory functions, world context
- Usage: `import { Entity, PhysicsWorldContext } from '@/physics'`

**Simulation Module:**
- No single index; import directly from subsystems
- Usage: `import { spawnPlayerHelicopter } from '@/sim/helicopterFlight'`

**Render Module:**
- No single index; import from specific subsystems
- Usage: `import { MeshBindingSystem } from '@/render/meshBindingSystem'`

**Content Module:**
- No single index; import specific configs as needed
- Usage: `import { DEFAULT_CANNON_CONFIG } from '@/content/weapons'`

## Path Alias

- `@`: `apps/game/src/`
- Usage: `import type { Entity } from '@/physics/types'` instead of relative imports

## Barrel Files

- Used in `src/physics/index.ts` for core physics exports
- Not used in other modules (prefer direct imports for clarity)

---

*Structure analysis: 2026-02-08*
