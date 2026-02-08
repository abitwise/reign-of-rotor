# Architecture Research

**Domain:** Browser helicopter combat game (ECS / fixed-timestep / Rapier physics)
**Researched:** 2026-02-08
**Confidence:** HIGH

Evidence is drawn entirely from the existing codebase (source of truth). No external research needed -- this is an integration analysis of five remaining features against a well-understood, fully implemented architecture.

## Current Architecture (Baseline)

### System Phase Pipeline

Every fixed tick (60 Hz) executes systems in strict phase order:

```
Input (sample KB/mouse)
  |
  v
Simulation (flight forces, assists, pause toggle)
  |
  v
Physics (Rapier step)
  |
  v
PostPhysics (enemies, missiles, cannon damage, player damage,
             convoy, mission director, mission stats, out-of-bounds)
  |
  v
Late (telemetry -- currently only system here)
```

UI runs on a separate `requestAnimationFrame` loop, pulling from state via provider callbacks. Rendering (Babylon.js) also runs on rAF and reads physics transforms. Neither writes to simulation state.

### Existing Patterns

| Pattern | Implementation | Where Used |
|---------|----------------|------------|
| `createXState()` | Plain object factory, returns mutable state struct | `createEnemyState`, `createMissileState`, `createConvoyState`, `createOutOfBoundsState`, etc. |
| `createXSystem()` | Closure over state, returns `LoopSystem { id, phase, step }` | Every system -- flight, enemies, missiles, convoy, damage, mission director, stats |
| `spawnX()` | Creates entity + physics body + collider, registers in state | `spawnPlayerHelicopter`, `spawnSamSite`, `spawnConvoy` |
| Provider callbacks | UI calls `setXProvider(() => buildXReadout(...))` | Avionics, combat, threat, mission, debrief, navigation readouts |
| Object pooling | Recycle fired/expired objects via `xPool` arrays | SAM missiles, player missiles, explosion events, damage events |
| Event arrays | Per-frame arrays cleared at step start, populated during step | `explosionEvents`, `damageEvents`, `killedUnits` |

### Data Flow Summary

```
PlayerInputState -----> ControlState -----> Flight forces -----> Rapier
                                                                   |
                                                                   v
EnemyState <------- PostPhysics systems <------- Collision events
   |                       |
   v                       v
MissionRuntime      PlayerDamageState
   |                       |
   v                       v
MissionStatsState   GameState.isPaused
   |
   v
UI Providers (rAF) --> HTML HUD
```

Key invariant: sim never imports from render or UI. UI reads state through provider closures. State mutation flows one direction: Input -> Sim -> Physics -> PostPhysics -> Late.

---

## Remaining Feature Integration

### Component Responsibilities

| Component | Responsibility | Phase | Communicates With |
|-----------|---------------|-------|-------------------|
| **Mission Flow UI** (briefing/debrief screens) | Game-state transitions between menu -> briefing -> gameplay -> debrief -> menu | Outside fixed loop (rAF-driven UI) | Reads `GameState`, `MissionRuntime`, `MissionStatsState`; writes `GameState.isPaused` |
| **Escort AI** (ally convoy pathfinding) | Move ally units along waypoint rails, track survival | PostPhysics | Reads `MissionRuntime` waypoints; writes to `ConvoyState`; read by `MissionDirector` |
| **RWR Threat Warning** (Radar Warning Receiver) | Aggregate all threat emitters, compute bearing/type/severity for HUD | PostPhysics or Late | Reads `EnemyState` (radar sites, SAM sites, SAM missiles); read by UI via provider |
| **Subsystem Damage Model** | Per-subsystem health degradation with gameplay effects | PostPhysics | Reads explosion/collision events; writes `PlayerDamageState.subsystems`; read by flight, weapons, sensors |
| **Missile Lock State Machine** | Player lock-on acquisition with cone/range/time/LOS constraints | PostPhysics | Reads `PlayerHelicopter` pose, `EnemyState.targets`; writes `MissileState.lockStatus/lockProgress/lockTarget` |

