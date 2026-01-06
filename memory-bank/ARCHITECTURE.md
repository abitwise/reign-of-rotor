# ARCHITECTURE for Reign of Rotor

## High-level overview (1–2 paragraphs)
The game is a TypeScript browser application built around a data-driven ECS simulation (bitecs), a fixed-timestep game loop, and a physics backend (Rapier WASM). Rendering is handled by Babylon.js, projecting simulation state to visuals via a binding layer. The simulation is the source of gameplay truth, while Rapier is authoritative for rigid-body transforms and collision queries. The default experience is cockpit-first: camera and HUD prioritize first-person readability; UI/HUD is implemented as a lightweight HTML overlay.

## Main components (responsibilities)
- `core/loop`:
  - Owns fixed timestep scheduling (e.g., 60 Hz).
  - Orders systems in deterministic phases.
- `ecs`:
  - Defines component schemas, entity factories, and query helpers.
- `physics` (Rapier):
  - Creates/updates rigid bodies and colliders.
  - Steps the physics world; provides raycasts for sensors and weapons.
  - Maintains bidirectional mapping between entity IDs and Rapier handles.
- `sim`:
  - Gameplay systems: flight controller forces, assist toggles, missile guidance, weapons, damage, AI, mission director.
  - Emits gameplay events (hits, warnings, objective updates).
- `render` (Babylon.js):
  - Loads assets (GLB + compressed textures).
  - Binds entities to meshes; updates transforms each render frame.
  - VFX (particles) and camera control, driven by sim/physics state.
  - Cockpit camera rig is the initial camera implementation.
- `ui`:
  - HUD + menus + debrief.
  - Reads sim state and events; never writes physics directly.

## External integrations (what/why/how)
- Babylon.js:
  - Why: fast path to ship a complete browser 3D game with good glTF pipeline and debugging.
  - How: render loop reads `CTransform` (or cached pose) and updates mesh transforms; cockpit camera reads heli pose and applies smoothing/clamps.
- Rapier (`@dimforge/rapier3d-compat`):
  - Why: stable WASM physics with raycasts, collisions, and good performance in browsers.
  - How: fixed timestep `physics.step(dt)`; collision events converted to gameplay events; raycasts used for altimeter, targeting, LOS.
- bitecs:
  - Why: fast data-oriented ECS for clean separation and scalability.
  - How: components store numbers/ids; systems operate on queries; entity factories bind physics + render as needed.
- Input (KB+Mouse first):
  - How: DOM keyboard events + pointer lock (optional) for mouse look; mapped to `CPlayerInput`.
  - Note: keep input sampling separate from sim; write inputs once per tick.

## Important data models / contracts
### Mission completion contract (MVP)
- Mission can be marked complete when all primary objectives are met, even while airborne.
- Landing is optional and may later become a bonus/secondary condition.

### ECS Component families (key fields)
- Camera intent (recommended add-on): `CCameraRig { mode, yaw, pitch, fov, smoothing }` (cockpit first)
- Player input: `CPlayerInput { collective, cyclicX/Y, yaw, fire*, countermeasure }`
- Flight: `CHeliFlight { maxLift, max*Torque, enginePower, rotorRpm, damping }`
- Damage: `CDamageSubsystems { engine, rotor, avionics, weapons, sensors }`
- Missions: `CMissionRuntime`, `CObjective`, `CWaypoint`

## Design Decisions (key choices)
- Use Babylon.js + Rapier + bitecs (TypeScript-first, browser-first).
- Default camera is cockpit-first; third-person is a later extension.
- Keyboard + mouse are the primary inputs; assist toggles ensure accessibility.
- Fixed timestep simulation; rendering decoupled and read-only projection.
- Physics authoritative transforms; ECS stores intent/state.
- Use raycasts for bullets and key sensors (altimeter/LOS/targeting).
- Mission templates are data-driven and seeded for reproducibility.
- Visual style: low-poly modern indie; prioritize readability and stable FPS.
