# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Monolithic UI Root Component:**
- Issue: `src/ui/root.ts` (1025 lines) bundles all HUD creation, provider registration, visibility toggling, and frame scheduling in one module
- Files: `src/ui/root.ts`
- Impact: Difficult to test individual HUD components, tight coupling between visibility logic and update loops, future changes to any HUD require touching this massive file
- Fix approach: Extract individual HUD creation functions into separate modules, create a HUD manager abstraction that handles visibility and provider registration

**Unsafe Non-Null Assertion in Mesh Binding:**
- Issue: Line 60 in `src/render/meshBindingSystem.ts` uses non-null assertion `mesh.rotationQuaternion!.set()` even though null check happens on line 26. If rotationQuaternion initialization fails or is cleared elsewhere, this crashes
- Files: `src/render/meshBindingSystem.ts` (line 60)
- Impact: Runtime crash during mesh transform updates if quaternion is null
- Fix approach: Add explicit guard or ensure rotationQuaternion is always set in bind() before use

**Promise Chain Error Handling Gaps:**
- Issue: Renderer and gameplay bootstrap in `src/boot/createApp.ts` log errors but don't provide recovery strategy
- Files: `src/boot/createApp.ts` (lines 65-68, 134-137)
- Impact: If renderer fails to load, game still starts loop; if gameplay fails, loop starts with no playable state
- Fix approach: Add state machine to prevent loop start until both renderer and gameplay are ready; provide fallback UI

**Unvalidated Asset Fallback:**
- Issue: `src/render/assets/assetLoader.ts` line 44 swallows all errors and returns placeholder mesh instead of propagating critical failures
- Files: `src/render/assets/assetLoader.ts` (line 44)
- Impact: Missing or corrupt assets fail silently with red boxes; user has no indication of what went wrong
- Fix approach: Distinguish between transient (network) and permanent (malformed) failures; log asset failures with IDs to console

## Known Bugs

**Out-of-Bounds LOD Calculation:**
- Symptoms: `getLodIndex()` returns -1 for distances beyond configured LOD rings, causing chunks to not render at far distances
- Files: `src/render/terrain/terrainChunkManager.ts` (lines 68-79)
- Trigger: Fly beyond the farthest LOD ring radius
- Workaround: Configure LOD rings with sufficient outer radius; terrain generation continues but no visual feedback
- Root cause: Function doesn't clamp to final LOD index, returns -1 instead

**Missing Transform Provider Callback:**
- Symptoms: Mesh binding system silently skips meshes with missing transforms but never logs which entities are affected
- Files: `src/render/meshBindingSystem.ts` (lines 54-56)
- Trigger: Entity is bound but physics transform provider returns null
- Workaround: Ensure all bound entities have valid transforms every frame
- Risk: Silent desync between physics and render state

**Asset Container Cache Never Evicts:**
- Symptoms: Long play sessions accumulate loaded mesh containers in memory
- Files: `src/render/assets/assetLoader.ts` (line 15)
- Trigger: Load many unique mesh variants over time
- Cause: Cache has no expiration or size limit

## Security Considerations

**No Input Sanitization for Terrain/Prop Lookups:**
- Risk: If enemy/vehicle spawning or prop biome selection uses external data without validation, invalid IDs throw unhandled errors
- Files: `src/content/propDressing.ts` (lines 245, 253, 261)
- Current mitigation: Lookups are internal-only; spawn config is hardcoded
- Recommendations: If ever exposed to user/server data, add ID validation before lookup; wrap throws in try-catch at boundaries

**Pointer Lock Request Lacks Verification:**
- Risk: `src/core/input/mouseLookController.ts` requests pointer lock on click without user confirmation in some browsers
- Files: `src/core/input/mouseLookController.ts` (line 60)
- Current mitigation: requestPointerLock flag allows opt-out; browser will deny if not user-initiated
- Recommendations: Log pointer lock failures; detect and gracefully fall back to drag look

**No Content Security Policy for Asset Loading:**
- Risk: Asset manifest fetches and glTF loading from `src/render/assets/` don't validate origin
- Files: `src/render/assets/manifest.ts`, `src/render/assets/assetLoader.ts`
- Current mitigation: Assets are bundled or from same origin in production
- Recommendations: If assets move to CDN, validate manifest URLs and implement SRI hashing

## Performance Bottlenecks

**Root UI Update Loop Runs Every Frame:**
- Problem: HUD updates all metrics/providers every frame even when no data changes, causing DOM thrashing
- Files: `src/ui/root.ts` (lines 128-174)
- Cause: No change detection; providers called every frame regardless of state
- Improvement path: Memoize provider results; only update DOM when values change; batch DOM updates

**Terrain Chunk Manager Recreates Material Every Bootstrap:**
- Problem: `createTerrainMaterial()` generates random canvas texture and grid lines on every reset
- Files: `src/render/terrain/terrainChunkManager.ts` (lines 28-66)
- Cause: Material not cached or reused
- Improvement path: Lazily create and cache material; reuse across chunk resets

**Property Dressing Random Placement:**
- Problem: `src/render/props/propDressingManager.ts` (lines 135-139) may allocate/deallocate many prop meshes per terrain chunk update
- Files: `src/render/props/propDressingManager.ts`
- Cause: No object pooling for dynamically placed props
- Improvement path: Implement mesh pool for high-frequency spawned/despawned props

**Enemy SAM Missile Pooling Incomplete:**
- Problem: `src/sim/enemies.ts` pools SAM missiles but event pools may not recycle fast enough under heavy fire
- Files: `src/sim/enemies.ts` (lines 71-76)
- Cause: Event objects are allocated and pooled but no size limits
- Improvement path: Cap missile/event pool sizes; warn if pool pressure exceeds threshold

