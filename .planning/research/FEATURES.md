# Feature Research

**Domain:** Browser helicopter combat game (sim-accessible, arcade-hardcore)
**Researched:** 2026-02-08
**Confidence:** MEDIUM (training data only; WebSearch unavailable)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

#### Flight & Controls

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Responsive collective/cyclic/yaw controls | Core verb of the genre. If the helicopter doesn't feel right, nothing else matters. | HIGH (tuning) | EXISTS. Tuning iteration is ongoing. |
| Stability assist toggle | Sim-curious players need training wheels; hardcore players want them off. | MEDIUM | EXISTS (`stabilityAngularDamping`, leveling torque). |
| Altitude hold / hover assist | Every helicopter game since Comanche offers this. Expected accessibility feature. | MEDIUM | EXISTS (hover assist toggle mentioned in PRODUCT.md). |
| Ground collision / crash physics | Helicopters that clip through terrain break immersion instantly. | MEDIUM | EXISTS (Rapier colliders, terrain colliders, crash damage). |
| Rotor spin-up visual | Players need visual confirmation rotors are running. Static rotors feel broken. | LOW | EXISTS (procedural rotor animation per asset contract). |

#### Combat

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cannon / gun with tracers or hit feedback | Primary weapon; players expect immediate visual and audio feedback on hits. | MEDIUM | EXISTS (cannon system, raycast hits). Visual feedback (tracers, impact VFX) may need polish. |
| Guided missiles with lock-on | Genre-defining mechanic since LHX. Lock tone, acquisition time, launch, track. | HIGH | EXISTS (missile system with lock cone, range, LOS, lock timer). |
| Flares / countermeasures | Direct counter to missiles. Players expect a skill-based evasion option. | MEDIUM | EXISTS (flare/chaff system with ammo, cooldown, decoy). |
| Limited ammo / weapon management | Creates tactical tension. Infinite ammo removes decision-making. | LOW | EXISTS (ammo counts on cannon, missiles, countermeasures). |
| Enemy SAM threat with warning progression | Scan -> lock -> launch is the genre's core tension loop. Missing this = no threat. | HIGH | EXISTS (SAM sites, radar, lock progression, RWR labels). |
| Hit feedback on enemies (visual/audio) | Players need confirmation their attacks are working. | MEDIUM | PARTIAL. Damage events exist. Visual feedback (explosions, smoke, health bars) needs verification. |

#### HUD & Situational Awareness

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Altitude (AGL) readout | Most fundamental flight instrument. | LOW | EXISTS (altimeter system). |
| Airspeed readout | Second most fundamental. Players need to know if they're moving. | LOW | EXISTS (horizontal speed in avionics readout). |
| Heading indicator | Navigation requires knowing which direction you're facing. | LOW | EXISTS (heading in altimeter/avionics). |
| Weapon status (selected + ammo count) | Players must know what they can fire and how much is left. | LOW | EXISTS (combat readout: weapon name, ammo, missile ammo, CM ammo). |
| Missile lock indicator | Must show lock acquisition progress and locked state clearly. | LOW | EXISTS (lock state: SEARCH / ACQ X% / LOCK / NO TARGET). |
| Threat warning (RWR) | Players must know when they're being scanned, locked, or shot at. | MEDIUM | EXISTS (threat readout with scan/lock/launch levels). |
| Damage / health indicator | Players need to know how hurt they are. | LOW | EXISTS (hull health, subsystem state). HUD display may need work. |
| Waypoint / objective marker | Players must know where to go. No waypoint = lost player. | LOW | EXISTS (navigation readout with bearing + distance). |
| Attitude indicator (pitch/roll) | Cockpit-first game requires this to prevent spatial disorientation. | MEDIUM | EXISTS (attitude indicator module). |

