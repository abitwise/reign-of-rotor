# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Fixed-timestep ECS-driven game engine with layered separation between input, simulation, physics, rendering, and UI.

**Key Characteristics:**
- Fixed 60 Hz timestep (1/60s per frame) enforced by `FixedTimestepLoop`
- Physics authority: Rapier owns rigid-body state; ECS tracks gameplay intent and derived state
- Multi-phase system execution: Input → Simulation → Physics → PostPhysics → Late
- Rendering is read-only: Babylon.js projects physics transforms to visuals
- Deterministic simulation using seeded RNG and fixed timestep
- No cross-layer mutation: Sim cannot mutate render; render/UI communicate via event callbacks

## Layers

**Input Layer:**
- Purpose: Capture keyboard and mouse input, update control state
- Location: `src/core/input/`, `src/core/loop/`
- Contains: `KeyboardInputSampler`, `PlayerInputState`, `ControlState`, `MouseLookController`, trim utils
- Depends on: Nothing (pure input sampling)
- Used by: Control state system (Input phase), flight controller, weapon systems
- Key type: `PlayerInputState` contains axis values (collective, cyclicX, cyclicY, yaw) and pulse flags (fire, trim, toggle, etc.)

**Core Loop Layer:**
- Purpose: Orchestrate fixed-timestep execution and system scheduling
- Location: `src/core/loop/`
- Contains: `FixedTimestepLoop`, `SystemScheduler`, phase enum, types
- Depends on: Nothing
- Used by: Application bootstrap
- Key classes: `FixedTimestepLoop` runs at requestAnimationFrame cadence, accumulates frame deltas, executes fixed steps; `SystemScheduler` routes systems to phases and executes in order

**Physics Layer:**
- Purpose: Maintain Rapier physics world, step simulation, handle collisions
- Location: `src/physics/`
- Contains: Rapier WASM instance loader, physics world, rigid body/collider factories, entity-handle mapping, collision event buffer, raycasting
- Depends on: `LoopSystem` interface (to register physics step in scheduler)
- Used by: Simulation layer (applies forces/torques), rendering layer (reads transforms), post-physics layer (collision queries)
- Key types:
  - `PhysicsWorldContext`: world reference, entity↔handle mapping, collision queue, step function
  - `Entity`: numeric ID (created in `src/ecs/entity.ts`)
  - `Transform`: translation (x, y, z) + rotation quaternion (x, y, z, w)

**Entity-Component System (Lightweight):**
- Purpose: Define component types and spawn entity factories
- Location: `src/ecs/`
- Contains: Component type definitions (e.g., `CHelicopterFlight`, `CHelicopterAssists`), entity ID factory
- Depends on: Nothing
- Used by: Simulation factories (e.g., `spawnPlayerHelicopter`)
- Note: Not a full ECS runtime; components are plain data types, stored in specific state objects per subsystem

**Simulation Layer (Gameplay Logic):**
- Purpose: Implement flight physics, weapons, AI, mission logic, damage, stats
- Location: `src/sim/`
- Contains:
  - Flight controller: rotor RPM, collective/cyclic forces, stability assist, hover assist
  - Weapons: cannon (hitscan with raycasting), missiles (projectiles with physics)
  - Countermeasures: flares with drag physics
  - AI/Enemies: radar sites, SAM sites (with lock progression), patrol vehicles
  - Mission director: objective tracking, mission state, enemy spawning
  - Altimeter: height tracking, landing detection
  - Terrain: collider streaming for ground collision, prop collider streaming
  - Convoy: vehicle spawning and patrol route following
  - Damage/health: player damage state with difficulty scaling
  - Telemetry: frame metrics capture
  - Out-of-bounds: mission boundary enforcement with warning
- Depends on: Physics layer (to query/apply forces), input/control state, content data
- Used by: Bootstrap gameplay, late-phase rendering
- Pattern: Each subsystem exports:
  - `create*State()` → stateful context (e.g., `CannonState`, `EnemyState`)
  - `create*System()` → `LoopSystem` with phase and step function
  - `spawn*()` → entity factory (e.g., `spawnPlayerHelicopter`, `spawnRadarEmitter`)

**Post-Physics Layer:**
- Purpose: Collision handling, sensor queries (raycasts), event generation
- Location: `src/sim/` (cannon, missile, countermeasures post-physics phases)
- Contains: Raycast-based impact detection, damage event generation, explosion queries
- Depends on: Physics layer (raycasts, entity transforms)
- Executes after physics step to ensure collisions reflect current state

**Rendering Layer:**
- Purpose: Babylon.js scene management, mesh binding, camera rigs, asset loading, streaming terrain/props
- Location: `src/render/`
- Contains:
  - Scene initialization with lighting, camera, clear color
  - `MeshBindingSystem`: maps entities to mesh visuals, syncs transforms each frame from physics
  - `CameraRig`: cockpit and chase camera modes
  - `RenderAssetLoader`: async asset loading from manifest
  - `TerrainChunkManager`: streaming heightmap chunks based on player position
  - `PropDressingManager`: streaming decorative objects (trees, buildings)
  - `MouseLookController`: integrated input for head movement (cockpit mode)
