# TICKETS — Reign of Rotor

## Phase 1 (Current) — MVP Demo

### [P1-1] Repo + Build + Dev UX Baseline
- **Status:** Done
- Summary: Create the browser TS project skeleton with dev/prod builds and debug toggles.
- Context: Establish stable iteration speed and guardrails before gameplay work.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a fresh checkout, WHEN running dev, THEN the game boots to a placeholder scene.
  - GIVEN a production build, WHEN previewed, THEN it loads without dev-only tooling.
- Technical notes:
  - Use Vite + pnpm workspace layout consistent with ARCHITECTURE.md.
- Tasks:
  - [x] Initialize project structure + scripts
  - [x] Add lint/format/test scaffolding
  - [x] Add env/config flags (dev/prod)

### [P1-2] Fixed Timestep Loop + System Scheduler
- Status: Done
- Summary: Implement the core loop that runs sim at fixed dt and render at refresh rate.
- Context: Flight feel and fairness depend on stable timing.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN variable frame rates, WHEN running the game, THEN sim remains stable at fixed dt.
  - GIVEN the render loop, WHEN the tab lags, THEN sim catches up without exploding.
- Technical notes:
  - Keep sim independent from Babylon frame delta.
- Tasks:
  - [x] Implement loop and catch-up strategy
  - [x] Define system pipeline phases
  - [x] Add minimal instrumentation (dt, steps per frame)

### [P1-3] Rapier World Integration + Entity↔Handle Mapping
- Status: Done
- Summary: Integrate Rapier, create world, step, and map ECS entities to Rapier bodies/colliders.
- Context: Physics underpins flight, collisions, raycasts.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a spawned physics entity, WHEN stepped, THEN transforms update and are readable by render.
  - GIVEN collisions, WHEN they occur, THEN we can attribute them to ECS entities.
- Tasks:
  - [x] Rapier init + step in fixed loop
  - [x] Entity factory helpers for rigid bodies/colliders
  - [x] Collision event plumbing (minimal)

### [P1-4] Babylon Scene Bootstrap + Render Binding Layer
- Status: Done
- Summary: Create Babylon scene and bind ECS transforms to meshes.
- Context: Visual feedback is required to tune flight/combat.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN an entity with a render binding, WHEN its transform changes, THEN the mesh follows.
  - GIVEN missing assets, WHEN loading, THEN failures are visible and recoverable in dev.
- Technical notes:
  - Use glTF/GLB assets and a small manifest for mapping meshId→asset.
- Tasks:
  - [x] Scene creation + camera placeholder
  - [x] Mesh registry + binding system
  - [x] Asset manifest + loader skeleton

### [P1-4B] World Scale Upgrade: 100x100 Map (Chunked Terrain + Streaming)
- Status: Done
- Summary: Increase world from 1x1 to 100x100 (same unit system) using chunking/streaming so performance remains stable.
- Context: Bigger world improves immersion, navigation, and mission variety, but requires LOD/chunking to avoid perf and precision problems.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN the player flies across long distances, WHEN moving, THEN terrain and props stream in/out seamlessly.
  - GIVEN distant terrain, WHEN far away, THEN lower LOD is used and draw calls remain bounded.
  - GIVEN physics, WHEN far from origin, THEN behavior remains stable (no severe jitter).
- Technical notes:
  - Implement chunked terrain tiles with configurable tile size and LOD rings.
  - Consider origin rebasing / floating-origin strategy if using large meter-scale coordinates.
  - Mission director should use world-scale-aware spawn selection (avoid “all content near origin”).
- Tasks:
  - [ ] Define world bounds (100x100) and coordinate conventions
  - [ ] Implement chunk manager (load/unload tiles by radius)
  - [ ] Add terrain LOD strategy (at least near/mid/far)
  - [ ] Add physics stability plan (floating origin or scale strategy)
  - [ ] Update mission spawn logic to use distributed spawn zones

### [P1-4C] Procedural Environment Dressing v1 (Trees + Building Types)
- Status: Done
- Summary: Add low-poly trees and multiple building types with performant placement (instancing/impostors) across the enlarged map.
- Context: A 100x100 world looks empty without dressing; we need variety without blowing draw calls.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a terrain tile loads, WHEN dressing runs, THEN it places trees/buildings based on biome rules and density caps.
  - GIVEN performance constraints, WHEN many props are visible, THEN instancing keeps FPS stable.
  - GIVEN collision needs, WHEN near key structures, THEN colliders exist only for gameplay-relevant props.
