---
phase: quick-260710-jdl
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [UAT-00-test-1-controls, UAT-00-test-1-visibility]
files_modified:
  - apps/game/src/content/helicopters.ts
  - apps/game/src/sim/helicopterFlight.ts
  - apps/game/src/sim/__tests__/helicopterFlight.test.ts
  - apps/game/src/render/visuals/enemyVisualManager.ts
  - apps/game/src/render/visuals/hudMarkerManager.ts
  - apps/game/src/content/missions.ts
  - apps/game/src/content/world.ts
  - apps/game/src/content/terrainHeight.ts
  - apps/game/src/render/terrain/terrainChunkManager.ts
  - apps/game/src/render/bootstrap.ts
  - apps/game/src/sim/__tests__/enemyPlacement.test.ts

must_haves:
  truths:
    - "Under real gravity, pressing collective-up (R) makes the helicopter climb and collective-down (F) makes it descend"
    - "Releasing the stick returns the helicopter to controllable level flight with usable pitch/roll/yaw authority (not sluggish/unresponsive)"
    - "Releasing collective holds altitude (auto-hover) without sinking or ballooning"
    - "Mission enemies spawn on the terrain surface (never underground), inside the camera far plane, and are locatable via on-screen HUD markers"
  artifacts:
    - apps/game/src/content/helicopters.ts
    - apps/game/src/sim/helicopterFlight.ts
    - apps/game/src/sim/__tests__/helicopterFlight.test.ts
    - apps/game/src/render/visuals/enemyVisualManager.ts
    - apps/game/src/render/visuals/hudMarkerManager.ts
  key_links:
    - "content/terrainHeight.ts is the single source of ground height for BOTH sim (missions.ts enemy placement) and render (terrainChunkManager.ts vertex displacement)"
    - "createApp.ts onBeforeRender wires enemyVisuals.update + hudMarkers.update every frame against the physics transform provider"
    - "collective force path (applyRotorForces) and auto-hover gravity compensation (applyHoverAssist) must not cancel each other out when collective is pressed"
---

<objective>
Audit and fix the two defects the player reported in UAT test 1 (severity: major):
"very hard to fly around, helicopter is slow to respond and hard to move up or down. I did not see enemies."

This decomposes into two evidence-based audit tracks:
1. Helicopter control authority (climb/descend + turning feels sluggish/unresponsive).
2. Enemy visibility (enemies not seen), validated on top of the in-flight baseline spawn-distance / terrain-height fixes already present in the working tree.

Purpose: Make the core flight + combat loop actually playable — the player must be able to climb, descend, maneuver, and find enemies.
Output: Rebalanced flight tuning/force model with a gravity-aware regression test, finalized enemy-visibility chain, and green `pnpm test` + `pnpm build`.

APPROACH DISCIPLINE (per task): READ and diagnose with concrete file:line evidence FIRST, THEN fix, THEN verify with the existing test suite and build. Do not blindly apply the magic numbers suggested below — they are diagnostic leads to confirm or refute. Keep tuning data-driven in content/ (CLAUDE.md). Respect invariants: fixed 60 Hz timestep, physics authoritative (apply forces/torques, never write transforms directly for the player body), render read-only, sim never imports render/UI.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/00-fix-the-basics/00-UAT.md
@CLAUDE.md

# Controls track
@apps/game/src/sim/helicopterFlight.ts
@apps/game/src/content/helicopters.ts
@apps/game/src/core/input/controlState.ts
@apps/game/src/content/controls.ts
@apps/game/src/sim/__tests__/helicopterFlight.test.ts