### Detailed Integration Analysis

---

### 1. Mission Flow UI (Briefing / Debrief Screens)

**What exists now:**
- `MissionRuntime` tracks `status: 'active' | 'completed' | 'failed'`
- `MissionStatsState` sets `debriefActive = true` when mission ends, pauses game
- `createDebriefOverlay()` in `ui/root.ts` renders debrief stats
- No briefing screen exists; game boots directly into gameplay
- `createInstructionsPanel()` serves as the current pre-flight screen

**Integration approach:**
This is a UI-layer feature, not a sim feature. It needs a game-level state machine that sits above the fixed-timestep loop.

**State machine:**

```
MENU --> BRIEFING --> GAMEPLAY --> DEBRIEF --> MENU
                        ^                       |
                        +--- Replay Mission ----+
```

**New state:**

```typescript
type GameFlowState = 'menu' | 'briefing' | 'gameplay' | 'debrief';
```

Add `flowState` to `GameState` (currently just `{ isPaused, difficultyPreset }`).

**Phase placement:** None -- this runs outside the fixed loop. The briefing/debrief screens are HTML overlays driven by rAF, same as the current instructions panel and debrief overlay. The flow controller:
- Sets `GameState.isPaused = true` during briefing/debrief
- Calls `bootstrapGameplay()` when transitioning BRIEFING -> GAMEPLAY
- Tears down systems when transitioning DEBRIEF -> MENU (via `scheduler.clear()` + physics cleanup)
- Current `MissionStatsState.debriefActive` already triggers the transition to debrief; the flow controller listens for this

**Boundaries:**
- Briefing screen reads `MissionTemplate` (content layer) -- never touches sim
- Debrief screen reads `MissionStatsState` and `MissionRuntime` -- same as current debrief overlay
- Flow controller owns lifecycle of gameplay bootstrap/teardown

**Key constraint:** The current `bootstrapGameplay()` is synchronous and monolithic. To support restart-without-reload, it needs a corresponding `teardownGameplay()` that removes all systems from the scheduler and cleans up physics entities. The debrief's "Replay Mission" button currently does `window.location.reload()` -- this must be replaced with teardown + re-bootstrap.

---

### 2. Escort AI (Ally Pathfinding)

**What exists now:**
- `ConvoyState` with `ConvoyVehicle[]` -- vehicles follow waypoint rails via `setTranslation()` on kinematic bodies
- `createConvoySystem()` runs in PostPhysics, advances vehicles along route points
- `MissionDirector` checks `convoy.completed` to mark escort objectives complete
- Design decision in ARCHITECTURE.md: "Escort missions use waypoint rails (no navmesh/pathfinding in MVP)"

**Integration approach:**
The convoy system IS the escort AI for MVP. It already moves ally vehicles along waypoint rails. What's missing is:

1. **Convoy vulnerability** -- ally vehicles can currently be destroyed by enemy fire, but this is not tracked. The convoy vehicles are kinematic bodies not registered in `EnemyState`, so SAM missiles and cannon damage do not affect them.

2. **Convoy health/survival tracking** -- if an ally vehicle is destroyed, the escort objective should reflect this (partial failure or full failure depending on design).

3. **Navigation target updates** -- as the convoy moves, the player's nav waypoint should track the convoy lead vehicle position rather than a static point.

**New state additions:**

```typescript
// Add to ConvoyVehicle:
health: number;
maxHealth: number;
destroyed: boolean;

// Add to ConvoyState:
survivingCount: number;
```

**Phase placement:** PostPhysics (same as current `createConvoySystem`). Damage handling requires reading `enemies.explosionEvents` -- same pattern as `createPlayerDamageSystem`.

**Boundaries:**
- Convoy system reads explosion events from `EnemyState` (SAM explosions near convoy vehicles)
- `MissionDirector` reads `ConvoyState.completed` and `ConvoyState.survivingCount`
- Navigation readout reads convoy lead vehicle position for dynamic waypoint

