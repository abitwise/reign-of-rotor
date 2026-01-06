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
  - Add simple “dev HUD” toggle flag (fps/entity count placeholder).
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
  - [ ] Define system pipeline phases (input→sensors→forces→physics→combat→mission→events)
  - [ ] Add minimal instrumentation (dt, steps per frame)

### [P1-3] Rapier World Integration + Entity↔Handle Mapping
- Status: Backlog
- Summary: Integrate Rapier, create world, step, and map ECS entities to Rapier bodies/colliders.
- Context: Physics underpins flight, collisions, raycasts.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a spawned physics entity, WHEN stepped, THEN transforms update and are readable by render.
  - GIVEN collisions, WHEN they occur, THEN we can attribute them to ECS entities.
- Technical notes:
  - Maintain bidirectional maps: eid→rbHandle and rbHandle→eid.
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

### [P1-5] Player Helicopter Spawn + Basic Flight Forces (Rapier)
- Status: Backlog
- Summary: Spawn a helicopter rigid body and apply lift/torques driven by input.
- Context: Core “feel” of the game.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN player input, WHEN applying collective, THEN the helicopter gains altitude.
  - GIVEN cyclic and yaw input, WHEN applied, THEN the helicopter rotates predictably.
  - GIVEN no input, WHEN in-air, THEN damping prevents uncontrolled spin.
- Technical notes:
  - Implement a flight controller system applying forces/torques each fixed tick.
- Tasks:
  - [ ] Add heli ECS components (input/flight/assists)
  - [ ] Apply lift + pitch/roll/yaw torque
  - [ ] Baseline damping tuning values

### [P1-6] Altimeter Raycast + Landing Detection
- Status: Backlog
- Summary: Add AGL sensing and landed/crash state transitions.
- Context: Enables “return to base + land” as mission completion rule and supports hover assist.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN raycast to terrain, WHEN near ground, THEN AGL is reported.
  - GIVEN a soft touchdown, WHEN landing, THEN state becomes “landed”.
  - GIVEN a hard impact, WHEN landing too fast, THEN helicopter takes damage or fails mission.
- Technical notes:
  - Use Rapier raycasts; store AGL + ground normal.
- Tasks:
  - [ ] Altimeter system
  - [ ] Landing thresholds and state transitions
  - [ ] Minimal feedback (UI indicator)

### [P1-7] Assist Toggles: Stability + Hover Assist
- Status: Backlog
- Summary: Add optional assists to keep handling accessible.
- Context: Browser demo should be playable on keyboard/gamepad.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN stability assist on, WHEN the player releases controls, THEN angular velocity damps quickly.
  - GIVEN hover assist on, WHEN near target altitude, THEN lateral drift reduces.
- Technical notes:
  - Assists should be explicit toggles; must not fight the player excessively.
- Tasks:
  - [ ] Stability torque/damping assist
  - [ ] Hover assist (velocity damping + optional altitude hold using AGL)
  - [ ] UI indicators for assist states

### [P1-8] HUD v1 (HTML Overlay)
- Status: Backlog
- Summary: Implement minimal HUD for flight and combat awareness.
- Context: Without HUD, tuning and fairness suffer.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN flight, WHEN playing, THEN HUD shows speed, AGL, heading.
  - GIVEN weapons, WHEN switching/firing, THEN HUD shows active weapon, ammo, lock state.
  - GIVEN threats, WHEN locked/launched at, THEN warnings are visible.
- Technical notes:
  - HUD reads ECS state; no direct sim mutation.
- Tasks:
  - [ ] Layout + typography baseline
  - [ ] Flight readouts
  - [ ] Weapon + lock + threat indicators

### [P1-9] Cannon Weapon (Raycast) + Hit Feedback
- Status: Backlog
- Summary: Implement primary weapon as raycast-based cannon with damage and FX hooks.
- Context: Provides fast “fun” feedback early.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a target in range, WHEN firing cannon, THEN it takes damage and shows hit feedback.
  - GIVEN no target, WHEN firing, THEN tracer/FX still displays direction.
- Technical notes:
  - Use Rapier raycast; spawn lightweight FX events.
- Tasks:
  - [ ] Gun component + cooldown
  - [ ] Raycast hit resolution + damage apply
  - [ ] Impact FX event emission

### [P1-10] Missile Weapon: Acquire/Lock/Launch + Guidance
- Status: Backlog
- Summary: Implement lock-on missiles and guidance behavior.
- Context: Signature “LHX” combat loop includes lock and evasion.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a target in cone and range, WHEN holding lock, THEN lock state transitions to locked after time.
  - GIVEN locked target, WHEN launching, THEN missile tracks target and can miss if outmaneuvered.