- Depends on: Physics layer (transform provider), input (mouse look), Babylon.js library
- Used by: Application bootstrap, late-phase system updates
- Key type: `RenderContext` wraps engine, scene, mesh bindings, terrain/prop managers

**Late Phase:**
- Purpose: Update UI displays, HUD readouts, telemetry
- Location: `src/ui/`, implemented in simulation systems that register in Late phase
- Contains: HUD providers (avionics, combat, mission, navigation), attitude indicator, debug overlay
- Depends on: Gameplay state (read-only callback pattern)
- Pattern: UI registers provider functions that are called every Late phase to build fresh readout data structures

**Content/Configuration Layer:**
- Purpose: Data-driven definitions for gameplay tuning, mission templates, enemy specs, weapon configs
- Location: `src/content/`
- Contains:
  - Helicopter flight tuning (`helicopters.ts`): max forces, damping, rotor RPM curves
  - Weapon configs (`weapons.ts`): cannon ammo/cooldown, missile guidance, blast radius
  - Countermeasure configs (`countermeasures.ts`): flare drag/lifetime
  - Enemy specs (`enemies.ts`): SAM lock speed, vehicle speed, radar range
  - Mission templates (`missions.ts`): objective types, enemy spawns, convoy routes
  - Difficulty presets (`difficulty.ts`): enemy aggressiveness scaling
  - World config (`world.ts`): terrain size, spawn points, world bounds
  - Avionics (`avionics.ts`): warning thresholds, alert labels
  - Control bindings (`controls.ts`): axis tuning (deadzone, scale)
- Depends on: Nothing
- Used by: Simulation layer (during init and runtime), boot layer
- Pattern: Exported as `const` or `DEFAULT_*` to allow reassignment or preset selection

**Debug Layer:**
- Purpose: Developer-only overlays and cheats
- Location: `src/debug/`
- Contains: Flight stats display, entity count, telemetry graphs (guarded by `VITE_ENABLE_DEBUG` feature flag)
- Depends on: Everything (read-only)
- Pattern: Optional, feature-flagged; no impact on production build

**Boot Layer:**
- Purpose: Application initialization and wiring
- Location: `src/boot/`
- Contains:
  - `createApp.ts`: orchestrates physics bootstrap, renderer bootstrap, gameplay bootstrap, scheduler setup, wiring UI providers
  - `gameplay.ts`: spawns player helicopter, enemies, mission, initializes all simulation systems and registers them
  - `layout.ts`: HTML layout setup (render host div, UI host div)
  - `config.ts`: feature flags, debug settings
- Depends on: Everything (orchestrator role)
- Used by: `main.ts` entry point

## Data Flow

**Per-Frame Loop:**

1. **Input Phase** (runs in Input system phase):
   - Keyboard sampler polls key states
   - `PlayerInputState` is updated: axis values computed from key combinations, pulse flags set
   - Control state system converts `PlayerInputState` + trim state → `ControlState` (smoother, authority-aware inputs)

2. **Simulation Phase** (runs in Simulation system phase):
   - Helicopter flight system reads `ControlState`, applies forces/torques to helicopter rigid body
   - Altitude is updated in altimeter from transform
   - Flight assists (stability, hover) modify forces based on current attitude
   - Weapon systems read input state (fire cannon, fire missile)
   - Enemy AI reads player position, updates lock progress, patrol paths
   - Mission director tracks objectives
   - Damage system tracks player health

3. **Physics Phase** (runs in Physics system phase):
   - `FixedTimestepLoop` calls `physics.step(fixedDeltaSeconds)`
   - Rapier integrates all forces, torques; steps collision detection
   - All rigid bodies update position and rotation

4. **PostPhysics Phase** (runs in PostPhysics system phase):
   - Cannon system raycasts from helicopter to hit enemies
   - Missile system raycasts for impact detection
   - SAM system raycasts for line-of-sight checks
   - Collision events are drained from Rapier and stored in collision buffer
   - Damage events are generated and queued

5. **Late Phase** (runs in Late system phase):
   - UI providers are invoked to build fresh readout structures
   - `MeshBindingSystem.updateFromTransforms()` syncs all entity meshes from physics transforms
   - Camera rig updates camera target position
   - Terrain chunk manager streams chunks based on player position
   - Prop dressing manager streams decoration objects

6. **Render** (automatic via Babylon.js engine):
   - Engine renders scene with updated mesh positions/rotations
   - UI overlay elements are updated with provider data

**State Management:**

