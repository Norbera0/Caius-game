# Story 008: Birthday banner and confetti at a score milestone

> **Epic**: Caius Run
> **Status**: Complete
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-05

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief Out of scope — birthday add-on, separate story after the MVP` (the user's original concept: "When she hits a score milestone, say 500, a banner slides in with 'Happy Birthday, Claudine!' and a little confetti burst. It stays for a few seconds and the run keeps going.")

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From the user's concept for the add-on, scoped to this story:*

- [x] When the live score reaches the milestone (`CONFIG.birthday.milestone`, default 500) a banner reading "Happy Birthday, Claudine!" slides in near the top of the screen.
- [x] A confetti burst plays when the banner appears.
- [x] The banner stays for a few seconds (`CONFIG.birthday.holdSec`), then slides out.
- [x] The run never pauses: speed, scrolling, input and collision continue while the banner shows.
- [x] It shows once per run, and again on the next run if the milestone is reached again.
- [x] Banner text and all timings live in `CONFIG`; the banner fits a 360 px wide screen and clears the score pill and notch.
- [x] Cosmetic only: it never blocks touches and is hidden on the Game Over screen.

---

## Implementation Notes

- Trigger in the effects update so it reads the same `currentScore()` the HUD shows.
- Draw in screen space after the world; confetti uses its own particle list, cleared on retry.

---

## Out of Scope

- Persisting that the banner was seen across sessions.
- Audio.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: UI
**Required evidence**:
- UI: a retained screenshot of each screen touched, in `production/qa/evidence/`. Not waived at `qa.level: minimal`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: Story 004 (score), Story 007 (effects loop)
- Unlocks: None

---

## Completion Notes
**Completed**: 2026-10-05
**Criteria**: 7/7 passing
**Deviations**: None. Small paw prints decorate the banner ends.
**Test Evidence**: UI: screenshots in `production/qa/evidence/birthday-banner/` (banner with confetti at 390x844 and 360x640, confetti settling, Game Over hiding the banner). `cdp-check birthday-banner` 10/10 PASS.
**Code Review**: Skipped — solo mode