#### Mission Loop

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Clear mission briefing | Players must know what to do before they fly. Even arcade games show objectives. | MEDIUM | PLANNED (in active requirements, not yet built). |
| Objective tracking during mission | Players need to see progress toward goals while flying. | LOW | EXISTS (mission readout with objective status and progress). |
| Mission success/fail determination | The game must be winnable and losable. | LOW | EXISTS (mission director tracks objective completion, fail on destroy). |
| Mission debrief with stats | Players want to see how they did. Stats drive replay motivation. | MEDIUM | PARTIAL (debrief readout type exists, stats tracking exists, UI may need work). |
| Quick restart / replay | Friction between missions kills retention. Must be fast. | LOW | NOT YET. Critical for playability. Mission restart flow needed. |
| Pause menu | Browser game must be pausable. | LOW | PARTIAL (isPaused state exists, UI may be incomplete). |

#### Audio (Minimum)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Rotor sound (doppler/RPM-linked) | The helicopter sound IS the immersion. Silent rotors kill the fantasy. | MEDIUM | NOT YET. Audio hooks exist in architecture but no implementation mentioned. |
| Weapon fire sounds (cannon, missile launch) | Combat without sound feels broken. | MEDIUM | NOT YET. |
| Explosion sounds | Hits and kills need audio punctuation. | LOW | NOT YET. |
| RWR / threat warning audio | The warning tone is as important as the visual. Players react to sound first. | MEDIUM | NOT YET. Audio is table stakes for threat warnings. |
| Engine / ambient sound | Baseline atmosphere. Can be minimal but must exist. | LOW | NOT YET. |

### Differentiators (Competitive Advantage)

Features that set Reign of Rotor apart. Not expected in an indie browser game, but high value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Subsystem damage degradation | Most indie helicopter games use simple HP bars. Degrading engine/rotor/avionics/weapons/sensors creates emergent "limp home" gameplay that LHX fans remember. | HIGH | EXISTS (subsystem health, damage curves, degradation effects). This is a genuine differentiator. Polish and communicate it well. |
| Cockpit-first camera as default | Most browser combat games default to third-person. Cockpit-first with readable HUD is a bold choice that creates immersion competitors skip. | MEDIUM | EXISTS (cockpit camera rig). Must be polished (smoothing, FOV, head bob). |
| In-browser, zero-install experience | No download, no Steam, just click and fly. Unique for this genre depth. | LOW (inherent) | Architecture already browser-first. This IS the positioning. |
| Procedural mission variety (seeded) | Replay value without hand-authored content. Players get different encounters each time. | MEDIUM | EXISTS (seeded mission generation, template rotation, random placement). |
| Escort mission type | Rare in indie helicopter games. Protecting a moving asset adds variety beyond "destroy everything." | HIGH | PLANNED (convoy rail movement, escort objective tracking). |
| Difficulty presets with meaningful tuning | Most indie games offer cosmetic difficulty. Tuning SAM behavior, damage curves, and subsystem degradation per difficulty is substantive. | MEDIUM | EXISTS (easy/normal/hard presets affecting SAM timing, damage multipliers, degradation curves). |
| Power margin / rotor RPM management | Most arcadey games ignore power limits. Showing power margin and RPM creates "sim-feel" without full simulation complexity. | LOW | EXISTS (power system, RPM tracking, warnings). Communicate this clearly in HUD. |
| VRS (Vortex Ring State) warning | Subtle sim detail that rewards skilled pilots. Rarely seen outside DCS/MSFS. Even a simplified version signals depth. | LOW | EXISTS (VRS envelope detection, settling warning). |
| Terrain-based LOS for missile lock | Lock breaking behind terrain rewards terrain masking tactics. Most arcade games ignore this. | MEDIUM | EXISTS (requireLineOfSight on missiles). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but would hurt the project at this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiplayer (co-op or PvP) | "Every game needs multiplayer" | Doubles complexity in networking, sync, matchmaking, hosting. Breaks fixed-timestep determinism assumptions. Indie-killer scope creep. | Focus on single-player replayability via procedural missions and difficulty scaling. Multiplayer is a v2+ conversation after proven single-player loop. |
| Full realistic flight model | Sim purists want blade element theory, VRS physics, autorotation | Months of tuning for a niche within a niche. Browser performance constraints. Alienates 90% of potential players. | Current "sim-feel" approach (forces-based, assists, power management) is the right balance. Add depth gradually (autorotation as advanced option later). |
| Clickable cockpit instruments | Immersion enthusiasts expect interactive cockpits | Massive art and interaction scope. Conflicts with mouse-look camera. DCS already owns this space. | Keep HUD as overlay. Cockpit model is visual backdrop only. |
| Campaign with narrative / branching story | "Games need story" | Content-heavy. Requires writers, cutscenes, save states. Not the core value. | Quick mission generator with stat tracking. Add simple campaign structure (mission sequences) only if loop proves fun. |
| Multiple helicopter types at launch | Variety seems good | Each helicopter needs unique tuning, models, weapon loadouts, cockpit art. Multiplies testing. | Ship with one helicopter tuned perfectly. Add more as post-launch content. |
| Mobile / touch controls | "Browser = mobile too" | Touch controls for helicopter combat are terrible. Split input attention destroys the experience. Performance on mobile GPUs is a separate battle. | Show clear "desktop only" notice. Do not attempt half-working touch. |
| Real-time map / minimap | Seems useful for navigation | Adds UI complexity, reveals enemy positions (reduces RWR value), breaks immersion in cockpit-first game. | Waypoint bearing/distance on HUD. Briefing map before mission. No real-time minimap. |
| Target cycling (next/previous target) | Standard in some combat games | Complicates targeting UX. Current "lock nearest to reticle" is simpler and more intuitive for the cockpit perspective. | Keep reticle-based targeting for MVP. Evaluate cycling only if playtesting reveals target selection frustration. |
| Complex loadout customization | Players want to pick weapons | Each loadout combination needs balancing and testing. Art for different pylons. | Fixed loadout per mission. One cannon, one missile type, one CM type. Loadouts are a v2 feature. |
| Persistent economy / upgrades | Progression hooks | Creates pay-to-win concerns, balance issues, save corruption risk. Distracts from core flight/combat loop. | Track stats and personal bests. Rank/medals as cosmetic progression. No currency or upgrades in MVP. |
| Weather effects (rain, fog, wind) | Atmosphere and realism | Significant rendering work. Wind affects flight physics. Fog changes engagement ranges. Each needs testing and tuning. | Clear-weather MVP. Weather is a post-launch differentiator if added carefully. |

