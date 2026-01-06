# TICKETS — Reign of Rotor

## Phase 1 (Current) — MVP Demo

### [P1-1] Repo + Build + Dev UX Baseline
- Status: Backlog
- Summary: Create the browser TS project skeleton with dev/prod builds and debug toggles.
- Context: Establish stable iteration speed and guardrails before gameplay work.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a fresh checkout, WHEN running dev, THEN the game boots to a placeholder scene.
  - GIVEN a production build, WHEN previewed, THEN it loads without dev-only tooling.
- Technical notes:
  - Use Vite + pnpm workspace layout consistent with ARCHITECTURE.md.
- Tasks:
  - [ ] Initialize project structure + scripts
  - [ ] Add lint/format/test scaffolding
  - [ ] Add env/config flags (dev/prod)

### [P1-2] Fixed Timestep Loop + System Scheduler
- Status: Backlog
- Summary: Implement the core loop that runs sim at fixed dt and render at refresh rate.
- Context: Flight feel and fairness depend on stable timing.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN variable frame rates, WHEN running the game, THEN sim remains stable at fixed dt.
  - GIVEN the render loop, WHEN the tab lags, THEN sim catches up without exploding.
- Technical notes:
  - Keep sim independent from Babylon frame delta.
- Tasks:
  - [ ] Implement loop and catch-up strategy
  - [ ] Define system pipeline phases
  - [ ] Add minimal instrumentation (dt, steps per frame)

### [P1-3] Rapier World Integration + Entity↔Handle Mapping
- Status: Backlog
- Summary: Integrate Rapier, create world, step, and map ECS entities to Rapier bodies/colliders.
- Context: Physics underpins flight, collisions, raycasts.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a spawned physics entity, WHEN stepped, THEN transforms update and are readable by render.
  - GIVEN collisions, WHEN they occur, THEN we can attribute them to ECS entities.
- Tasks:
  - [ ] Rapier init + step in fixed loop
  - [ ] Entity factory helpers for rigid bodies/colliders
  - [ ] Collision event plumbing (minimal)

### [P1-4] Babylon Scene Bootstrap + Render Binding Layer
- Status: Backlog
- Summary: Create Babylon scene and bind ECS transforms to meshes.
- Context: Visual feedback is required to tune flight/combat.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN an entity with a render binding, WHEN its transform changes, THEN the mesh follows.
  - GIVEN missing assets, WHEN loading, THEN failures are visible and recoverable in dev.
- Technical notes:
  - Use glTF/GLB assets and a small manifest for mapping meshId→asset.
- Tasks:
  - [ ] Scene creation + camera placeholder
  - [ ] Mesh registry + binding system
  - [ ] Asset manifest + loader skeleton

### [P1-5] Render Binding Layer + Cockpit-First Camera Rig
- Status: Backlog
- Summary: Bind ECS/physics transforms to meshes and implement cockpit-first camera.
- Context: Camera choice impacts HUD readability and flight feel; cockpit is MVP default.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN an entity with render binding, WHEN its transform updates, THEN the mesh follows.
  - GIVEN cockpit view, WHEN the heli moves/rotates, THEN camera follows with stable smoothing.
- Technical notes:
  - Third-person camera is explicitly out-of-scope for MVP (backlog).
- Tasks:
  - [ ] Mesh registry + binding system
  - [ ] Cockpit camera rig (pose, smoothing, clamp)
  - [ ] Minimal mouse-look/pointer lock support hooks

### [P1-6] Keyboard + Mouse Input Mapping (MVP)
- Status: Backlog
- Summary: Implement KB+mouse input pipeline and map to `CPlayerInput`.
- Context: Input priority is keyboard and mouse first.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN keyboard controls, WHEN pressing inputs, THEN collective/cyclic/yaw update predictably.
  - GIVEN mouse look, WHEN enabled, THEN cockpit view rotates smoothly.
- Technical notes:
  - Keep input sampling separate from sim; write once per sim tick.
- Tasks:
  - [ ] Keybind defaults (WASD/arrow/QE/etc.)
  - [ ] Mouse look with optional pointer lock
  - [ ] Simple in-game “Controls” help panel (dev)

### [P1-7] Player Helicopter Spawn + Basic Flight Forces (Rapier)
- Status: Backlog
- Summary: Spawn helicopter rigid body and apply lift/torques driven by input.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN player input, WHEN applying collective, THEN the helicopter gains altitude.
  - GIVEN cyclic and yaw input, WHEN applied, THEN the helicopter rotates predictably.
- Tasks:
  - [ ] Add heli ECS components (input/flight/assists)
  - [ ] Apply lift + pitch/roll/yaw torque
  - [ ] Baseline damping tuning values

