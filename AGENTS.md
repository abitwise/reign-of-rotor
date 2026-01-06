# What this service does
A TypeScript/Web game that remakes the classic “LHX: Attack Chopper” feel as a modern indie demo:
- Helicopter flight + combat in a replayable sandbox mission loop.
- Runs fully in a modern browser using Babylon.js (render), Rapier (physics), and bitecs (ECS).

# What agents may change safely vs risky areas
## Safe to change (preferred)
- Pure gameplay logic in `src/sim/**` (mission templates, weapon tuning, AI state machines)
- UI/HUD in `src/ui/**` (HTML overlay, layout, copy)
- Content/config JSON in `src/content/**` and `public/assets/**`
- Tests and tooling in `src/**/__tests__`, `scripts/**`

## Risky (change carefully; add tests + notes)
- Fixed-timestep loop / scheduler (`src/core/loop/**`)
- ECS component schemas (`src/ecs/components/**`) — schema changes ripple everywhere
- Physics stepping + handle mapping (`src/physics/**`) — can break collisions/events
- Render binding layer (`src/render/bindings/**`) — can cause perf regressions or desync

# Where to look first
- Business rules / gameplay invariants: `memory-bank/PRODUCT.md`
- Architecture + key decisions: `memory-bank/ARCHITECTURE.md`
- Contribution manual: `memory-bank/CONTRIBUTING.md`
- Long-term memory: `memory-bank/LONG_TERM_MEMORY.md`
- Work plan, wireframes and specs:
  - `memory-bank/plans/TICKETS.md`
  - `memory-bank/plans/PHASE#-PLAN.md`,
  - `memory-bank/plans/PHASE#-WIREFRAMES.md`
  - `memory-bank/plans/tickets/*`

# PR checklist (agent)
- [ ] Read `memory-bank/PRODUCT.md` and the relevant ticket spec.
- [ ] Keep sim (ECS state) separate from presentation (Babylon/UI).
- [ ] Preserve fixed timestep behavior; don’t make sim depend on render FPS.
- [ ] Update/extend tests for logic or regressions when touching risky areas.
- [ ] Update memory-bank docs if you change contracts, data shapes, or key decisions.
- [ ] Run lint + tests; verify in-browser smoke run.
