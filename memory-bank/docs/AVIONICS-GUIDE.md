# 3D Video Game Helicopter Controls & Avionics Design Guide (Keyboard/Mouse + Gamepad)

This guide targets senior engineers building helicopter flight + avionics for a 3D game (sim-lite to sim-leaning). It focuses on **control mapping**, **flight physics**, **stability/assists**, and **avionics**—with specific attention to **Keyboard+Mouse vs Gamepad**.

---

## 1) Design Goals and “Feel” Targets

### 1.1 Pick your realism band early
You can mix, but be explicit because it affects everything (tuning, UI, assists, QA).
- **Arcade**: stable, forgiving, high authority controls, simplified rotor/ETL/VRS, minimal trim.
- **Sim-lite**: core rotor behaviors + translational lift + torque + basic VRS cues; assisted stabilization.
- **Sim-leaning**: rotor disk dynamics, ETL, retreating blade effects (light), VRS modeling, governor logic, trim, mass/inertia, nuanced control saturation.

### 1.2 Player-facing outcomes
Regardless of realism:
- **Predictability**: inputs lead to consistent response (no surprise flips).
- **Recoverability**: mistakes are survivable (unless deliberately hardcore).
- **Readable energy state**: player understands “why” (UI cues + audio + motion).
- **Input parity**: K/M and gamepad both feel competent, but each uses different abstractions.

---

## 2) Control Surfaces and What They Mean in Code

Helicopter pilot inputs are usually:
- **Collective**: changes rotor blade pitch collectively → changes lift and induced drag → affects climb + power demand.
- **Cyclic (pitch/roll)**: tilts rotor disk → accelerates in desired direction.
- **Anti-torque pedals (yaw)**: tail rotor thrust or NOTAR → counters main rotor torque + commands yaw.
- **Throttle/governor** (varies): in many modern helos, pilot sets “power lever” and a governor holds RPM.

### 2.1 Recommended internal “control state”
Represent all player inputs in a normalized control structure:
- `collective ∈ [0..1]`
- `cyclic_x ∈ [-1..1]` (roll)
- `cyclic_y ∈ [-1..1]` (pitch)
- `yaw ∈ [-1..1]` (pedals)
- optional: `trim_cyclic_x/y`, `trim_yaw`, `governor_enabled`, `power_limit_mode`, etc.

Then map device-specific input → this structure.

---

## 3) Input Mapping by Device

## 3.1 Keyboard + Mouse (K/M)

K/M is inherently “digital + relative” (keys are on/off; mouse is delta-based). The trick is to **build an analog virtual stick** with good centering and rate limits.

### 3.1.1 Virtual cyclic (mouse)
Two common patterns:

**A) Mouse-as-stick (recommended for helo)**
- Mouse position relative to screen center drives cyclic.
- Uses **soft zone** near center + **max deflection clamp**.
- Good for hovering and precision.

Implementation notes:
- Convert cursor offset to normalized cyclic deflection:
  - `cyclic = clamp(offset / radius, -1..1)`
- Apply response curve (expo) and smoothing (see Section 4).
- Optional “recenter” key or auto-recenter when mouse stops (configurable).

**B) Mouse-as-rate**
- Mouse delta commands angular rate, not stick deflection.
- Feels like FPS freelook; can be easier initially but harder to hover precisely.

If you choose rate mode, introduce:
- rate limits
- auto-level assist (or else it becomes twitchy)

### 3.1.2 Collective (keys or wheel)
Options:
- `W/S` step collective up/down with **ramp** (not instant).
- Mouse wheel adjusts collective slowly (great for hover).
- Include “hold to increase” with acceleration:
  - small dt: small changes
  - long hold: faster changes (configurable)

### 3.1.3 Yaw (A/D or Q/E)
Yaw is extremely sensitive. Digital keys need a **yaw rate controller**:
- Keys command **desired yaw rate** (deg/s), not direct pedal deflection, OR
- Keys command pedal deflection with aggressive smoothing and rate limits.

For sim-lite, yaw-rate controller feels better on K/M.

### 3.1.4 Hover/trim helpers for K/M
- Toggle “hover hold” (velocity hold + altitude hold) as accessibility.
- “Trim” key that stores current cyclic neutral, so mouse center doesn’t equal “level disk.”