- **Immutable per Frame**: `PlayerInputState`, `ControlState`, `FixedStepContext` are created fresh each phase
- **Mutable Across Frames**: Simulation state objects (`CannonState`, `EnemyState`, `PlayerHelicopter.power`, etc.) accumulate and persist
- **Event Pools**: `CannonState`, `EnemyState`, `MissileState` use object pools for impact/explosion events to reduce GC
- **Physics Authority**: Transform reads always go through `PhysicsWorldContext.getEntityTransform()`; sim systems never write to transforms directly

## Key Abstractions

**LoopSystem:**
- Purpose: Pluggable system that executes once per fixed timestep in a specific phase
- Type: `{ id: string; phase: SystemPhase; step: (context: FixedStepContext) => void }`
- Examples: `createHelicopterFlightSystem`, `createCannonSystem`, `createEnemySystem`, `createMeshBindingSystem`
- Pattern: Factory function returns a system ready to register with scheduler

**State Builders:**
- Purpose: Create initial state objects with defaults from content configs
- Pattern: `create*State(config)` → stateful object
- Examples: `createCannonState(config)` → `CannonState` with ammo, cooldown, event arrays
- Lifecycle: Created once during bootstrap, mutated across frames, pooled for event objects

**Entity Factories:**
- Purpose: Create entities with physics bodies and optional render meshes
- Pattern: `spawn*(physics, config, options)` → entity reference with body/mesh
- Examples: `spawnPlayerHelicopter`, `spawnRadarEmitter`, `spawnMissile`
- Return structure: Entity object holding entity ID, rigid body, components (flight tuning, input state, etc.)

**Content Data Structures:**
- Purpose: Immutable, data-driven configs loaded once
- Examples: `HelicopterFlightTuning`, `CannonConfig`, `SamConfig`, `MissionTemplate`
- Lifecycle: Defined in `src/content/`, selected/instantiated during bootstrap, read-only during gameplay

**Transform Provider:**
- Purpose: Abstraction over physics world for transform reads
- Type: `(entity: Entity) => Transform | null`
- Usage: Rendering layer uses this to sync meshes; enables testing with mock providers

## Entry Points

**Application Entry:**
- Location: `src/main.ts`
- Triggers: DOM ready; finds `#root` element
- Responsibilities: Creates `GameApp` and attaches to window for debugging

**App Creation:**
- Location: `src/boot/createApp.ts`
- Triggers: Called from `main.ts`
- Responsibilities:
  1. Creates HTML layout (render canvas, UI host)
  2. Bootstraps input, scheduler, control state
  3. Bootstraps physics (async Rapier WASM load)
  4. Bootstraps renderer (async Babylon.js setup)
  5. Waits for physics + renderer, then bootstraps gameplay
  6. Wires all provider callbacks from gameplay to UI
  7. Creates and starts fixed timestep loop

**Gameplay Bootstrap:**
- Location: `src/boot/gameplay.ts`
- Triggers: Called from `createApp` after physics and renderer are ready
- Responsibilities:
  1. Spawns player helicopter with input/control bindings
  2. Spawns initial mission with template-driven enemies
  3. Creates all simulation state objects (cannon, missiles, enemies, convoy, etc.)
  4. Registers all simulation systems with scheduler
  5. Returns `GameplayContext` with references to all game state

## Error Handling

**Strategy:** Fail-fast with console errors; bootstrap failures prevent loop start.

**Patterns:**
- Mesh loading failures: `await renderContext.bindEntityMesh()` throws, caught in gameplay bootstrap, logged to console
- Physics stepping: No error handling; assumes Rapier library is stable
- Async failures: Bootstrap promises catch and log; game loop is not started if gameplay promise rejects
- Missing physics transform: `getEntityTransform()` returns `null` if entity not found; rendering layer checks and logs
- Invalid states: Scheduler throws if unknown phase; adds/removes validate system ID uniqueness

**Recovery:**
- Application must be reloaded if bootstrap fails
- Pause system provides stop/destroy method for full cleanup

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.error()` for errors, `console.log()` for debug info
- No structured logging library
- Debug output guarded by feature flag (`VITE_ENABLE_DEBUG`)

**Validation:**
- Approach: Type system (strict TypeScript); content configs validated on load (asset manifest)
- Runtime checks in factories (e.g., `if (!rootElement) throw new Error(...)`)
- Boundary validation in missions (out-of-bounds system checks position against mission bounds)

**Authentication:**
- Not applicable; single-player browser game

**Determinism:**
- Fixed timestep ensures consistent simulation across frames
- Seeded RNG used for mission generation (`missionSeed = Math.floor(Math.random() * 1_000_000_000)`)
- No floating-point accumulation or delta-time-dependent logic in gameplay

**Performance Profiling:**
- Frame metrics collected by loop: `LoopFrameMetrics` (frame delta, steps executed, accumulator state)
- Telemetry system tracks entity count and displays in debug overlay
- No built-in profiling; relies on browser DevTools

---

*Architecture analysis: 2026-02-08*
