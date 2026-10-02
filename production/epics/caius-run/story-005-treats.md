# Story 005: Bone treats and bonus points

> **Epic**: Caius Run
> **Status**: Ready
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: [set by /dev-story when implementation begins]

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

- [ ] Bones spawn in lines (about 3–8) along one lane, in the gaps between obstacle rows.
- [ ] A bone is never placed inside or overlapping an obstacle; every bone line sits in a lane the dog can reach under the story 003 fairness rules.
- [ ] Lines are placed to tempt a lane change (a line in a lane other than the current safe one) at least some of the time.
- [ ] Caius collects a bone when lane, depth and height overlap; the bone disappears on pickup.
- [ ] Each bone adds a bonus (`CONFIG.TREAT_VALUE`) to the score; the live score and final score = distance + treats.
- [ ] Uncollected bones despawn behind the camera; bones and treat count reset on retry.
- [ ] Bones scale correctly through the shared projection and are drawn as simple flat vector shapes.

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
