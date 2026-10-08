# Story 005: Bone treats and bonus points

> **Epic**: Caius Run
> **Status**: Complete
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-05

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 5`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [x] Bones spawn in lines (about 3–8) along one lane, in the gaps between obstacle rows.
- [x] A bone is never placed inside or overlapping an obstacle; every bone line sits in a lane the dog can reach under the story 003 fairness rules.
- [x] Lines are placed to tempt a lane change (a line in a lane other than the current safe one) at least some of the time.
- [x] Caius collects a bone when lane, depth and height overlap; the bone disappears on pickup.
- [x] Each bone adds a bonus (`CONFIG.TREAT_VALUE`) to the score; the live score and final score = distance + treats.
- [x] Uncollected bones despawn behind the camera; bones and treat count reset on retry.
- [x] Bones scale correctly through the shared projection and are drawn as simple flat vector shapes.

---

## Implementation Notes

- Spawn bone lines from the same row generator so the passable-lane guarantee applies to both.
- Collision with a bone uses the same lane + depth test as obstacles but never ends the run.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 007: pickup pop effect.
- Story 006: final bone art.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Logic
**Required evidence**:
- Logic: automated test waived at `qa.level: minimal` (advisory). Verify by hand on a phone or devtools device emulation; `tests/unit/caius-run/treats_test.*` optional.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: Story 003, Story 004
- Unlocks: Story 007

---

## Completion Notes
**Completed**: 2026-10-05
**Criteria**: 7/7 passing
**Deviations**: None. A bone line ends one slide plus reaction margin before the next row, so it never traps the player in a lane about to be blocked.
**Test Evidence**: Logic: test waived at `qa.level: minimal`; `node tools/qa/cdp-check.mjs treats` 9/9 PASS (3-minute spawner simulation: 114 lines, 0 overlaps with obstacles, lines in all lanes; live pickup, scoring, reset on retry). Log + 3 screenshots in `production/qa/evidence/treats/`.
**Code Review**: Skipped — solo mode
**Revised**: 2026-10-09 — the treat is now the banana penguin from `ref_image/bananana.jpg` (user request), cut by `tools/art/build_caius_sprites.py` and inlined; pickup, spacing and scoring are unchanged. Screenshots in `production/qa/evidence/treats/` recaptured.