# Visibility track
@apps/game/src/render/visuals/enemyVisualManager.ts
@apps/game/src/render/visuals/hudMarkerManager.ts
@apps/game/src/content/missions.ts
@apps/game/src/content/world.ts
@apps/game/src/content/terrainHeight.ts
@apps/game/src/sim/__tests__/enemyPlacement.test.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Diagnose and fix helicopter control authority (climb/descend + maneuvering)</name>
  <files>apps/game/src/content/helicopters.ts, apps/game/src/sim/helicopterFlight.ts, apps/game/src/sim/__tests__/helicopterFlight.test.ts</files>
  <behavior>
    Add a NEW regression test (or tests) in helicopterFlight.test.ts that exercises the flight system UNDER REAL GRAVITY (the existing tests create the physics world with gravity {0,0,0}, which is why the weak lift never surfaces). The new gravity-enabled test(s) must assert, using the real DEFAULT_HELICOPTER_FLIGHT tuning:
    - Collective-up (raw=1, filtered=1) held over a short multi-tick run produces net positive vertical velocity / climb (the aircraft rises, does not sink).
    - Collective-down (raw=-1, filtered=-1) produces net descent.
    - Collective neutral (raw=0) holds altitude approximately (auto-hover gravity compensation keeps vertical velocity near zero over several ticks — neither sinking hard nor ballooning).
    - Sustained cyclic pitch or roll input produces a meaningful attitude/angular-velocity change within a small number of ticks (turning authority is usable, not near-zero).
    These tests should FAIL against the current tuning/model (RED), then PASS after the fix (GREEN). Do NOT weaken the assertions to fit the broken numbers. Keep all existing zero-gravity tests passing (adjust only if a test encodes the buggy behavior — if so, justify in the commit).
  </behavior>
  <action>
    DIAGNOSE FIRST (record findings with file:line evidence in the commit body):
    (a) Compute the player body's effective mass from `density` (content/helicopters.ts) and the collider cuboid half-extents in spawnPlayerHelicopter (helicopterFlight.ts ~line 75): full dims 2.4 x 1.2 x 5.0 = 14.4 m^3 * density 200 = ~2880 kg, weight ~= mass*9.81 ~= 28,250 N. Compare against `maxLiftForce: 240` (~0.85% of weight) and the torque budget (`maxPitchTorque` 10, `maxRollTorque` 8, `maxYawTorque` 10) against the box's rotational inertia (order ~10^3-10^4 kg*m^2). Confirm/refute that force and torque authority are orders of magnitude too small for the mass.
    (b) Trace the collective vs auto-hover interaction: applyRotorForces (helicopterFlight.ts ~151) applies at most `maxLiftForce` up, while applyHoverAssist (~409) ONLY applies gravity compensation (mass*9.81) when `rawCollective === 0`. Confirm/refute that pressing collective-up or -down DISABLES gravity compensation, leaving only ~240 N against ~28 kN of gravity, so the aircraft sinks the instant the player commands a climb — matching "hard to move up or down".
    (c) Note the strong angular damping stack (angularDamping 3.0 body damping + stabilityAngularDamping multiplicative bleed each tick) compounding weak torques into "slow to respond".

    THEN FIX (choose the minimal coherent rebalance; keep tuning data-driven in content/helicopters.ts, structural changes in helicopterFlight.ts):
    - Give collective real vertical authority under gravity. Preferred shape: keep a gravity-compensating baseline active across the collective range so collective commands climb/descend ABOUT the hover point (i.e. collective adds/subtracts thrust relative to weight) instead of replacing the only up-force — OR rebalance mass/force so `maxLiftForce` can both hover and climb. Whichever path, the auto-hover-on-release behavior (test 7 expectation) must be preserved: releasing collective still holds altitude.
    - Restore usable pitch/roll/yaw authority relative to the body's inertia (rebalance density/mass and/or torque magnitudes and/or damping) so maneuvering is responsive but still arcade-smooth and auto-leveling on release (do not reintroduce twitchiness — test 6 expectation).
    - Prefer adjusting content/ tuning constants over changing the force-model structure; change helicopterFlight.ts only where the structural collective/hover interaction requires it.
    Do NOT introduce transform writes on the player body (physics authoritative). Do NOT add new dependencies.
  </action>
  <verify>
    <automated>cd apps/game && npx vitest run src/sim/__tests__/helicopterFlight.test.ts</automated>
  </verify>
  <done>New gravity-enabled regression test(s) assert climb-on-collective-up, descent-on-collective-down, altitude-hold-on-neutral, and usable maneuver authority — all green. Full pre-existing helicopterFlight suite still passes. Flight tuning/model rebalanced so the diagnosed mass-vs-authority mismatch and the collective-disables-hover interaction are resolved.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Validate and finalize enemy visibility on top of the baseline fixes</name>
  <files>apps/game/src/render/visuals/enemyVisualManager.ts, apps/game/src/render/visuals/hudMarkerManager.ts, apps/game/src/content/missions.ts, apps/game/src/content/world.ts, apps/game/src/content/terrainHeight.ts, apps/game/src/render/terrain/terrainChunkManager.ts, apps/game/src/render/bootstrap.ts, apps/game/src/sim/__tests__/enemyPlacement.test.ts</files>
  <behavior>
    Confirm (and extend if a real gap is found) the enemy-placement invariants that make enemies visible:
    - Every mission enemy spawns inside CAMERA_FAR_PLANE (already asserted by enemyPlacement.test.ts).
    - Every enemy Y equals terrainHeight(x,z) at its position — seated on the surface, never underground and never floating (already asserted). Sim (missions.ts) and render (terrainChunkManager.ts re-export) must resolve height from the SAME content/terrainHeight.ts.
    - If diagnosis finds a genuine visibility gap not covered by the baseline (e.g. HUD markers not displaying for in-view enemies, mesh not positioned at the physics transform, or distant enemies unlocatable because both mesh is sub-pixel AND no marker shows), add a focused assertion covering the corrected behavior. Do not add tests that require a live Babylon scene/DOM if the existing harness cannot support it — cover what is unit-testable and verify the rest by reasoning against the wiring in createApp.ts.
  </behavior>
  <action>
    DIAGNOSE FIRST (file:line evidence): The working tree already reduced spawn distance to 2000-4000m (missions.ts MISSION_DIRECTOR_CONFIG), snapped enemy/convoy Y to terrainHeight (missions.ts toWorldPosition/buildConvoyPlan), added CAMERA_FAR_PLANE=8000 (world.ts) and set camera.maxZ to it (bootstrap.ts:80). Verify these are internally consistent and that enemyPlacement.test.ts passes. Then walk the full visibility chain:
    - enemyVisualManager.ts: meshes are built with local part offsets (bases at y~0) and positioned via getTransform(entity) each frame in createApp.ts (~163). Confirm the mesh origin ends up on the ground (mesh bottom ~ terrain height) and not buried or floating. Confirm the transform provider returns the enemy fixed-body translations.
    - hudMarkerManager.ts: markers project world pos (+2 up) to screen and display only when on-screen and in front (screenPos.z in (0,1) and within viewport). Since enemies spawn 2000-4600m out where a ~4m mesh is effectively sub-pixel, the HUD marker is the primary "locate the enemy" affordance. Confirm markers are wired (createApp.ts:198) and would actually display for enemies in the camera frustum. Identify any real defect (e.g. markers never shown, wrong container, projection error) — do NOT invent one if the chain is correct.
    - Confirm no residual y=0 / underground placement anywhere sim positions enemies or convoy waypoints, and that render terrain and sim placement agree on height (shared terrainHeight import).

    THEN FIX only the concrete defects found. If the baseline chain is already correct and enemies are simply small-at-distance, the correct outcome is: keep the baseline, ensure the enemyPlacement invariants are locked by tests, and (only if warranted) make distant enemies locatable via the HUD marker path rather than inflating mesh scale. Keep sim free of render/UI imports; keep render read-only; keep tuning/config in content/.

    COMMIT SCOPE: This task's commit will unavoidably include the in-flight baseline hunks in the files it touches (terrainHeight.ts and enemyPlacement.test.ts are currently untracked; missions.ts/world.ts/terrainChunkManager.ts/bootstrap.ts are modified). Stage and commit those baseline files together with any new fixes as one coherent "finalize enemy visibility" commit. Do NOT stage or commit apps/game/vite.config.ts, .claude/settings.local.json, or .planning/config.json under any circumstances.
  </action>
  <verify>
    <automated>cd apps/game && npx vitest run src/sim/__tests__/enemyPlacement.test.ts</automated>
  </verify>
  <done>Enemy placement invariants (inside far plane, seated on shared terrain height, sim/render height agreement) are green. Any genuine visibility defect in the mesh or HUD-marker chain is fixed with evidence. Baseline enemy-visibility files are committed together with the fixes in one coherent commit; vite.config.ts / settings.local.json / config.json are excluded.</done>
