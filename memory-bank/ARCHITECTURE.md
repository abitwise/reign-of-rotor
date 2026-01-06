# ARCHITECTURE for Reign of Rotor

## High-level overview (1–2 paragraphs)
The game is a TypeScript browser application built around a data-driven ECS simulation (bitecs), a fixed-timestep game loop, and a physics backend (Rapier WASM). Rendering is handled by Babylon.js, which projects simulation state to visuals via a binding layer. The simulation is the source of gameplay truth, while Rapier is authoritative for rigid-body transforms and collision queries. UI/HUD is implemented as a lightweight HTML overlay, reading state from ECS and a small event stream.

## Main components (responsibilities)
- `core/loop`:
  - Owns fixed timestep scheduling (e.g., 60 Hz).
  - Orders systems in deterministic phases.
- `ecs`:
  - Defines component schemas, entity factories, and query helpers.
  - Enforces “simulation data lives in components”.
- `physics` (Rapier):
  - Creates/updates rigid bodies and colliders.
  - Steps the physics world; provides raycasts for sensors and weapons.
  - Maintains bidirectional mapping between entity IDs and Rapier handles.
- `sim`:
  - Implements gameplay systems: flight controller forces, missile guidance, weapons, damage, AI, mission director.
  - Emits gameplay events (hits, warnings, objective updates).
- `render` (Babylon.js):
  - Loads assets (GLB + compressed textures).
  - Binds entities to meshes; updates transforms each render frame.
  - VFX (particles) and camera control, driven by sim/physics state.
- `ui`:
  - HUD + menus + debrief.
  - Reads sim state and events; never writes physics directly.

## External integrations (what/why/how)
- Babylon.js:
  - Why: fast path to a complete 3D game with glTF pipeline and good debugging.
  - How: render loop reads `CTransform` (or cached pose) and updates mesh transforms; loads GLB assets from manifest.
- Rapier (`@dimforge/rapier3d-compat`):
  - Why: stable WASM physics with raycasts, collisions, and good performance in browsers.
  - How: fixed timestep `physics.step(dt)`; collision events converted to gameplay events; raycasts used for altimeter, targeting, LOS.
- bitecs:
  - Why: fast data-oriented ECS for many entities and clean separation of concerns.
  - How: components store numbers/ids; systems operate on queries; entity factory binds physics + render as needed.
- Vite:
  - Why: fast dev server + build pipeline for TS.
  - How: dev builds include debug overlays/inspector flags; production builds enable asset compression paths.

## Important data models / contracts
### Entity Types (conceptual)
- PlayerHeli, EnemySAM, EnemyVehicle, RadarSite, Missile, Flare, Waypoint, Objective, FXOneShot

### ECS Component families (key fields)
- Physics binding: `CPhysicsBody { rbHandle, colHandle }`
- Pose cache: `CTransform { p*, q* }` (source = Rapier step)
- Player input: `CPlayerInput { collective, cyclicX/Y, yaw, fire*, countermeasure }`
- Flight: `CHeliFlight { maxLift, max*Torque, enginePower, rotorRpm, damping }`
- Assists: `CHeliAssists { stabilityAssistEnabled, hoverAssistEnabled, targetAltAGL }`
- Weapons: `CWeaponSlots`, `CGun`, `CMissileRack`
- Damage: `CHealth`, `CDamageSubsystems { engine, rotor, avionics, weapons, sensors }`
- Sensors/threats: `CRadarEmitter`, `CRadarSignature`, `CRwr`
- Missions: `CMissionRuntime`, `CObjective`, `CWaypoint`
- Rendering: `CRenderBinding { meshId }`

### Events (ephemeral, not stored as components)
- `HitEvent { attackerEid, targetEid, damage, hitPoint }`
- `ExplosionEvent { position, radius, ownerEid }`
- `LockEvent { targetEid, state }`
- `ThreatEvent { emitterEid, kind: scan|lock|launch }`
- `ObjectiveEvent { objectiveId, state }`

## Design Decisions (key choices)
- Use Babylon.js + Rapier + bitecs (TypeScript-first, browser-first).
- Fixed timestep simulation; rendering decoupled and read-only projection.
- Physics authoritative transforms; ECS stores intent/state.
- Use raycasts for:
  - Cannon hits (fast, predictable)
  - Altimeter AGL and ground normal
  - Sensor line-of-sight checks
- Mission system is data-driven: templates + seeded RNG to generate spawns/objectives.
- HTML HUD overlay for iteration speed and responsiveness (avoid “HUD in 3D” complexity in MVP).
