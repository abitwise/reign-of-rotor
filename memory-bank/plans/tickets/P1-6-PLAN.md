# Ticket P1-6 — Keyboard + Mouse Input Mapping (MVP)

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Implement the MVP keyboard and mouse input pipeline, mapping desktop controls into the fixed-step simulation without coupling camera look to flight axes. Provide sensible defaults (WASD/arrow, Q/E yaw, R/F collective) and a mouse-look flow that prefers pointer lock but degrades gracefully when it is unavailable.

## Objectives
- Sample keyboard state separately from sim execution and write the consolidated values once per fixed tick to the player input component.
- Keep mouse-look scoped to the cockpit camera while flight axes remain keyboard-driven.
- Ship default bindings that match the product controls contract and surface them in a lightweight in-game controls helper.

## Deliverables
- Keyboard input sampler + `CPlayerInput` state updated by an `Input` phase system with default bindings for collective, cyclic (pitch/roll), and yaw.
- Mouse-look controller that requests pointer lock on click and falls back to drag-look when lock cannot be acquired.
- Developer-facing controls panel enumerating the current bindings and pointer-lock guidance.

## Notes
- Input sampling stays decoupled from rendering; bindings live centrally so later systems (flight/assist/HUD) can consume them consistently.
- Pointer lock is optional; when denied, holding the mouse still steers the cockpit view via drag-look.