## Feature Dependencies

```
[Terrain Heightmap] ──required-by──> [Flight Physics (ground collision)]
    └──required-by──> [Altimeter AGL]
    └──required-by──> [Terrain LOS Checks]

[Flight Physics]
    └──required-by──> [Cannon System (raycast from heli pose)]
    └──required-by──> [Missile System (launch from heli)]
    └──required-by──> [Crash Damage]
    └──required-by──> [Cockpit Camera]

[Enemy Spawning] ──required-by──> [Mission Director (objective tracking)]
    └──required-by──> [SAM Threat System]
    └──required-by──> [Convoy System]

[SAM Threat System] ──required-by──> [RWR Threat Warnings]
    └──required-by──> [Countermeasure Relevance]

[Missile Lock System] ──required-by──> [Lock HUD Indicator]
    └──required-by──> [Countermeasure Timing]

[Mission Director] ──required-by──> [Mission Briefing Screen]
    └──required-by──> [Mission Debrief Screen]
    └──required-by──> [Mission Stats Tracking]

[Mission Debrief] ──required-by──> [Quick Restart Flow]
    └──required-by──> [Progression Hooks (rank/medals)]

[Damage System] ──required-by──> [Subsystem Degradation HUD]
    └──required-by──> [Fail State (destroyed)]

[Audio Engine] ──required-by──> [Rotor Sound]
    └──required-by──> [Weapon Sounds]
    └──required-by──> [RWR Warning Tone]
    └──required-by──> [Explosion Sounds]

[Mission Briefing] ──enhances──> [Mission Flow (player knows objectives before flying)]

[Subsystem Damage] ──enhances──> [Difficulty Presets (degradation curves)]

[Quick Restart] ──enhances──> [Player Retention (reduces friction)]

[Cockpit Camera Smoothing] ──enhances──> [Player Comfort (reduces nausea)]
```