- Technical notes:
  - Guidance applies forces/torques via Rapier; lock uses cone/range + optional LOS.
- Tasks:
  - [ ] Lock state machine + timers
  - [ ] Missile entity spawn + physics
  - [ ] Guidance system + impact/explosion

### [P1-11] Enemy Units v1: Vehicles + Radar Site + SAM
- Status: Backlog
- Summary: Add core enemy actors for the 3 mission templates.
- Context: MVP missions need credible threats and targets.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a SAM, WHEN player enters detection range, THEN it can scan→lock→launch.
  - GIVEN a radar site, WHEN active, THEN it increases threat detection/alerts.
- Technical notes:
  - Keep AI simple FSM; tune fairness (lock delay, cooldown).
- Tasks:
  - [ ] Vehicle target entity + basic movement/patrol (optional MVP)
  - [ ] Radar emitter entity + detection model
  - [ ] SAM controller (scan/lock/fire) + missile spawn

### [P1-12] Countermeasures + Threat Warning Receiver (RWR)
- Status: Backlog
- Summary: Implement flares/chaff simplified and warning UI when targeted/launched.
- Context: Evade loop is central to helicopter combat fantasy.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN missile launch, WHEN detected, THEN player gets a clear launch warning.
  - GIVEN countermeasure use, WHEN timed well, THEN missile may lose lock (probabilistic).
- Technical notes:
  - Use events for “lock/launch”; keep countermeasure logic transparent and tunable.
- Tasks:
  - [ ] Countermeasure inventory + cooldown
  - [ ] Missile reacquire/decoy logic
  - [ ] RWR HUD integration

### [P1-13] Mission Director v1 + 3 Templates
- Status: Backlog
- Summary: Generate missions with seeded RNG and objectives.
- Context: Replayability and demo pacing.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN “Quick Mission”, WHEN started, THEN one of 3 templates spawns objectives and enemies.
  - GIVEN objectives completed, WHEN returning and landing, THEN mission completes with debrief.
- Technical notes:
  - Define mission templates as JSON-like content with spawn groups + objective definitions.
- Tasks:
  - [ ] Mission runtime state + seed
  - [ ] Spawn groups + waypoints
  - [ ] Objective tracking + success/fail conditions

### [P1-14] Debrief Screen v1 (Stats + Outcome)
- Status: Backlog
- Summary: Show mission results and basic stats; enable quick replay.
- Context: Completes the loop and improves retention.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN mission end, WHEN debrief shows, THEN player sees success/fail and key stats.
  - GIVEN replay, WHEN selected, THEN a new seeded mission starts quickly.
- Technical notes:
  - Persist minimal session stats; progression optional MVP.
- Tasks:
  - [ ] Collect stats (time, kills, damage taken, shots fired)
  - [ ] Debrief UI
  - [ ] Replay button wiring

### [P1-15] Performance Pass + Pooling + Smoke Tests
- Status: Backlog
- Summary: Reduce GC spikes, ensure stable FPS, add basic e2e checks.
- Context: Browser demo needs smoothness.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN repeated combat, WHEN spawning missiles/FX, THEN performance stays stable.
  - GIVEN CI tests, WHEN running, THEN boot/smoke passes in headless browser.
- Technical notes:
  - Pool missiles/flares/FX entities; avoid per-frame allocations in hot systems.
- Tasks:
  - [ ] Entity pooling strategy
  - [ ] Perf overlay (fps, draw calls placeholder)
  - [ ] Playwright smoke tests

## Backlog / Future

### [B-1] Additional Helicopters (Apache / Utility)
- Status: Backlog
- Summary: Add different flight profiles and loadouts.
- Context: Replayability and authenticity.

### [B-2] More Theaters (Arctic / Jungle) + Weather
- Status: Backlog
- Summary: New maps and visibility challenges.

### [B-3] Progression (Rank/Medals/Unlocks)
- Status: Backlog
- Summary: Pilot profile persistence and rewards loop.

### [B-4] Advanced Damage & Repair / Maintenance
- Status: Backlog
- Summary: More subsystem granularity; pre-flight loadout and repair costs.

### [B-5] Modding (Mission JSON Packs)
- Status: Backlog
- Summary: External mission packs and tuning overrides.

### [B-6] VR / Cockpit Interaction (Stretch)
- Status: Backlog
- Summary: Full cockpit immersion and input mapping.
