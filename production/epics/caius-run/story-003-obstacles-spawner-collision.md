# Story 003: Obstacles, spawner, speed ramp and collision

> **Epic**: Caius Run
> **Status**: Complete
> **Layer**: Core
> **Type**: Logic
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-05

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 3`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [x] Crates are tall and fill one lane; jumping does not clear them, so the dog must switch lanes.
- [x] Logs and cones are low; a jump at the right time clears them, running into one grounded is a hit.
- [x] Obstacles spawn at the horizon, move toward the camera at current speed, scale up through the projection function, and despawn once behind the camera.
- [x] Spawner works in rows. Every row leaves at least one lane passable (clear, or low obstacle only); a row never has crates in all 3 lanes.
- [x] Reachability: each row's passable lane is within one lane of a passable lane in the previous row, and row spacing in time is at least lane-slide time + margin, so a path always exists.
- [x] Speed ramps up gradually from a base value to a cap; obstacle density rises with time survived (shorter gaps, more obstacles per row) without breaking the fairness rules.
- [x] Collision between Caius (lane, depth, height) and an obstacle triggers a single `onCrash` event; the run state stops advancing.
- [x] A crash is never unfair: a self-check generating thousands of rows at max difficulty finds a valid path every time.

---

## Implementation Notes

- Spawner as a pure, seedable function `generateRow(prevPassable, difficulty, rng)`; makes the fairness check a cheap console self-test.
- Hitbox is a lane + depth window + height test; share the projection from story 001.
- Low-obstacle clear needs jump airtime > time spent overlapping the obstacle at max speed; tune `CONFIG` so this holds at the speed cap.
- Placeholder obstacle shapes (flat rectangles/triangles) are fine; final look in story 006.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 004: score, screens, restart.
- Story 005: treats.
- Story 007: crash shake.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Logic
**Required evidence**:
- Logic: automated test waived at `qa.level: minimal` (advisory). Verify by hand on a phone or devtools device emulation; `tests/unit/caius-run/obstacles-spawner-collision_test.*` optional.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: Story 001, Story 002
- Unlocks: Story 004, Story 005, Story 006

---

## Completion Notes
**Completed**: 2026-10-05
**Criteria**: 8/8 passing
**Deviations**: Advisory — retuned story 001/002 values so obstacles are readable in time: speed now 2.5 → 4.8 z/s (was a fixed 9, which gave ~0.3 s of warning), stride decoupled from speed. Crate drawing is centred on its hitbox depth.
**Test Evidence**: Logic: test waived at `qa.level: minimal`; `node tools/qa/cdp-check.mjs obstacles-spawner-collision` 26/26 PASS (fairness self-test over 120,000 generated rows, hit tests, live jump-over at base and max speed, live crash). Log + 3 screenshots in `production/qa/evidence/obstacles-spawner-collision/`. Also closes story 002's deferred "jump clears a low obstacle" criterion.
**Code Review**: Skipped — solo mode