- Technical notes:
  - Use GPU instancing for trees; use a small set of building archetypes (5–10) for MVP.
  - Collision strategy: only buildings/objects used for cover or mission targets get colliders.
- Tasks:
  - [ ] Define prop library: tree variants + building archetypes (farmhouse, warehouse, hangar, tower, radar hut, etc.)
  - [ ] Implement placement rules per tile (seeded RNG for reproducibility)
  - [ ] Implement instanced rendering for trees
  - [ ] Add collider rules for selected building types
  - [ ] Add content config for densities and biome presets

### [P1-4D] Asset + LOD Contract for Large Worlds (Manifests + Budget Limits)
- Status: Done
- Summary: Establish asset budgets and LOD/instancing rules to keep the 100x100 world feasible in a browser.
- Context: Without explicit budgets, content additions will slowly kill performance.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a new environment asset is added, WHEN validated, THEN it must meet triangle/material budgets and LOD requirements.
  - GIVEN a tile loads, WHEN rendering, THEN draw call and instance caps are not exceeded.
- Technical notes:
  - Add simple validation rules (triangle count, material count, texture sizes).
  - Ensure all common props have consistent pivots and scaling conventions.
- Tasks:
  - [ ] Define budgets (triangles per prop, materials per prop, texture size caps)
  - [ ] Define LOD requirements for buildings and trees
  - [ ] Add manifest fields for LOD variants (even if only LOD0 exists initially)
  - [ ] Add a lightweight asset validation script/tooling ticket hook (implementation later)

### [P1-5] Render Binding Layer + Cockpit-First Camera Rig
- Status: Done
- Summary: Bind ECS/physics transforms to meshes and implement cockpit-first camera.
- Context: Camera choice impacts HUD readability and flight feel; cockpit is MVP default.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN an entity with render binding, WHEN its transform updates, THEN the mesh follows.
  - GIVEN cockpit view, WHEN the heli moves/rotates, THEN camera follows with stable smoothing.
- Technical notes:
  - Camera mode selection (cockpit vs chase) is handled later (see P1-10).
- Tasks:
  - [x] Mesh registry + binding system
  - [x] Cockpit camera rig (pose, smoothing, clamp)
  - [x] Minimal mouse-look/pointer lock support hooks

### [P1-6] Keyboard + Mouse Input Mapping (MVP)
- Status: Done
- Summary: Implement KB+mouse input pipeline and map to `CPlayerInput`.
- Context: Input priority is keyboard and mouse first.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN keyboard controls, WHEN pressing inputs, THEN collective/cyclic/yaw update predictably.
  - GIVEN mouse look, WHEN enabled, THEN cockpit view rotates smoothly.
- Technical notes:
  - Keep input sampling separate from sim; write once per sim tick.
  - Mouse controls camera look only (cockpit head look), not cyclic.
  - Cyclic is keyboard (WASD), yaw Q/E, collective R/F.
- Tasks:
  - [x] Keybind defaults (WASD/arrow/QE/etc.)
  - [x] Mouse look with optional pointer lock
  - [x] Simple in-game “Controls” help panel (dev)

### [P1-6A] Control State Normalization + Input Processing (Curves/Smoothing/Rate Limits)
- Status: Done
- Summary: Introduce a normalized helicopter control state and a robust input processing layer with expo curves, smoothing, and slew limits.
- Context: K/M is inherently digital/relative; without filtering the helicopter feels twitchy and inconsistent. This also sets up future device parity without changing sim code.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN raw keyboard input, WHEN translated to control state, THEN collective/cyclic/yaw change smoothly with configurable rate limits.
  - GIVEN small input near center, WHEN applying expo curves, THEN response is gentle; near extremes, THEN authority increases.
  - GIVEN a stable hover attempt, WHEN inputs are released, THEN control state returns predictably (no spikes).
- Technical notes:
  - Mouse remains **camera-look only** (per current product invariants); cyclic stays on keyboard in MVP.
  - Implement per-axis tunables: expo gamma, smoothing τ, slew rate.
  - Store both raw and filtered values for debugging.
- Tasks:
  - [ ] Define `ControlState` (collective 0..1, cyclicX/Y -1..1, yaw -1..1, plus optional trims)
  - [ ] Implement expo curve per axis
  - [ ] Implement smoothing (exp smoothing / critically damped style)
  - [ ] Implement rate limiting (slew)
  - [ ] Add config presets (Normal/Hardcore-ish)

