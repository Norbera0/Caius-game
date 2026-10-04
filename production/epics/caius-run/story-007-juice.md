# Story 007: Game feel: landing squash, crash shake, treat pop

> **Epic**: Caius Run
> **Status**: Complete
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-05

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 7`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [x] Landing from a jump plays a short squash on Caius (about scaleY 0.8 / scaleX 1.15 for ~100 ms) then eases back.
- [x] A crash plays a decaying screen shake (~300 ms) before the Game Over screen shows.
- [x] Picking up a bone plays a small pop (scale pop and/or particles) at the bone.
- [x] Effects are cosmetic only: hitboxes, timing and score are unchanged.
- [x] Game Over appears within ~500 ms of the crash and Try Again is still instant.
- [x] Shake never moves the canvas off-screen or triggers page scroll.
- [x] All effect strengths and durations are in `CONFIG`; 60 fps is held.

---

## Implementation Notes

- Apply shake as a canvas translate on the world layer only; keep UI steady.
- Squash is a transform on the Caius sprite, triggered by the grounded transition in story 002.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Birthday add-on banner and confetti: separate story after MVP.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Visual/Feel
**Required evidence**:
- Visual/Feel: a retained screenshot in `production/qa/evidence/` + sign-off in `production/qa/evidence/juice-evidence.md`. Not waived at `qa.level: minimal`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: Story 004, Story 005, Story 006
- Unlocks: None

---

## Completion Notes
**Completed**: 2026-10-05
**Criteria**: 7/7 passing
**Deviations**: Advisory — added a small bump on the score pill when a treat is collected. Sign-off was given by Claude under the user's delegated autonomous run, not by the user.
**Test Evidence**: Visual/Feel: evidence doc at `production/qa/evidence/juice-evidence.md`, 3 retained screenshots, `cdp-check juice` 12/12 PASS.
**Code Review**: Skipped — solo mode
