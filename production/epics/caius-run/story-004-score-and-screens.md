# Story 004: Score, Title, Play and Game Over screens

> **Epic**: Caius Run
> **Status**: Ready
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 4`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [ ] Title screen shows the game name "Caius Run", Caius (placeholder until story 006) and "Tap to Start"; a tap starts the run.
- [ ] Play screen shows a live distance score in a top corner; it updates every frame and respects the device safe-area (notch).
- [ ] On crash the run stops and the Game Over screen shows the final score, the session best, and a big "Try Again" button.
- [ ] Session best updates when beaten and persists until the page is closed (memory only; no save system).
- [ ] "Try Again" restarts instantly (no page reload, under 1 s), resets all run state, and goes straight into play, skipping the Title.
- [ ] Try Again is large (at least ~56 px tall), rounded, thumb-reachable, works by tap and by Enter/Space.
- [ ] Taps in the first ~400 ms of Game Over are ignored so a late jump-tap cannot skip the score.
- [ ] The loop start → play → die → retry → die repeats many times with no leaks (obstacles cleared, listeners not duplicated, no slowdown).

---

## Implementation Notes

- Screens as a small state machine: `title | playing | gameover`; one render and one input handler per state.
- Draw UI on the canvas or in DOM overlay; either way rounded flat style, text via the system font stack (no external fonts).
- Score = distance for now; story 005 adds treat bonus into the same total.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: treat points.
- Story 006: final Caius art on Title.
- Birthday add-on: out of scope for MVP.

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

- Depends on: Story 003
- Unlocks: Story 005, Story 007