### [P1-8] Altimeter Raycast + Landing Detection
- Status: Backlog
- Summary: Add AGL sensing and landed/crash state transitions.
- Tasks:
  - [ ] Altimeter system (raycast)
  - [ ] Landing thresholds + impact damage hooks
  - [ ] HUD indicator for AGL and landing state

### [P1-9] Assist Toggles: Stability + Hover Assist
- Status: Backlog
- Summary: Add optional assists to keep handling accessible on KB+mouse.
- Tasks:
  - [ ] Stability assist (angular damping/torque)
  - [ ] Hover assist (lateral velocity damping; optional altitude hold)
  - [ ] UI indicators for assist states

### [P1-10] HUD v1 (Cockpit-First, HTML Overlay)
- Status: Backlog
- Summary: Implement minimal HUD for flight and combat awareness.
- Context: Cockpit-first requires readable, minimal clutter HUD.
- Tasks:
  - [ ] Flight readouts: speed, AGL, heading
  - [ ] Weapon + ammo + lock state
  - [ ] Threat warnings (lock/launch)

### [P1-11] Cannon Weapon (Raycast) + Hit Feedback
- Status: Backlog
- Summary: Raycast cannon, damage, and FX hooks.
- Tasks:
  - [ ] Gun component + cooldown
  - [ ] Raycast hits + damage apply
  - [ ] Impact FX events

### [P1-12] Missile Weapon: Acquire/Lock/Launch + Guidance
- Status: Backlog
- Summary: Lock-on missiles and guidance behavior.
- Tasks:
  - [ ] Lock state machine + timers (cone/range; optional LOS)
  - [ ] Missile spawn + physics
  - [ ] Guidance system + explosion

### [P1-13] Enemy Units v1: Vehicles + Radar Site + SAM
- Status: Backlog
- Summary: Core enemy actors for mission templates.
- Tasks:
  - [ ] Radar emitter entity
  - [ ] SAM scan/lock/fire FSM
  - [ ] Basic vehicle target entities (static or simple patrol)

### [P1-14] Countermeasures + Threat Warning Receiver (RWR)
- Status: Backlog
- Summary: Flares/chaff simplified + warnings.
- Tasks:
  - [ ] Countermeasure inventory + cooldown
  - [ ] Missile decoy/lost-lock logic
  - [ ] RWR warnings wired to HUD

### [P1-15] Mission Director v1 + 3 Templates (In-Air Completion)
- Status: Backlog
- Summary: Generate missions with seeded RNG and objectives; allow mission completion in-air.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN objectives complete, WHEN player triggers mission end, THEN mission completes even if airborne.
  - GIVEN landing, WHEN performed, THEN it may be recorded as a bonus stat (optional).
- Tasks:
  - [ ] Mission runtime state + seed
  - [ ] Spawn groups + waypoints
  - [ ] Objective tracking + completion trigger (UI action or auto)

### [P1-16] Debrief Screen v1 (Stats + Outcome)
- Status: Backlog
- Summary: Show results; enable quick replay.
- Tasks:
  - [ ] Collect stats (time, kills, damage, shots fired)
  - [ ] Debrief UI
  - [ ] Replay flow (new seed)

### [P1-17] Difficulty Tuning: “Arcade but Hardcore”
- Status: Backlog
- Summary: Tune damage/threat fairness to the intended midpoint between arcade and sim.
- Context: Damage should matter and degrade capability, but not be constant instant-fail.
- Tasks:
  - [ ] Define tuning presets (Easy/Normal/Hard) for SAM accuracy/lock time/damage scaling
  - [ ] Tune subsystem degradation curves
  - [ ] Add minimal telemetry (average mission time, deaths, causes)

### [P1-18] Performance Pass + Pooling + Smoke Tests
- Status: Backlog
- Summary: Reduce GC spikes, ensure stable FPS, add basic e2e checks.
- Tasks:
  - [ ] Pool missiles/flares/FX entities
  - [ ] Perf overlay (fps, entity counts, steps/frame)
  - [ ] Playwright smoke tests (boot + start mission)

## Backlog / Future

### [B-1] Third-Person Chase Camera
- Status: Backlog
- Summary: Add optional chase camera with smoothing and obstruction avoidance.

### [B-2] Gamepad Support
- Status: Backlog
- Summary: Input mapping + tuning for controller ergonomics.

### [B-3] Additional Helicopters (Apache / Utility)
- Status: Backlog
- Summary: Different flight profiles and loadouts.

### [B-4] More Theaters (Arctic / Jungle) + Weather
- Status: Backlog
- Summary: New maps and visibility challenges.

### [B-5] Progression (Rank/Medals/Unlocks)
- Status: Backlog
- Summary: Pilot profile persistence and rewards loop.

### [B-6] Modding (Mission JSON Packs)
- Status: Backlog
- Summary: External mission packs and tuning overrides.

### [B-7] VR / Cockpit Interaction (Stretch)
- Status: Backlog
- Summary: Full cockpit immersion and input mapping.