## Fragile Areas

**Physics-Render State Synchronization:**
- Files: `src/physics/handleMap.ts`, `src/render/meshBindingSystem.ts`, `src/boot/createApp.ts`
- Why fragile: Transform provider is set after both systems bootstrap; if entity is destroyed in physics before render binds it, binding silently fails; no validation that all rendered entities have physics
- Safe modification: Always wrap entity destruction in both physics and render cleanup; verify binding succeeded before using
- Test coverage: No integration tests for physics-render sync

**Control State to Flight Model:**
- Files: `src/core/input/controlState.ts`, `src/sim/helicopterFlight.ts`
- Why fragile: Trim state can be modified externally; no invariant checks that collective/cyclic values stay in valid range after trim applied
- Safe modification: Add bounds validation in trim apply logic; test with extreme trim offsets
- Test coverage: Unit tests exist but no property-based testing for edge cases

**Mission Objective State Machine:**
- Files: `src/sim/missionDirector.ts`
- Why fragile: Objective completion can be triggered from multiple paths (contact kill, objective zone, etc.); no mutual exclusion on completion event
- Safe modification: Review all objective completion triggers; ensure only one can fire per objective per frame; add logging for completion paths
- Test coverage: Happy path tested; missing edge cases (rapid re-entry, simultaneous completion)

## Scaling Limits

**Terrain Streaming Grid Complexity:**
- Current capacity: LOD ring system supports up to ~15-20 rings; typical config uses 3-5
- Limit: Beyond 20 rings, tile creation/destruction adds noticeable frame delta
- Scaling path: Implement frustum culling; generate chunks asynchronously; use worker thread for tile calculation

**Enemy Unit Count:**
- Current capacity: Scene can handle ~50-80 SAM sites + vehicles without frame drops
- Limit: Each unit has colliders, raycasts, and AI logic; beyond 80, enemy AI loop becomes bottleneck
- Scaling path: Implement AI interest levels; defer distant enemy updates; spatial partitioning for raycast queries

**Missile and SAM Count:**
- Current capacity: ~30 active missiles + SAM launches simultaneously
- Limit: Pooled objects; beyond pool size, allocations start GC stalls
- Scaling path: Increase pool size; implement missile lifetime culling; batch explosion collision queries

## Dependencies at Risk

**Babylon.js Major Version Dependency:**
- Risk: Core render loop uses Babylon 6.x API; breaking changes in 7.x could require significant refactoring
- Impact: Camera rigs, mesh bindings, material system all tightly coupled to Babylon API surface
- Migration plan: Abstract Babylon calls through `src/render/bootstrap.ts` and `src/render/meshBindingSystem.ts`; create adapter layer if upgrade needed

**Rapier Physics Version Lock:**
- Risk: WASM physics engine bundled via `@dimforge/rapier3d-compat`; compat mode masks API changes
- Impact: Handle mapping and rigid body creation tightly coupled to Rapier transform/collider API
- Migration plan: Test against latest Rapier periodically; separate handle mapping from query logic

**Vite Build Fragility:**
- Risk: No explicit Vite version pinning in workspace; WASM module loading depends on plugin configuration
- Impact: Build breaks if Vite updates WASM loader behavior
- Migration plan: Pin major version; document WASM loader config; test CI on latest Vite monthly

## Missing Critical Features

**No Pause State in Gameplay Systems:**
- Problem: `gameState.isPaused` flag exists but not all systems respect it
- Blocks: Can't pause mid-combat reliably; missiles/enemies may continue moving
- Files: `src/sim/missile.ts`, `src/sim/enemies.ts` check isPaused but other systems don't

**No Persistent Save/Load State:**
- Problem: No mission progress or stats saved between sessions
- Blocks: Player progress resets on page reload
- Impact: Can't replay specific missions or track statistics

**No Audio System:**
- Problem: No sound effects or music system implemented
- Blocks: Game is silent; reduced immersion
- Impact: UX feels incomplete despite functional gameplay

## Test Coverage Gaps

**Physics-Render Integration:**
- What's not tested: Mesh binding when entities are created/destroyed; transform provider returning null; QuaternionNaN handling
- Files: `src/render/meshBindingSystem.ts`, `src/physics/handleMap.ts`
- Risk: Silent desync between physics and visuals under stress
- Priority: High

**Error Recovery in Bootstrap:**
- What's not tested: Renderer load failure followed by loop start; gameplay bootstrap error with loop running
- Files: `src/boot/createApp.ts`
- Risk: Game enters unrecoverable broken state
- Priority: High

**Control State Edge Cases:**
- What's not tested: Trim applied with controller input at max deflection; conflicting assist states (stability + hover both active); rapid trim resets
- Files: `src/core/input/controlState.ts`
- Risk: Control model enters invalid state; unpredictable helicopter behavior
- Priority: Medium

**UI Provider Null Handling:**
- What's not tested: All HUD providers returning null simultaneously; providers switching between null/non-null rapidly
- Files: `src/ui/root.ts`, `src/ui/hudReadouts.ts`
- Risk: UI crashes or displays stale values
- Priority: Medium

**Terrain Chunk Memory Cleanup:**
- What's not tested: Chunk dispose called while mesh is in-flight; material disposal with active references
- Files: `src/render/terrain/terrainChunkManager.ts`
- Risk: GPU memory leaks or rendering artifacts after long play sessions
- Priority: Medium

---

*Concerns audit: 2026-02-08*
