# PHASE 1 WIREFRAMES — Reign of Rotor (Browser) (MVP)

Visual style: low-poly modern indie  
Default camera: cockpit-first  
Input: keyboard + mouse  
Mission completion: allowed in-air once objectives are met (landing optional)

---

## 0) Boot / Loading Screen

    +--------------------------------------------------------------+
    | REIGN OF ROTOR                                               |
    |--------------------------------------------------------------|
    | Loading assets...                                            |
    | [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  38%                |
    |                                                              |
    | Tip: Press H to toggle assists (Stability / Hover)           |
    | Tip: Missiles require lock time; use terrain to break lock.  |
    |                                                              |
    | [Loading log / short status]                                 |
    +--------------------------------------------------------------+

Notes:
- Minimal, fast. Show helpful tips.

---

## 1) Main Menu

    +--------------------------------------------------------------+
    | REIGN OF ROTOR                                               |
    |--------------------------------------------------------------|
    |  [START QUICK MISSION]                                       |
    |  [TRAINING (Optional MVP)]                                   |
    |  [PILOT LOG]                                                 |
    |  [SETTINGS]                                                  |
    |  [CREDITS]                                                   |
    |  [QUIT]                                                      |
    |--------------------------------------------------------------|
    | Footer: Version • Build hash • FPS (dev only)                |
    +--------------------------------------------------------------+

Notes:
- “Start Quick Mission” is primary CTA.
- Training can be hidden behind a dev flag.

---

## 2) Pilot Log (Lightweight MVP)

    +--------------------------------------------------------------+
    | PILOT LOG                                                    |
    |--------------------------------------------------------------|
    | Pilot: [Name__________]   Callsign: [_____ ]   [EDIT]        |
    |--------------------------------------------------------------|
    | Career Stats:                                                |
    | - Missions flown: 12                                         |
    | - Success rate: 75%                                          |
    | - Total flight time: 01:43:22                                |
    | - Kills: 38 (Vehicles 28 / SAM 6 / Air 4)                    |
    | - Damage taken: Medium avg                                   |
    |--------------------------------------------------------------|
    | Recent Missions:                                             |
    | 1) Convoy Strike — Success — 06:12 — 8 kills                 |
    | 2) Destroy Radar — Fail — 03:40 — shot down by SAM           |
    | 3) Escort — Success — 09:05 — 0 ally losses                  |
    |--------------------------------------------------------------|
    | [BACK]                                                       |
    +--------------------------------------------------------------+

---

## 3) Settings

### 3.1 Controls (KB+Mouse-first)

    +--------------------------------------------------------------+
    | SETTINGS > CONTROLS                                          |
    |--------------------------------------------------------------|
    | Mouse:                                                       |
    |  - Look (cockpit): [ON/OFF]  Pointer Lock: [ON/OFF]          |
    |  - Sensitivity:  [---|-----]                                 |
    |--------------------------------------------------------------|
    | Keybinds:                                                    |
    |  Collective Up/Down:   [R] / [F]                             |
    |  Pitch Forward/Back:   [W] / [S]                             |
    |  Roll Left/Right:      [A] / [D]                             |
    |  Yaw Left/Right:       [Q] / [E]                             |
    |  Fire Cannon:          [Left Mouse]                          |
    |  Fire Missile:         [Right Mouse]                         |
    |  Countermeasure:       [Space]                               |
    |  Switch Weapon:        [Tab]                                 |
    |  Toggle Assists Panel: [H]                                   |
    |--------------------------------------------------------------|
    | [RESET DEFAULTS]                         [BACK]              |
    +--------------------------------------------------------------+

### 3.2 Gameplay / Difficulty (Arcade-but-hardcore)

    +--------------------------------------------------------------+
    | SETTINGS > GAMEPLAY                                          |
    |--------------------------------------------------------------|
    | Difficulty Preset:  ( ) Easy  (•) Normal  ( ) Hard           |
    |--------------------------------------------------------------|
    | Damage Model:          [---|-----]  (Arcade <-> Hardcore)    |
    | Enemy Accuracy:        [---|-----]                           |
    | Missile Lock Speed:    [---|-----]                           |
    | Countermeasure Power:  [---|-----]                           |
    |--------------------------------------------------------------|
    | Assists (default):                                           |
    |  Stability Assist:   [ON/OFF]                                |
    |  Hover Assist:       [ON/OFF]                                |
    |--------------------------------------------------------------|
    | [BACK]                                                       |
    +--------------------------------------------------------------+

