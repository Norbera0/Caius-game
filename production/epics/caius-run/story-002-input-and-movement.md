# Story 002: Input, lane slide and jump

> **Epic**: Caius Run
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 2`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [ ] Swipe left / right changes lane by exactly one; lane index is clamped to 0–2; the move is a quick eased slide (~120 ms, tunable).
- [ ] Arrow Left/Right and A/D do the same as swipes.
- [ ] Swipe up, a tap, or Space triggers a jump: gravity arc with tunable height and airtime; no double jump while airborne.
- [ ] Gesture rule: a touch moving beyond a minimum distance (~30 px) is a swipe on its dominant axis; a short touch below that is a tap.
- [ ] One input is buffered during a lane slide so quick consecutive swipes all register.
- [ ] While playing: no page scroll, no pinch/double-tap zoom, no pull-to-refresh (`touch-action: none`, `overscroll-behavior: none`, viewport `user-scalable=no`, `preventDefault` on touch events).
- [ ] Jump clears a low obstacle at the intended spacing (verified against CONFIG values, see story 003).
- [ ] Input works with touch, mouse (desktop testing) and keyboard without double-firing.

---

## Implementation Notes

- Use Pointer Events or touch events with `{ passive: false }` where `preventDefault` is needed.
- Keep gesture classification in one pure function taking (dx, dy, dt) so it is easy to tweak.
- Jump state: `y`, `vy`, `grounded`; integrate with the clamped dt from story 001.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 003: obstacles and collision.
- Story 006: lean/tilt animation.
- Story 007: landing squash.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Logic
**Required evidence**:
- Logic: automated test waived at `qa.level: minimal` (advisory). Verify by hand on a phone or devtools device emulation; `tests/unit/caius-run/input-and-movement_test.*` optional.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: Story 001
- Unlocks: Story 003