### [P1-6B] Keyboard Yaw-Rate Controller (K/M Usability)
- Status: Done
- Summary: Make yaw controllable on keys by mapping Q/E to desired yaw rate with strong smoothing and limits.
- Context: Direct pedal deflection on digital keys causes over-rotation and frustration; yaw-rate control is standard for KB setups.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN Q/E held, WHEN yaw input is applied, THEN yaw rotates at a capped rate that ramps in smoothly.
  - GIVEN Q/E released, WHEN yaw input returns, THEN it recenters smoothly without oscillation.
- Technical notes:
  - Implement as: keys -> desired yaw rate -> controller -> yaw command (bounded).
  - Tune stronger damping than pitch/roll.
- Tasks:
  - [ ] Add yaw-rate target parameter (deg/s or normalized)
  - [ ] Implement yaw-rate controller mapping to yaw command
  - [ ] Add tunables (max yaw rate, ramp time, damping)
  - [ ] Add HUD indicator (optional small “YAW RATE” debug)

### [P1-7] Player Helicopter Spawn + Basic Flight Forces (Rapier)
- **Status:** Done
- Summary: Spawn helicopter rigid body and apply lift/torques driven by input.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN player input, WHEN applying collective, THEN the helicopter gains altitude.
  - GIVEN cyclic and yaw input, WHEN applied, THEN the helicopter rotates predictably.
- Tasks:
  - [x] Add heli ECS components (input/flight/assists)
  - [x] Apply lift + pitch/roll/yaw torque
  - [x] Baseline damping tuning values

### [P1-7A] Trim System v1 (Force Trim + Stored Neutral Offsets)
- Status: Done
- Summary: Add a simple trim model so players can “set neutral” and reduce constant correction.
- Context: Helicopters require continuous micro-corrections; trim makes KB flying practical and enables higher difficulty without frustration.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN stable attitude/hover, WHEN player presses “Force Trim”, THEN the current cyclic/yaw offsets become the new neutral.
  - GIVEN trim set, WHEN inputs are released, THEN helicopter tends toward the trimmed attitude rather than default neutral.
  - GIVEN “Reset Trim”, THEN trims clear and behavior returns to default.
- Technical notes:
  - Trim affects control state offsets; does not rewrite physics directly.
  - Provide a simple HUD icon when trim is active and show small trim values in debug.
- Tasks:
  - [ ] Define `trim_cyclic_x/y`, `trim_yaw`
  - [ ] Add input bindings: Force Trim, Reset Trim
  - [ ] Apply trim offsets in control processing stage
  - [ ] Add HUD/Debug readout for trim

### [P1-7B] Engine/Rotor RPM + Power Margin Model (Sim-lite Performance Limits)
- Status: Done
- Summary: Add simplified rotor RPM + power available/required model to produce believable limits (RPM droop, reduced yaw authority under load).
- Context: “Yank everything at once” should have consequences; power margin drives meaningful decisions and makes avionics alerts real.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN high collective + aggressive maneuvering, WHEN required power exceeds available, THEN rotor RPM droops and lift/yaw authority reduce.
  - GIVEN power margin is healthy, WHEN maneuvering, THEN authority is normal and RPM remains near nominal.
  - GIVEN recovery action (reduce collective / gain forward speed), WHEN margin improves, THEN RPM and authority recover smoothly.
- Technical notes:
  - Keep math simplified: use tunable curves for `P_req` and `P_avail`, with rotor inertia + governor-like behavior.
  - Authority blending: scale effective cyclic + yaw with power margin.
- Tasks:
  - [ ] Add state vars: rotorRPM, enginePowerAvail, powerReq, powerMargin
  - [ ] Implement governor-like RPM holding with inertia
  - [ ] Implement power requirement approximation (collective + airflow + drag proxy)
  - [ ] Implement authority scaling vs margin (cyclic/yaw reduction under load)
  - [ ] Add audio hooks (RPM droop/strain) as events (optional)

### [P1-8] Altimeter Raycast + Landing Detection
- Status: Done
- Summary: Add AGL sensing and landed/crash state transitions.
- Tasks:
  - [x] Altimeter system (raycast)
  - [x] Landing thresholds + impact damage hooks
  - [x] HUD indicator for AGL and landing state