</task>

</tasks>

<threat_model>
Local, no-new-dependency browser-game bugfix. No new external inputs, network surface, package installs, or trust boundaries are introduced.

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | Flight force/torque rebalance | low | accept | Regression tests assert climb/descend/hover/maneuver bounds; physics stays authoritative (no transform writes on player body) |
| T-quick-02 | Denial of Service | Per-frame enemy visual + HUD marker update | low | accept | No new allocations in hot path; marker count bounded (maxMarkers=32); baseline pooling unchanged |
</threat_model>

<verification>
Run the full suite and build from repo root before finishing:
- `pnpm test` — all unit tests pass (new gravity flight test(s) + enemyPlacement invariants + no regressions).
- `pnpm build` — TypeScript check + production build succeed (no `any` in sim/physics paths; `import type` for type-only imports).
- `pnpm lint` — ESLint clean (max 0 warnings).
</verification>

<success_criteria>
- Under real gravity, collective-up climbs, collective-down descends, neutral holds altitude, and pitch/roll/yaw are responsive yet auto-leveling — proven by new regression tests.
- Enemies spawn on the terrain surface inside the camera far plane and are locatable (HUD markers verified in the wired chain); no underground/floating placement; sim and render agree on terrain height.
- `pnpm test`, `pnpm build`, and `pnpm lint` all pass.
- Baseline in-flight fixes are finalized in coherent commits; excluded files (vite.config.ts, settings.local.json, config.json) untouched.
</success_criteria>

<output>
Create `.planning/quick/260710-jdl-audit-the-helicopter-controls-and-visual/260710-jdl-SUMMARY.md` when done, recording: the diagnosed root causes (with file:line evidence), the fixes applied, before/after tuning values, and test/build/lint results.
</output>