---

## 3.2 Gamepad (Xbox/PlayStation)

Gamepad provides **two analog sticks + triggers**; it is ideal for helo because cyclic and yaw can be true analog.

### 3.2.1 Suggested default layout (common and learnable)
- **Left stick**: yaw (X) + collective (Y)  
  - Up = more collective, down = less
- **Right stick**: cyclic pitch/roll  
  - Up = nose down / forward accel (choose consistent convention)
- **Triggers**: optional fine collective, weapons, or “precision mode”
- **Bumpers**: trim left/right or yaw trim
- **D-pad**: avionics pages, autopilot modes, countermeasures

Alternate layout:
- **Triggers** = collective (LT decrease, RT increase) with center dead zone
- **Left stick X** = yaw, **Right stick** = cyclic

### 3.2.2 Dead zones and anti-drift
- Apply **hardware dead zone** (small) to avoid stick drift.
- Add **axial dead zone** (optional) to prevent unintended diagonal.
- Implement **outer dead zone / saturation** to guarantee full authority near extremes.

### 3.2.3 “Precision mode”
A must-have for gamepad hover:
- While holding a button, reduce cyclic sensitivity and yaw rate.
- You can also increase stabilization (Section 5) in this mode.

---

## 4) Input Processing: Curves, Filtering, and Rate Limits

### 4.1 Response curves (expo)
Helos need gentle center, strong edges:
- Use expo curve:
  - `out = sign(x) * |x|^γ`, γ in ~[1.5..2.5] (tunable per axis)
- Separate curves by axis:
  - yaw often needs more expo than cyclic
  - collective usually linear-ish

### 4.2 Smoothing (critical damping)
Use a simple critically damped filter or exponential smoothing:
- `x_filtered = lerp(x_filtered, x_target, 1 - exp(-dt/τ))`
- Separate τ for each axis and device:
  - K/M cyclic: τ small to medium (avoid latency)
  - keyboard yaw: τ larger to avoid jerky spins
  - collective: τ medium for “spool feel”

### 4.3 Rate limiting (slew)
Limit change per second:
- cyclic and yaw should not jump instantly (especially with keys).
- Example:
  - `x += clamp(target - x, -rate*dt, rate*dt)`

### 4.4 Authority blending and saturation
When near max collective, you may have reduced cyclic authority (power-limited). Simulate this as:
- effective cyclic scale decreases as power margin shrinks
- helps avoid unrealistic “full lift + full accel + full yaw” at once

---

## 5) Flight Physics: What to Model (and What to Approximate)

The minimal helicopter “truth” is:
- Rotor produces lift roughly proportional to **collective** and rotor inflow state.
- Tilting the rotor disk redirects lift vector → acceleration.
- Main rotor torque causes yaw opposite rotation; tail rotor counters torque.
- Helicopter is *inherently unstable*; stabilization must be designed for gameplay.

### 5.1 Core state variables
Maintain at least:
- body linear velocity `v_world`
- angular velocity `ω_body`
- attitude `q_body`
- rotor RPM `Ω`
- engine power available `P_avail` and required `P_req`
- aerodynamic “airflow” at rotor: relative wind at rotor hub

### 5.2 Forces and moments (recommended decomposition)
Compute in this order per tick:

1) **Rotor thrust vector**
- Magnitude `T` from collective, RPM, density, inflow approximation.
- Direction = body up axis rotated by cyclic-induced disk tilt.

2) **Main rotor torque**
- `τ_main` proportional to power transmitted to rotor:
  - `P = τ * Ω` → `τ = P / Ω`
- Apply yaw moment opposite rotor direction.

3) **Tail rotor / anti-torque**
- Tail rotor thrust `T_tail` from yaw input and available power.
- Add yaw moment around body up axis (or tail boom axis approximation).

4) **Fuselage drag**
- Quadratic drag:
  - `F_drag = -0.5 * ρ * CdA * |v| * v`
- Use different CdA for forward, lateral, vertical if you want better “feel”.