**Key constraint:** Convoy vehicles are kinematic bodies, not dynamic. They do not participate in Rapier collision response. Damage must be applied via proximity checks against explosion events (same pattern as `createPlayerDamageSystem` does for the player helicopter), not via collision events.

---

### 3. RWR Threat Warning System

**What exists now:**
- `buildThreatReadout()` in `ui/hudReadouts.ts` already implements a basic RWR:
  - Checks `enemies.samMissiles` for active missiles targeting player -> `'MISSILE LAUNCH'`
  - Checks `enemies.samSites` for lock progress -> `'MISSILE LOCK'`
  - Checks `enemies.radarSites` for range detection -> `'RADAR SCAN'`
- `RWR_WARNING_LABELS` in `content/avionics.ts` defines label strings
- `ALERT_PRIORITY_ORDER` prioritizes threat types
- `alertBanner` in UI displays the highest priority alert

**Integration approach:**
The basic RWR already exists as a UI-layer readout function. To make it a proper system with bearing information and multiple simultaneous threats:

**Option A (recommended for MVP):** Keep RWR as a readout-only function (current pattern). Enhance `buildThreatReadout()` to return an array of threats with bearing angles, not just a single warning string. This stays in the UI layer and requires no new sim system.

**Option B (future):** Create a dedicated `createRwrSystem()` in PostPhysics that aggregates threats into an `RwrState`. This is justified if RWR needs to drive gameplay (e.g., audio cues that require sim-frame timing, or if the RWR feeds into AI decision-making).

**Enhanced readout type:**

```typescript
type RwrContact = {
  type: 'radar' | 'sam-lock' | 'missile';
  bearing: number;       // degrees relative to player heading
  distance: number;
  entity: Entity;
  threatLevel: 'scan' | 'lock' | 'launch';
};

type RwrReadout = {
  contacts: RwrContact[];
  highestThreat: ThreatAlertLevel | null;
  warning: string | null;
};
```

**Phase placement:** If kept as readout function: none (runs in rAF UI loop). If promoted to system: Late phase (after all PostPhysics damage/missile updates are complete).

**Boundaries:**
- Reads `EnemyState` (radar sites, SAM sites, SAM missiles)
- Reads `PlayerHelicopter` position and heading for bearing computation
- Outputs to UI via provider callback (existing `setThreatReadoutProvider`)
- Never writes to sim state

**Key constraint:** Computing bearing for each contact requires `Math.atan2()` per emitter per frame. With the small enemy counts in MVP (< 10 emitters), this is negligible. If enemy counts grow, consider only updating RWR contacts every N frames.

---

### 4. Subsystem Damage Model

**What exists now:**
- `PlayerDamageState` already has full subsystem health:
  ```typescript
  subsystems: { engine, rotor, avionics, weapons, sensors } // all 0-1 floats
  effects: { enginePowerScale, rotorLiftScale, rotorTorqueScale, avionicsScale, weaponsScale, sensorsScale }
  ```
- `computeDamageEffects()` maps health -> effect multipliers via `DamageCurve` configs
- `applyDamage()` reduces all subsystems uniformly by `subsystemDamageMultiplier`
- Flight system reads `heli.damage.effects.rotorLiftScale`, `rotorTorqueScale`, `avionicsScale`
- Missile system reads `heli.damage.effects.sensorsScale` and `weaponsScale`
- `DifficultyPreset` contains per-difficulty `SubsystemDegradationConfig` with curves per subsystem

**Integration approach:**
The subsystem damage model is already implemented and integrated. What may be missing:

1. **Per-subsystem targeting** -- currently `applyDamage()` hurts all subsystems equally. A more realistic model would weight damage based on hit location or random roll:

```typescript
// Instead of uniform damage:
const subsystemDelta = normalized * tuning.subsystemDamageMultiplier;
state.subsystems.engine -= subsystemDelta;
state.subsystems.rotor -= subsystemDelta;
// ...

// Could be weighted per damage source:
const weights = getDamageWeights(cause);  // e.g., SAM hits rotor/engine more
state.subsystems.engine -= subsystemDelta * weights.engine;
state.subsystems.rotor -= subsystemDelta * weights.rotor;
```