### 3.3 Graphics

    +--------------------------------------------------------------+
    | SETTINGS > GRAPHICS                                          |
    |--------------------------------------------------------------|
    | Quality:      (•) Low  ( ) Medium  ( ) High                  |
    | Resolution:   [Auto v]                                       |
    | Shadows:      [OFF/LOW/MED]                                  |
    | Effects:      [---|-----]   (particles intensity)            |
    | Fog:          [ON/OFF]                                       |
    |--------------------------------------------------------------|
    | [BACK]                                                       |
    +--------------------------------------------------------------+

---

## 4) Quick Mission Setup (Optional Screen)

    +--------------------------------------------------------------+
    | QUICK MISSION SETUP                                          |
    |--------------------------------------------------------------|
    | Theater:     [DESERT (MVP) v]                                |
    | Mission Type:[Random v]  (Convoy / Radar / Escort / Random)  |
    | Time:        [Dusk v] (Day/Dusk/Night optional)              |
    | Difficulty:  [Normal v]                                      |
    | Seed:        [Auto] (or numeric)                             |
    |--------------------------------------------------------------|
    | Helicopter:  [LHX PROTOTYPE v]                               |
    | Loadout:     Cannon + 4 Missiles + 6 Flares                  |
    |--------------------------------------------------------------|
    | [START]                                         [BACK]       |
    +--------------------------------------------------------------+

Notes:
- MVP can skip this screen and go straight to briefing with a random seed.

---

## 5) Mission Briefing

    +--------------------------------------------------------------+
    | MISSION BRIEFING                                             |
    |--------------------------------------------------------------|
    | Mission: CONVOY STRIKE                                       |
    | Primary Objectives:                                          |
    |  [ ] Destroy convoy trucks (0/6)                             |
    |  [ ] Neutralize escort unit (0/1)                            |
    | Optional:                                                    |
    |  ( ) Land at base after completion (bonus hook)              |
    |--------------------------------------------------------------|
    | Map (top-down):                                              |
    |  +-------------------------------+                           |
    |  | BASE  ->  WP1  ->  TARGET     |                           |
    |  |   ^          !SAM?            |                           |
    |  | (you)         (threat zone)   |                           |
    |  +-------------------------------+                           |
    | Legend: Base ▣  Waypoint ○  Objective ✖  Threat ~~~          |
    |--------------------------------------------------------------|
    | Intel: Radar activity detected near target.                  |
    | Tips: Stay low, use terrain to break lock.                   |
    |--------------------------------------------------------------|
    | [LAUNCH]                                     [BACK]          |
    +--------------------------------------------------------------+

---

## 6) In-Mission HUD (Cockpit-First)

### 6.1 Cockpit View + Overlay HUD

(3D cockpit view / windshield)

    +------------------------------------------------------------------+
    | THREATS: [RADAR] [LOCK] [LAUNCH!]                     FPS (dev)  |
    |------------------------------------------------------------------|
    | OBJ: Convoy Strike  Trucks: 2/6    Escort: 0/1                   |
    |------------------------------------------------------------------|
    |               [Target Box]                                       |
    |                 (RETICLE)                                        |
    |                                                                  |
    |  Left HUD:                                Right HUD:             |
    |  +--------------------+                  +--------------------+  |
    |  | SPD  142 km/h      |                  | WEAP: MISSILE      |  |
    |  | ALT  120 m AGL     |                  | AMMO: 3            |  |
    |  | HDG  087°          |                  | LOCK: ACQ 1.2s     |  |
    |  | V/S  +3.1 m/s      |                  | CM: FLARES 4       |  |
    |  +--------------------+                  +--------------------+  |
    |                                                                  |
    |  Bottom-left: Radar/Minimap                                      |
    |  +------------------------------+                                |
    |  |   ○ WP1         ✖ TARGET     |                                |
    |  |        ~~~ threat zone       |                                |
    |  |   ▣ BASE                   ^ | (player arrow)                 |
    |  +------------------------------+                                |
    |                                                                  |
    |  Bottom center: Status + assists                                 |
    |  DMG: ENG 100% ROT 100% AV 100% WPN 100% SNS 100%                |
    |  ASSISTS: [STAB ON] [HOVER ON]                                   |
    +------------------------------------------------------------------+