5) **Translational lift (ETL) approximation**
- When forward airspeed increases past ~15–25 kts, rotor becomes more efficient → same collective yields more lift or less power required.
- Implement as efficiency multiplier on `T` or reduction on induced power term:
  - `eff = 1 + k * smoothstep(v, v0, v1)`

6) **Ground effect**
- Within ~1 rotor diameter altitude, lift increases / power required decreases.
- Add factor based on height above ground.

7) **Stability derivatives (optional)**
- Add mild weather-vaning and roll damping to prevent “ice skating.”

### 5.3 VRS (Vortex Ring State) and settling with power (optional but powerful)
Players love when the helo “talks back”:
- If vertical descent is high and forward speed is low while collective high:
  - reduce lift abruptly + add vibration + sluggish controls
- Provide recovery:
  - lower collective and gain forward airspeed

### 5.4 Retreating blade stall (optional, very light)
At high forward speeds:
- induce roll/pitch instability and reduced lift
- clamp top speed so the model doesn’t need to fully simulate blade dynamics

---

## 6) Stabilization, Autopilot, and Assists (Make It Flyable)

A stable, enjoyable helicopter game usually needs **control laws** on top of physics.

### 6.1 Three-tier assist architecture
1) **Raw mode**: minimal damping; for hardcore.
2) **Damped mode**: angular rate damping + auto-trim.
3) **Assisted mode**: attitude hold + yaw hold + optional velocity hold.

Expose as:
- preset difficulty
- per-axis sliders (cyclic stability, yaw stability, hover assist)

### 6.2 Damping (baseline, should always exist)
Add angular damping torque:
- `τ_damp = -Kω * ω_body`
Tuned per axis:
- roll/pitch damping moderate
- yaw damping strong on K/M

### 6.3 Rate command vs attitude command
- **Gamepad** often works well as **rate command** (stick commands angular rates).
- **Mouse-as-stick** often works well as **attitude command** (mouse position maps to target pitch/roll angles).
You can implement both and choose per device:
- K/M: attitude hold with limited max tilt.
- Gamepad: rate command with damping.

### 6.4 Trim model
Helos require constant micro-corrections. Provide a trim system:
- “Force trim” key: set current cyclic center offsets
- For gamepad: trim hat/d-pad fine adjustments
- For K/M: store offsets so center means “current hover neutral.”

### 6.5 Hover hold (optional but recommended)
Hover hold can be a controller:
- hold horizontal velocity to zero
- hold altitude or vertical speed
- keep yaw heading
Implementation:
- PID on `v_horizontal`, `v_vertical`, `heading`
- outputs are desired cyclic, collective, yaw commands (limited)

Important: clamp and blend hover hold so it feels like “assistance,” not takeover.

---

## 7) Engine, Rotor RPM, and Power Limits

### 7.1 Rotor RPM (governor)
Common helo setup: pilot changes collective; governor adjusts throttle to hold RPM.
Implementation simplification:
- Model RPM with inertia + governor:
  - `dΩ/dt = (τ_engine - τ_load)/I_rotor`
- `τ_engine` limited by engine power and spool dynamics.
- `τ_load` rises with collective and airflow (induced drag).

### 7.2 Power available vs required
To create believable performance:
- Compute required power from lift and drag approximations.
- If `P_req > P_avail`:
  - rotor RPM droops
  - lift decreases
  - yaw authority decreases (tail rotor power-limited)
This creates a natural “don’t yank collective + yaw + accelerate all at once.”

### 7.3 Translating this to gameplay
- Provide audible cues (RPM droop, engine strain).
- Provide UI cue: “POWER LIMIT” or “TORQUE” bar nearing redline.

---

## 8) Avionics and UI: What to Show (and Why)

Even in non-sim, avionics add clarity and mastery.

### 8.1 Minimal instrument set (works for most games)
- **Airspeed** (IAS)
- **Altitude** (baro + radar alt near ground if desired)
- **Vertical speed**
- **Heading** (compass/HSI)
- **Attitude indicator** (pitch/roll)
- **Torque / power** indicator
- **Rotor RPM** and **engine RPM** (can be combined)
- **Fuel** (and optionally fuel flow)

### 8.2 Navigation (lite)
- Simple **waypoint** + bearing + distance
- Optional moving map (diegetic MFD or HUD)

