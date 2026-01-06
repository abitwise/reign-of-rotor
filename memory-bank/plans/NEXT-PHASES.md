# NEXT_PHASES.md — High-Level Roadmap (Post-MVP)

This file proposes the next phases after **Phase 1 (MVP Demo)**.
Each phase is intentionally high-level but concrete enough to later expand into a dedicated plan + tickets.

Assumptions locked in:
- Browser-first TypeScript game
- Babylon.js + Rapier + bitecs
- Low-poly modern indie visuals
- Cockpit-first camera (with optional chase mode)
- Desktop KB+mouse first; gamepad later

---

## Phase 2 — Feel, UX, and Content Depth (Singleplayer)
### Goals
- Make the game feel “shippable” rather than “prototype”.
- Reduce onboarding friction and improve readability.
- Add a small amount of enemy and mission variety without expanding architecture complexity.

### Key deliverables
- **Chase camera polish**
  - Obstruction avoidance (basic), smoothing, FOV tuning
- **Training / onboarding**
  - 3–5 short lessons: takeoff/hover, navigation, cannon, missiles, SAM evasion
  - End each with a simple success condition + quick restart
- **Enemy variety v2**
  - Add AAA gun emplacement (flak / tracer pressure)
  - Add light enemy helicopter (simple FSM: approach/strafe/retreat)
- **Mission variety modifiers**
  - Time-of-day presets (day/dusk)
  - Fog/visibility presets (low impact)
  - Optional “high radar activity” modifier (more emitters / shorter lock time)
- **Audio and feedback polish**
  - Distinct radar scan/lock/launch cues
  - Impact and near-miss feedback improvements
- **UX polish**
  - Better HUD layout (cockpit-first), color/contrast consistency
  - Replay same seed surfaced more prominently for mastery/testing

### Non-goals
- Persistent campaign map
- Major physics realism expansion

---

## Phase 3 — Progression and Meta Loop (Singleplayer)
### Goals
- Increase replayability and retention with a lightweight meta layer.
- Keep the game data-driven and tunable.

### Key deliverables
- **Pilot progression**
  - Ranks + medals based on performance (accuracy, time, survival, optional landing)
  - Career stats improvements (session summaries, best runs, streaks)
- **Unlocks (low complexity)**
  - Cosmetic unlocks: decals/skins, cockpit trinkets, HUD themes
  - Optional: “loadout variants” as unlocks (missile count vs flares vs armor)
- **Difficulty presets and tuning tooling**
  - Easy/Normal/Hard plus “Hardcore” (optional)
  - Tuning config moved to content files with validation
- **Improved debrief**
  - Highlight what caused damage/failure (“locked too long”, “hit by AAA”, etc.)
  - Recommend training lesson on repeated failure causes (soft guidance)

### Non-goals
- Economy with currencies/shops (avoid bloat)
- Deep repair/maintenance management (unless scoped explicitly)

---

## Phase 4 — Map/Theater Expansion + Scenario Set Pieces
### Goals
- Expand content breadth while keeping systems stable.
- Add “signature moments” (terrain masking, valley runs, radar domes).

### Key deliverables
- **Second theater**
  - Arctic OR jungle (pick one) with distinct visibility + terrain usage
  - Reuse mission templates with theater-specific spawn tables
- **Set pieces**
  - Radar dome facility
  - Valley route / canyon pass encouraging nap-of-the-earth flight
  - Bridge/river crossing as landmark navigation
- **Threat ecology tuning**
  - Terrain masking matters more (LOS on lock/detection becomes standard)
  - Add “soft stealth” gameplay (lower altitude reduces detection probability)

### Non-goals
- Huge open world with dense assets (browser perf risk)

---

## Phase 5 — Multiplayer (Co-op first, then PvP optional)
### Goals
- Add social replayability without destabilizing the sim.
- Start with minimal netcode complexity.

### Recommended approach
- **Co-op (2 players) first**
  - Shared mission instance, shared objectives
  - Friendly fire optional (off by default)
- Keep initial network model conservative:
  - Option A (simpler): authoritative host (one player hosts session)
  - Option B (more robust): dedicated lightweight server (later)

### Key deliverables
- **Lobby + session**
  - Create/join with invite code
  - Ready state + synchronized mission seed/template
- **State replication**
  - Replicate transforms, weapon events, damage events, objective events
  - Client-side interpolation for remote players
- **Anti-desync strategy**
  - Physics authoritative on host; clients treat remote entities as kinematic/replicated
  - Lock-step not required; keep it “arcade-hardcore”, not sim-competitive
- **Co-op UX**
  - Teammate markers + distance
  - Shared objective panel
  - Simple voice/text comms out-of-scope (use external tools)

### PvP (optional later)
- Only after co-op stability and performance are proven.
- Requires much stricter fairness and anti-cheat considerations in browser.

---

## Phase 6 — Mod Packs / Community Scaling (After Multiplayer)
### Goals
- Scale content via data packs and community contributions.
- Keep safety/performance predictable.

### Key deliverables
- **External mission packs**
  - JSON mission templates + spawn tables + tuning overrides
  - Shareable “preset bundles” (seed + theater + modifiers)
- **Validation tooling**
  - Hard limits on spawns, particles, AI count
  - Schema validation + helpful error messages
- **Content discovery**
  - Local import (file drop) for MVP mod support
  - Optional: curated online catalog later

### Non-goals
- Arbitrary scripting language in mods (high risk); prefer declarative configs.

---

## Phase 7 — “Big Bets” (Only if traction)
### Candidates
- VR cockpit mode
- Full interactive cockpit (clickable switches)
- Persistent campaign map / territory control
- Additional helicopters with distinct roles (Apache/utility)
- Advanced damage/repair simulation (maintenance loop)
- Cross-platform input expansion (gamepad-first, accessibility)

---

## Suggested sequencing (high-level)
- Phase 2 (feel + UX) is the best immediate follow-up after MVP.
- Phase 3 (progression) boosts retention with manageable complexity.
- Phase 4 (new theater) expands content once core systems are stable.
- Phase 5 (multiplayer) only after performance and tuning are solid.
- Phase 6 (mod packs) after multiplayer to avoid breaking content/network contracts.