### [P1-9] Assist Toggles: Stability + Hover Assist
- **Status:** Done
- Summary: Add optional assists to keep handling accessible on KB+mouse.
- Tasks:
  - [x] Stability assist (angular damping/torque)
  - [x] Hover assist (lateral velocity damping; optional altitude hold)
  - [x] UI indicators for assist states

### [P1-10] Camera Modes v1: Cockpit vs Chase + Visibility Policy
- Status: Done
- Summary: Allow switching between cockpit (first-person HUD-only; helicopter hidden) and chase (third-person; helicopter visible).
- Context: Fix camera issues before HUD work starts by formalizing camera movement and visibility requirements.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN the game is running, WHEN the player presses the camera toggle keybind, THEN camera mode toggles cockpit ↔ chase immediately.
  - GIVEN cockpit mode, WHEN rendering, THEN helicopter visuals are hidden AND physics/collision is unchanged.
  - GIVEN chase mode, WHEN rendering, THEN helicopter visuals are visible AND physics/collision is unchanged.
- Technical notes:
  - MVP explicitly has no chase obstruction avoidance (may clip).
  - Mouse look remains camera-only (not cyclic).
- Tasks:
  - [x] Define camera mode model + toggle keybind
  - [x] Implement mode-specific offsets/smoothing/clamps (per plan)
  - [x] Toggle helicopter mesh visibility based on mode
  - [x] Update instructions overlay to show camera toggle + current mode

### [P1-11] HUD v1 (Cockpit-First, HTML Overlay)
- Status: Backlog
- Summary: Implement minimal HUD for flight and combat awareness.
- Context: Cockpit-first requires readable, minimal clutter HUD.
- Technical notes:
  - Include out-of-bounds warning + countdown when applicable.
- Tasks:
  - [ ] Flight readouts: speed, AGL, heading
  - [ ] Weapon + ammo + lock state
  - [ ] Threat warnings (lock/launch)

### [P1-11B] Avionics HUD v2 (Instruments + Alerts + Navigation Lite)
- Status: Backlog
- Summary: Expand cockpit-first HUD with core flight instruments, power/RPM cues, navigation bearing/distance, and prioritized alerts.
- Context: Avionics is the “why did I crash?” layer; it also supports hardcore-leaning gameplay without full sim complexity.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN normal flight, WHEN viewing HUD, THEN player sees IAS, AGL, VSI, heading, attitude (pitch/roll), and weapon state.
  - GIVEN power margin low or RPM droop, WHEN near limits, THEN HUD shows “POWER LIMIT” and/or “LOW ROTOR RPM”.
  - GIVEN steep descent with low forward speed (if VRS flag enabled), WHEN entering danger envelope, THEN HUD shows “VRS/SETTLING” warning.
  - GIVEN a waypoint objective, WHEN flying, THEN HUD shows bearing + distance to current waypoint/objective.
- Technical notes:
  - Keep alerts short, consistent, and prioritized (banner area).
  - VRS warning can be a heuristic flag (optional) even before full VRS physics.
- Tasks:
  - [ ] Add instrument widgets: IAS, VSI, Attitude, Heading, Torque/Power, Rotor RPM, Fuel (optional MVP)
  - [ ] Add navigation lite: bearing + distance to active waypoint/objective
  - [ ] Add alert manager with priority ordering (scan/lock/launch + aircraft warnings)
  - [ ] Add tuning thresholds in content config

### [P1-11C] Debug Avionics Overlay (Tuning & Telemetry)
- Status: Backlog
- Summary: Add dev-only overlays for input processing, control laws, power margin, and rotor thrust visualization.
- Context: Helicopter feel and avionics require iterative tuning; without tools, tuning becomes guesswork and rework.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN dev mode, WHEN debug overlay is toggled, THEN it shows raw vs filtered inputs and trim offsets.
  - GIVEN flight, WHEN overlay is enabled, THEN it shows rotor RPM, power margin, ETL/ground-effect/VRS flags (if present).
  - GIVEN rendering, WHEN overlay is enabled, THEN it can draw a simple thrust vector indicator (optional).
- Technical notes:
  - Dev-only build flag; zero overhead in production when disabled.
- Tasks:
  - [ ] Add debug panel toggle + layout
  - [ ] Show raw/filtered ControlState per axis
  - [ ] Show power/RPM/margin values + state flags
  - [ ] Add optional simple vector gizmo hooks