### Dependency Notes

- **Audio Engine is a prerequisite for all sound**: A basic audio manager (load, play, spatial positioning) must exist before any specific sounds can play. This is a foundational gap.
- **Mission Briefing requires Mission Director**: The briefing screen reads from the mission plan and template data that the director generates.
- **Quick Restart requires Debrief**: The restart button lives on the debrief screen. Both need the full mission lifecycle (init -> active -> complete/fail -> debrief -> restart).
- **Subsystem Degradation HUD requires Damage System**: The subsystem health data exists but the HUD may not yet display it. Players cannot use what they cannot see.
- **RWR warning audio enhances RWR visual**: The visual warning exists but audio is the primary reaction channel for missile threats. Without audio, RWR effectiveness drops significantly.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the core loop works and is fun.

- [x] Helicopter flight with assists -- existing, needs tuning polish
- [x] Cannon + guided missiles + countermeasures -- existing
- [x] SAM/radar enemies with threat progression -- existing
- [x] Mission director with objective tracking -- existing
- [x] Damage system with subsystem degradation -- existing
- [x] Terrain with heightmap streaming -- existing
- [x] Cockpit camera with mouse look -- existing
- [x] Core HUD (altitude, speed, heading, weapons, lock, threats) -- existing
- [ ] Mission briefing screen -- needed, blocks "know what to do"
- [ ] Mission debrief screen -- needed, blocks "know how I did"
- [ ] Quick restart / new mission flow -- needed, blocks replayability
- [ ] Basic audio (rotor, weapons, explosions, RWR tone) -- needed, blocks immersion
- [ ] Escort mission working end-to-end -- needed per 3-template target
- [ ] HUD damage state display -- data exists, display may be missing
- [ ] Pause menu with resume/restart/quit -- needed for browser game

### Add After Validation (v1.x)

Features to add once the core loop is proven fun.

- [ ] Difficulty selection screen -- data exists (easy/normal/hard presets), needs UI
- [ ] Third-person camera option -- architecture supports it, deferred by design
- [ ] More detailed debrief (accuracy %, time bonuses, rating) -- stats tracking exists, extend
- [ ] Rank / medals progression -- cosmetic, display-only, no economy
- [ ] Landing bonus tracking -- altimeter detects landings, hook into debrief scoring
- [ ] Improved VFX (tracers, better explosions, rotor wash) -- polish pass
- [ ] Ambient audio (wind, environment) -- atmosphere layer
- [ ] Terrain LOS missile break feedback -- mechanic exists, needs "lock lost" audio/visual
- [ ] Settings screen (keybinds, audio volume, assist toggles) -- quality of life

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Additional helicopter types -- each needs unique tuning, art, loadout
- [ ] Additional mission templates (beyond 3) -- requires more enemy types/behaviors
- [ ] Weather effects -- rendering and physics implications
- [ ] Night missions with NVG -- shader work, visibility mechanics
- [ ] Simple campaign structure (linked mission sequences) -- content authoring
- [ ] Multiplayer (co-op) -- complete architecture rethink
- [ ] Weapon loadout customization -- balance implications
- [ ] Leaderboards -- server infrastructure
- [ ] Replay system -- needs deterministic capture
- [ ] Autorotation emergency landing -- advanced flight mechanic

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Status |
|---------|------------|---------------------|----------|--------|
| Mission briefing screen | HIGH | MEDIUM | P1 | Not built |
| Mission debrief screen | HIGH | MEDIUM | P1 | Partial |
| Quick restart flow | HIGH | LOW | P1 | Not built |
| Basic audio (rotor, weapons, RWR) | HIGH | HIGH | P1 | Not built |
| Escort mission end-to-end | HIGH | MEDIUM | P1 | Partial |
| HUD damage state display | MEDIUM | LOW | P1 | Unclear |
| Pause menu | HIGH | LOW | P1 | Partial |
| Cockpit camera polish (smoothing) | MEDIUM | MEDIUM | P1 | Needs tuning |
| Difficulty selection UI | MEDIUM | LOW | P2 | Not built |
| Third-person camera | MEDIUM | MEDIUM | P2 | Deferred |
| Detailed debrief (accuracy, rating) | MEDIUM | LOW | P2 | Not built |
| Rank/medals cosmetic progression | LOW | MEDIUM | P2 | Not built |
| Settings screen | MEDIUM | MEDIUM | P2 | Not built |
| Additional mission templates | MEDIUM | MEDIUM | P3 | Future |
| Multiple helicopter types | MEDIUM | HIGH | P3 | Future |
| Weather effects | LOW | HIGH | P3 | Future |
| Campaign structure | MEDIUM | HIGH | P3 | Future |