2. **HUD subsystem display** -- the HUD currently does not show per-subsystem health. Add a damage readout:

```typescript
type DamageReadout = {
  hull: number;      // 0-1
  maxHull: number;
  subsystems: PlayerSubsystemHealth;  // already exists
  effects: PlayerDamageEffects;       // already exists
};
```

3. **Critical subsystem failure** -- when a subsystem drops to 0, trigger a specific failure mode (e.g., engine = 0 means no power, sensors = 0 means no lock capability). The effect curves already handle graceful degradation; the question is whether 0 health should mean total failure or just the curve's `minMultiplier`.

**Phase placement:** PostPhysics (existing `createPlayerDamageSystem` -- no new system needed).

**Boundaries:**
- `PlayerDamageState` is written by `createPlayerDamageSystem` (PostPhysics)
- Effects are read by flight system (Simulation phase -- but this is safe because flight reads from the previous tick's damage state, which was written in the previous tick's PostPhysics)
- Effects are read by missile system (PostPhysics -- runs before damage system in the same phase, so reads previous tick's values; this is acceptable for the gradual nature of damage)
- UI reads via new provider callback

**Key constraint:** The current cross-phase read (Simulation reads damage written in previous tick's PostPhysics) introduces a one-tick delay. This is intentional and acceptable -- damage effects should not be instantaneous within the same tick they occur. Do not move damage computation to Simulation phase, as it depends on PostPhysics collision/explosion events.

---

### 5. Missile Lock State Machine

**What exists now:**
- `MissileState` has `lockStatus: 'FREE' | 'ACQUIRING' | 'LOCKED'`, `lockProgress: number`, `lockTarget: Entity | null`
- `updateLockState()` in `missile.ts` implements the full lock acquisition logic:
  - `selectBestTarget()` finds best candidate within cone + range + optional LOS
  - Lock progress accumulates over `config.lockTimeSeconds`
  - Changing target resets progress
  - Sensor damage scales lock range, cone, and lock time
- `MissileConfig` contains: `lockRange`, `lockConeDegrees`, `lockTimeSeconds`, `requireLineOfSight`
- HUD displays lock state via `formatMissileLockState()` -> `'NO TARGET' | 'SEARCH' | 'ACQ XX%' | 'LOCK'`
- SAM sites have their own independent lock state: `sam.lockProgress`, `sam.hasLineOfSight`

**Integration approach:**
The missile lock state machine is already fully implemented. The three-state FSM (FREE -> ACQUIRING -> LOCKED) with cone/range/time/LOS constraints matches the PRODUCT.md requirements exactly.

Potential enhancements:

1. **Lock tone audio cue** -- the lock state transitions (`FREE->ACQUIRING`, `ACQUIRING->LOCKED`) should trigger audio events. This is a render-layer concern:

```typescript
// In createApp.ts, when wiring providers:
rootUi.setLockStateProvider?.(() => missiles.lockStatus);
// Audio system subscribes to lock state changes
```

2. **Lock break feedback** -- when lock drops from LOCKED back to FREE (target destroyed, out of cone, LOS broken), the HUD could flash or play a distinct sound.

3. **Re-lock penalty** -- optionally, breaking and re-acquiring the same target could start at partial progress rather than zero. This is a tuning parameter, not an architecture change.

**Phase placement:** PostPhysics (existing `createMissileSystem` -- no new system needed).

**Boundaries:**
- Reads `PlayerHelicopter` pose (position, rotation) for cone/range checks
- Reads `EnemyState.targets` for candidate list
- Reads `PlayerDamageState.effects.sensorsScale` for degraded performance
- Writes `MissileState.lockStatus/lockProgress/lockTarget`
- UI reads via `buildCombatReadout()` provider

**Key constraint:** Lock computation runs every fixed tick (60 Hz). The `selectBestTarget()` iterates all enemy targets, casts a ray for LOS check if enabled. With MVP enemy counts (< 10), this is fine. If target counts grow, consider spatial acceleration (but premature for MVP).

---

## Data Flow (Complete Picture With New Features)

```
                    GameFlowState (menu/briefing/gameplay/debrief)
                           |
                    [Flow Controller - rAF]
                           |
               bootstrapGameplay() / teardownGameplay()
                           |
        +------------------+------------------+
        |                                     |
   Fixed 60Hz Loop                     rAF UI Loop
        |                                     |
   Input Phase                                |
   - PlayerInput sampling                     |
        |                                     |
   Simulation Phase                           |
   - Flight forces (reads damage.effects)     |
   - Assist toggles                           |
   - Pause toggle                             |
        |                                     |
   Physics Phase                              |
   - Rapier step                              |
        |                                     |
   PostPhysics Phase                          |
   - Enemy AI (SAM lock, missile guidance)    |
   - Player missile lock FSM                  |
   - Cannon/missile damage events             |
   - Player damage (subsystem degradation)    |
   - Convoy movement + vulnerability          |
   - Mission director (objective tracking)    |
   - Mission stats                            |
   - Out-of-bounds check                      |
        |                                     |
   Late Phase                                 |
   - Telemetry                                |
   - RWR aggregation (if promoted to system)  |
        |                                     |
        +---------> State snapshots --------->+
                                              |
                                    Provider callbacks
                                    - buildAvionicsReadout()
                                    - buildCombatReadout()
                                    - buildRwrReadout()       [new]
                                    - buildDamageReadout()    [new]
                                    - buildMissionReadout()
                                    - buildDebriefReadout()
                                    - buildNavigationReadout()
                                              |
                                         HTML HUD
                                    - Avionics panel
                                    - Combat panel
                                    - RWR display            [new]
                                    - Damage indicators      [new]
                                    - Mission panel
                                    - Briefing screen        [new]
                                    - Debrief screen         [exists]
                                    - Alert banners
```

## Recommended Build Order

Dependencies between features determine the optimal build sequence:

### Phase 1: Mission Flow UI (Briefing/Debrief Screens)

**Why first:** This is the outermost shell. All other features operate within "gameplay" state. Without proper flow control, there is no clean way to restart missions, which blocks iteration on all other features.

**Dependencies:** None -- reads existing `MissionTemplate`, `MissionRuntime`, `MissionStatsState`.

**Deliverables:**
1. `GameFlowState` addition to `GameState`
2. Flow controller (UI-layer, manages lifecycle)
3. Briefing screen component (reads mission template)
4. `teardownGameplay()` function
5. Wire "Replay Mission" to teardown + re-bootstrap instead of `window.location.reload()`

### Phase 2: Subsystem Damage Model Enhancements

**Why second:** Already 90% implemented. Quick wins for gameplay feel. Other features (RWR, missile lock) already read damage effects.

**Dependencies:** None beyond existing `PlayerDamageState`.

**Deliverables:**
1. Per-subsystem damage weighting (optional, data-driven via content)
2. `buildDamageReadout()` provider function
3. HUD damage indicators (hull bar + subsystem status)
4. Content config for damage weights per source type

### Phase 3: Missile Lock State Machine Enhancements

**Why third:** Already fully implemented. Enhancements are polish (audio cues, re-lock penalty). Depends on Phase 2 only if lock audio needs damage-degraded sensor state (which it already reads).

**Dependencies:** Reads `PlayerDamageState.effects.sensorsScale` (exists).

**Deliverables:**
1. Lock state change events (for audio hooks)
2. Lock break HUD feedback
3. Optional re-lock penalty tuning parameter in `MissileConfig`

### Phase 4: RWR Threat Warning System

**Why fourth:** Builds on the existing threat readout. Requires enemies to be spawned and functional (already done). Benefits from subsystem damage being visible (Phase 2) since sensor damage should degrade RWR.

**Dependencies:** Reads `EnemyState`, `PlayerHelicopter`. Optionally reads `PlayerDamageState.effects.sensorsScale` for degraded RWR range.

**Deliverables:**
1. Enhanced `RwrReadout` type with bearing/distance per contact
2. `buildRwrReadout()` replaces current `buildThreatReadout()`
3. RWR HUD component (bearing rose or threat direction indicators)
4. Optional: RWR degradation when sensors damaged

### Phase 5: Escort AI (Convoy Vulnerability)

**Why last:** Most complex integration. Requires reading damage events from enemies (explosions), adding health to convoy vehicles, updating mission objective logic for partial convoy survival. Benefits from all other systems being stable.

**Dependencies:** `EnemyState.explosionEvents` (exists), `ConvoyState` (exists), `MissionDirector` objective tracking (exists).

**Deliverables:**
1. Convoy vehicle health/destruction tracking
2. Convoy damage from SAM explosions (proximity check)
3. Mission objective partial-failure for escort missions
4. Dynamic navigation waypoint tracking convoy position
5. Convoy vehicle destruction VFX (render layer)

## Architectural Patterns

### Pattern 1: State + System Closure

**What:** All gameplay logic follows `createXState()` + `createXSystem({ state, ...deps })` pattern. The system is a closure over shared mutable state. No class inheritance. No ECS query iteration (bitecs queries are not used for gameplay logic -- state is managed in plain TypeScript objects and Maps).

**When to use:** Every new gameplay feature.

**Trade-offs:** Simple and testable (inject mock state). But mutable shared state means ordering within a phase matters -- systems that read `enemies.explosionEvents` must run after the enemy system populates those events. The current codebase handles this by convention (systems added to scheduler in dependency order in `bootstrapGameplay()`).

**Example:**

```typescript
export const createRwrState = (): RwrState => ({
  contacts: [],
  highestThreat: null
});

export const createRwrSystem = ({
  state,
  enemies,
  player
}: {
  state: RwrState;
  enemies: EnemyState;
  player: PlayerHelicopter;
}): LoopSystem => ({
  id: 'sim.rwr',
  phase: SystemPhase.Late,
  step: () => {
    state.contacts.length = 0;
    // ... aggregate threats from enemies into state.contacts
  }
});
```

### Pattern 2: Provider Callbacks for UI

**What:** UI components never import sim state directly. Instead, `createApp.ts` wires provider closures: `rootUi.setXProvider(() => buildXReadout(gameplayContext.x))`. The UI rAF loop calls providers each frame.

**When to use:** Every new HUD element or readout.

**Trade-offs:** Clean separation (UI can be tested independently). But the indirection makes it hard to trace data flow -- you must check `createApp.ts` wiring to see what feeds what. Adding a new readout requires touching three files: readout builder (`hudReadouts.ts`), UI component (`root.ts`), and wiring (`createApp.ts`).

### Pattern 3: Per-Frame Event Arrays with Pooling

**What:** Events that happen during a tick (explosions, damage, kills) are pushed to arrays on the producing state. Consuming systems read these arrays. Arrays are cleared at the start of the next tick. Objects are recycled into pools to avoid GC pressure.

**When to use:** Any transient per-frame event (damage events, state transitions, audio triggers).

**Trade-offs:** Fast and GC-friendly. But events are only valid for one tick -- if a system runs before the producer, it sees stale (cleared) events from the previous frame. Ordering within PostPhysics is critical.

## Anti-Patterns

### Anti-Pattern 1: UI Writing to Sim State

**What people do:** Have a UI button directly mutate `mission.status` or `gameState.isPaused`.

**Why it's wrong:** Breaks the unidirectional data flow. The current codebase already has one instance: the instructions panel's close button sets `gameState.isPaused = false` directly. This is tolerable for pause (a meta-state), but must not extend to gameplay state.

**Do this instead:** UI emits intents (e.g., sets a flag on `PlayerInputState`), and a sim system reads the intent. The mission complete prompt already does this correctly: UI shows prompt, player presses Enter, `input.confirmMissionComplete` is read by `createMissionSystem`.

### Anti-Pattern 2: Cross-Phase Writes in Same Tick

**What people do:** A Simulation-phase system writes state that a PostPhysics-phase system reads, expecting it to be the "current" tick's value.

**Why it's wrong:** Since phases run in order (Input -> Sim -> Physics -> PostPhysics -> Late), a value written in Simulation IS available in PostPhysics of the same tick. This is actually fine and intentional. The real anti-pattern is the reverse: PostPhysics writing state that an earlier-phase system expects to read in the same tick. The flight system correctly reads damage effects from the previous tick.

**Do this instead:** Accept one-tick delay for PostPhysics -> Simulation communication. If you need same-tick feedback, keep both systems in the same phase.

### Anti-Pattern 3: Monolithic Bootstrap Without Teardown

**What people do:** `bootstrapGameplay()` creates everything but provides no way to clean up.

**Why it's wrong:** Prevents mission restart without page reload. Leaked physics bodies, orphaned systems, and stale state.

**Do this instead:** Every `bootstrapX()` must have a corresponding teardown. The mission flow UI (Phase 1) must address this first. Use `scheduler.clear()` + iterate physics entities for removal + null out state references.

## Scaling Considerations

| Concern | Current (MVP) | At Scale |
|---------|--------------|----------|
| Enemy count | < 10 entities | Spatial partitioning for RWR/lock queries if > 50 enemies |
| Convoy size | 2-3 vehicles | Rail pathing scales linearly; no concern up to 20+ |
| Systems per tick | ~15 systems | Linear; would need profiling if > 50 systems |
| UI updates | Every rAF frame | Throttle readout computation if FPS drops (skip frames) |
| Mission restart | Page reload | Proper teardown needed (Phase 1 deliverable) |

## Integration Points

### Internal Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| Sim -> UI | Provider callbacks returning readout snapshots | One-way (sim -> UI) | UI never writes to sim state (except `isPaused` meta-state) |
| Sim -> Render | Transform provider + entity mesh binding | One-way (sim -> render) | Render reads physics transforms via `getEntityTransform()` |
| Sim systems -> Sim systems | Shared mutable state objects | Bidirectional within phase, ordered across phases | System registration order in `bootstrapGameplay()` determines intra-phase ordering |
| Content -> Sim | Config objects passed at bootstrap | One-way (content -> sim) | Content is read-only data; sim never writes back to configs |
| Flow controller -> Gameplay | `bootstrapGameplay()` / `teardownGameplay()` | Lifecycle management | Flow controller owns creation/destruction of the gameplay session |

### New Files (Estimated)

```
apps/game/src/
  boot/
    gameFlow.ts           # GameFlowState + flow controller
  sim/
    rwr.ts                # RWR state + optional system (or stays in hudReadouts.ts)
  ui/
    briefingScreen.ts     # Mission briefing HTML overlay
    damageDisplay.ts      # Subsystem damage HUD indicators
    rwrDisplay.ts         # RWR bearing display component
  content/
    damageWeights.ts      # Per-source subsystem damage distribution
```

## Sources

- All analysis derived from direct codebase inspection (HIGH confidence)
- Architecture patterns verified against existing implementations in:
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/boot/gameplay.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/boot/createApp.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/core/loop/types.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/sim/missionDirector.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/sim/enemies.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/sim/missile.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/sim/playerDamage.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/sim/convoy.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/ui/hudReadouts.ts`
  - `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/ui/root.ts`
- Design decisions verified against `/Users/olgeroeselg/Projects/public/reign-of-rotor/memory-bank/ARCHITECTURE.md`
- Product requirements verified against `/Users/olgeroeselg/Projects/public/reign-of-rotor/memory-bank/PRODUCT.md`

---
*Architecture research for: Reign of Rotor MVP remaining features*
*Researched: 2026-02-08*