Key behaviors:
- Threat banner escalates: RADAR → LOCK → LAUNCH! (distinct audio + visual).
- Objective counters always visible in small form.
- Lock indicator shows acquire time remaining.

### 6.2 Pause Menu (In-mission)

    +--------------------------------------------------------------+
    | PAUSED                                                       |
    |--------------------------------------------------------------|
    |  [RESUME]                                                    |
    |  [RESTART MISSION]                                           |
    |  [SETTINGS]                                                  |
    |  [EXIT TO MENU]                                              |
    |--------------------------------------------------------------|
    | Tip: Mission can be completed in-air after objectives.       |
    +--------------------------------------------------------------+

---

## 7) Mission Completion Prompt (In-air allowed)

    +--------------------------------------------------------------+
    | OBJECTIVES COMPLETE                                          |
    |--------------------------------------------------------------|
    | Primary objectives achieved.                                 |
    |                                                              |
    | [COMPLETE MISSION NOW]   [CONTINUE FLYING]                   |
    |                                                              |
    | Optional bonus: Land at base for extra score (future hook).  |
    +--------------------------------------------------------------+

Notes:
- Don’t force the player to find base in MVP; allow “complete now”.

---

## 8) Mission Failed Screen (Quick feedback)

    +--------------------------------------------------------------+
    | MISSION FAILED                                               |
    |--------------------------------------------------------------|
    | Cause: Shot down by SAM (missile impact)                     |
    | Time: 04:12                                                  |
    | Objectives: Trucks 2/6, Escort 0/1                           |
    |--------------------------------------------------------------|
    | [RETRY]                                   [EXIT TO MENU]     |
    +--------------------------------------------------------------+

---

## 9) Debrief Screen (Mission End)

    +--------------------------------------------------------------+
    | DEBRIEF                                                      |
    |--------------------------------------------------------------|
    | Result: SUCCESS                                              |
    | Mission: Destroy Radar Site                                  |
    | Duration: 07:48                                              |
    |--------------------------------------------------------------|
    | Objectives:                                                  |
    |  [✓] Destroy radar site                                      |
    |  [✓] Destroy SAM launcher                                    |
    |  [ ] Optional: Land at base (bonus hook)                     |
    |--------------------------------------------------------------|
    | Combat Stats:                                                |
    | - Kills: 10 (Vehicles 8 / SAM 2)                             |
    | - Cannon: 420 fired / 38 hits (9%)                           |
    | - Missiles: 4 launched / 3 hits                              |
    | - Countermeasures used: 3                                    |
    |--------------------------------------------------------------|
    | Damage Report:                                               |
    | - Engine: 85%  Rotor: 92%  Avionics: 100%                    |
    | - Weapons: 100% Sensors: 75% (RWR degraded late mission)     |
    |--------------------------------------------------------------|
    | [PLAY AGAIN (NEW SEED)]   [REPLAY SAME SEED]   [MENU]        |
    +--------------------------------------------------------------+

---

## 10) Optional: Minimal Training Screen (If included)

    +--------------------------------------------------------------+
    | TRAINING                                                     |
    |--------------------------------------------------------------|
    | Lessons:                                                     |
    |  [ ] Takeoff & Hover                                         |
    |  [ ] Basic Navigation (waypoints, heading)                   |
    |  [ ] Cannon Practice                                         |
    |  [ ] Missile Lock & Launch                                   |
    |  [ ] SAM Evasion + Countermeasures                           |
    |--------------------------------------------------------------|
    | [START SELECTED]                                [BACK]       |
    +--------------------------------------------------------------+

---

## Screen-to-screen navigation map (MVP)

    Boot/Loading
      -> Main Menu
          -> Quick Mission Setup (optional) -> Mission Briefing -> In-Mission
          -> Settings ------------------------^
          -> Pilot Log
          -> Credits
          -> Quit

    In-Mission
      -> Pause Menu -> Settings
      -> Objectives Complete Prompt -> Debrief
      -> Mission Failed -> Retry -> Mission Briefing

---

## MVP UI/UX notes (to reduce rework)
- Cockpit HUD must be minimal: objective counters + threat state + weapon state.
- Provide strong LAUNCH! warning (audio + visual) to reduce frustration.
- Allow mission completion in-air via a single prompt to keep pacing tight.
- Prefer “Replay same seed” for balancing and testing.
- Low-poly silhouettes must be readable: SAM sites and radar towers stand out at range.