## Competitor Feature Analysis

| Feature | LHX: Attack Chopper (1990) | Comanche Series (1992-2001) | Apache Air Assault (2010) | DCS: Black Shark (2008+) | Reign of Rotor Approach |
|---------|---------------------------|----------------------------|--------------------------|--------------------------|------------------------|
| Flight model | Forces-based, simplified | Sim-lite with assists | Arcade with sim mode | Full simulation | Forces-based with assists (sim-feel, arcade-accessible) |
| Camera | Cockpit + external | Cockpit + chase | Third-person default | Cockpit-first | Cockpit-first (differentiator for browser game) |
| Weapons | Gun + missiles + rockets | Gun + missiles + rockets + Stinger | Gun + missiles + rockets | Full realistic loadout | Gun + missiles (focused, not bloated) |
| Countermeasures | Chaff/flares | Chaff/flares | Flares | Full ECM suite | Flares/chaff simplified (correct scope) |
| Threat warning | Basic RWR | RWR with directional | Simplified RWR | Full RWR panel | RWR with scan/lock/launch levels (good scope) |
| Damage model | Binary (hit/destroyed) | Subsystem damage | Zone damage | Full subsystem simulation | Subsystem degradation (differentiator vs most indie) |
| Mission structure | Briefing -> fly -> debrief | Briefing -> fly -> debrief | Mission select -> fly -> score | Full mission planner | Briefing -> fly -> debrief (genre standard) |
| Mission types | Strike, escort, recon | Strike, escort, recon, SAR | Strike, escort | Everything | Strike, radar sweep, escort (focused 3 templates) |
| Progression | Rank advancement | Campaign unlocks | Score/stars | None (sandbox sim) | Stats + cosmetic rank (MVP), expandable |
| Platform | DOS | PC | Console | PC | Browser (unique positioning) |

## Sources

- LHX: Attack Chopper (Electronic Arts, 1990) -- primary inspiration. Training data knowledge of mission structure, RWR, flight feel.
- Comanche series (NovaLogic, 1992-2001) -- established helicopter combat conventions. Training data knowledge.
- Apache Air Assault (Gaijin Entertainment, 2010) -- modern console helicopter combat. Training data knowledge.
- DCS: Black Shark/AH-64D (Eagle Dynamics) -- full sim reference point. Training data knowledge.
- Gunship (MicroProse, 1986-2000) -- genre pioneer. Training data knowledge.
- Enemy Engaged series (Razorworks, 1998-2000) -- open-world helicopter combat. Training data knowledge.
- Project analysis: Existing codebase at `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/` -- HIGH confidence on existing feature state.

**Confidence note:** All competitor analysis and genre expectations are from training data (no WebSearch available). Confidence is MEDIUM for genre conventions (well-established genre with stable expectations) and HIGH for existing codebase analysis (direct code inspection).

---
*Feature research for: Browser helicopter combat game*
*Researched: 2026-02-08*