### 8.3 Weapon/mission avionics (if applicable)
- Master arm, weapon select, ammo
- Targeting reticle stabilized to aircraft or horizon
- Laser designator status, range (optional)
- Countermeasures: flare/chaff count, dispenser mode

### 8.4 Alerting and feedback (the “why did I crash?” layer)
- “LOW ROTOR RPM”
- “VRS / SETTLING” (if modeled)
- “OVERSPEED” / “HIGH TORQUE”
- “BANK ANGLE” / “PITCH” warning (if you enforce limits)

Keep alerts:
- short, consistent, prioritized
- device-specific: gamepad players benefit from stronger haptics + audio

---

## 9) Camera and Perception Considerations

Helicopter control is as much about **visual cues** as physics.

### 9.1 External camera
- Include subtle lead/lag and damping so motion reads.
- Avoid camera roll overdoing (motion sickness + loss of reference).
- Provide “hover camera” option that gently stabilizes horizon.

### 9.2 Cockpit camera
- Head bob and vibration should communicate RPM/VRS but not obscure aiming.
- For K/M, avoid camera coupling that fights mouse aim.

---

## 10) Tuning Workflow and Debug Instrumentation

### 10.1 Must-have debug overlays
- current input values (raw and filtered)
- target vs actual attitude/rates (if assisted)
- rotor thrust vector visualization
- power margin (P_avail - P_req)
- ETL/ground-effect/VRS state flags
- effective control authority scaling

### 10.2 Test maneuvers (automate if possible)
- hover capture and hold (hands-off drift)
- pedal turn in hover
- acceleration to cruise and decel to hover
- max climb at various weights
- vortex ring entry and recovery (if modeled)
- power-limited yaw authority at high collective

### 10.3 Device parity tests
- Create standardized “input scripts”:
  - same intended maneuver from K/M and gamepad
  - compare performance envelope and error bands

---

## 11) Recommended Defaults (Practical Starting Point)

### Keyboard + Mouse (sim-lite default)
- Mouse-as-stick cyclic with:
  - small dead zone
  - expo ~2.0
  - light smoothing τ ~ 50–90 ms
- Collective on W/S with ramp + mouse wheel fine
- Yaw keys command yaw-rate with strong smoothing
- Assisted mode:
  - attitude hold (limited tilt)
  - yaw heading hold
  - mild hover damping

### Gamepad (sim-lite default)
- Right stick = cyclic rate command with expo ~1.7
- Left stick X = yaw rate, Y = collective
- Precision mode button:
  - halves rate limits
  - increases damping
- Assist:
  - rate damping always on
  - optional attitude hold when sticks near center

---

## 12) Engineering Notes: Separation of Concerns

A robust structure:
- **Input Layer**: device bindings → normalized control state
- **Control Law Layer** (optional): assists/trim/holds → actuator commands
- **Flight Model**: computes forces/moments from actuators + state
- **Avionics/UI**: reads state, generates cues; no direct physics writes
- **Replay/Determinism**: log normalized inputs + random seeds; step fixed dt

If you do networked play:
- replicate input + authoritative physics server-side
- keep avionics mostly client-side rendering, but critical warnings derived from authoritative state

---

## 13) Common Pitfalls (and Fixes)

- **“Helicopter feels like a plane”**: cyclic should tilt lift vector immediately; add proper torque/yaw coupling and hover instability.
- **Yaw is uncontrollable on keys**: switch to yaw-rate controller + heavy smoothing.
- **Hover is impossible**: add damping + trim + precision mode; ensure ETL and ground effect aren’t exaggerated.
- **Full collective doesn’t change much**: check power model and rotor thrust scaling; ensure weight and drag are realistic.
- **Players can do impossible maneuvers**: enforce power margin + RPM droop + control authority reduction.

---

## 14) Glossary (Quick)
- **ETL (Effective Translational Lift)**: efficiency increase when moving forward.
- **VRS (Vortex Ring State)**: rotor recirculates downwash in steep descent → lift collapses.
- **Governor**: control maintaining rotor RPM.
- **Trim**: offsets neutral controls to reduce constant input effort.
- **Rate command**: input sets desired angular rate.
- **Attitude command**: input sets desired pitch/roll attitude.

---