### [P1-12] Cannon Weapon (Raycast) + Hit Feedback
- Status: Backlog
- Summary: Raycast cannon, damage, and FX hooks.
- Tasks:
  - [ ] Gun component + cooldown
  - [ ] Raycast hits + damage apply
  - [ ] Impact FX events

### [P1-13] Missile Weapon: Acquire/Lock/Launch + Guidance
- Status: Backlog
- Summary: Lock-on missiles and guidance behavior.
- Technical notes:
  - Target selection is reticle-centric (best candidate near center within cone/range).
  - Consider LOS raycast gating lock for terrain masking fairness.
  - No target cycling in MVP.
- Tasks:
  - [ ] Lock state machine + timers (cone/range; optional LOS)
  - [ ] Missile spawn + physics
  - [ ] Guidance system + explosion

### [P1-14] Enemy Units v1: Vehicles + Radar Site + SAM
- Status: Backlog
- Summary: Core enemy actors for mission templates.
- Technical notes:
  - Escort ally movement uses waypoint rails; no navmesh/pathfinding in MVP.
- Tasks:
  - [ ] Radar emitter entity
  - [ ] SAM scan/lock/fire FSM
  - [ ] Basic vehicle target entities (static or simple patrol)

### [P1-15] Countermeasures + Threat Warning Receiver (RWR)
- Status: Backlog
- Summary: Flares/chaff simplified + warnings.
- Tasks:
  - [ ] Countermeasure inventory + cooldown
  - [ ] Missile decoy/lost-lock logic
  - [ ] RWR warnings wired to HUD

### [P1-16] Mission Director v1 + 3 Templates (In-Air Completion)
- Status: Backlog
- Summary: Generate missions with seeded RNG and objectives; allow mission completion in-air.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN objectives complete, WHEN the completion prompt is shown, THEN the player can confirm “Complete mission now” in-air.
  - GIVEN objectives complete, WHEN the player chooses “Continue flying”, THEN mission remains active until they complete or fail.
  - GIVEN landing, WHEN performed, THEN it may be recorded as a bonus stat (optional).
- Tasks:
  - [ ] Mission runtime state + seed
  - [ ] Spawn groups + waypoints
  - [ ] Objective tracking + completion trigger (UI action or auto)
  - [ ] Add in-air completion prompt state + input action to confirm

### [P1-17] Debrief Screen v1 (Stats + Outcome)
- Status: Backlog
- Summary: Show results; enable quick replay.
- Tasks:
  - [ ] Collect stats (time, kills, damage, shots fired)
  - [ ] Debrief UI
  - [ ] Replay flow (new seed)

### [P1-18] Difficulty Tuning: “Arcade but Hardcore”
- Status: Backlog
- Summary: Tune damage/threat fairness to the intended midpoint between arcade and sim.
- Context: Damage should matter and degrade capability, but not be constant instant-fail.
- Tasks:
  - [ ] Define tuning presets (Easy/Normal/Hard) for SAM accuracy/lock time/damage scaling
  - [ ] Tune subsystem degradation curves
  - [ ] Add minimal telemetry (average mission time, deaths, causes)

### [P1-19] Performance Pass + Pooling + Smoke Tests
- Status: Backlog
- Summary: Reduce GC spikes, ensure stable FPS, add basic e2e checks.
- Tasks:
  - [ ] Pool missiles/flares/FX entities
  - [ ] Perf overlay (fps, entity counts, steps/frame)
  - [ ] Playwright smoke tests (boot + start mission)
 
### [P1-20] Out-of-Bounds Rules + Warning UI
- Status: Backlog
- Summary: Define mission area bounds and implement warning + fail countdown.
- Context: Prevents players from wandering indefinitely and supports consistent mission pacing.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN the player exits mission bounds, WHEN out-of-bounds, THEN show warning + countdown.
  - GIVEN the player returns within bounds before countdown ends, THEN warning clears and mission continues.
  - GIVEN countdown expires, THEN mission fails.
- Technical notes:
  - Bounds can be simple rectangle/circle centered on mission area for MVP.
- Tasks:
  - [ ] Define bounds model (rect/circle) in mission runtime
  - [ ] Implement countdown + fail trigger
  - [ ] Wire to HUD warning banner

## Backlog / Future

### [B-1] Chase Camera Polish: Obstruction Avoidance + Tuning
- Status: Backlog
- Summary: Improve chase camera readability with simple obstruction avoidance and tuning.

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
