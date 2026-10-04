# Story 006: Caius character art and park scenery

> **Epic**: Caius Run
> **Status**: Complete
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-05

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 6 (and the scenery part of 1)`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [x] Caius is drawn as flat vector (canvas paths, no external images) matching `/home/norbert/Projects/cloud/ref_image/dog_1.jpg`: red golden retriever, burnt-orange coat, lighter amber chest/leg/tail feathering, dark outline, pink tongue, dark-brown paw pads, floppy ears, feathered tail.
- [x] Running is a rear-view, camera-behind cycle of at least 2 frames with alternating legs, a bouncy body bob, and ears and tail that flop and sway.
- [x] A jump pose (legs tucked, as in the reference's jump sprite) shows while airborne.
- [x] Caius tilts into lane changes in proportion to lateral speed.
- [x] Title pose: Caius looks back over his shoulder with tongue out.
- [x] Park scenery: trees, benches and bushes scroll past both sides with perspective scale; sunny sky and warm bright palette.
- [x] Crates, logs, cones and bones are restyled to the same flat vector, rounded look.
- [x] 60 fps is held on a mid-range phone (cache sprites to offscreen canvases if needed).

---

## Implementation Notes

- Reference sheet has rear-run, jump, 3/4 and front sit poses; use the rear-run and jump poses for play and the 3/4 pose for the Title look-back.
- Palette and shapes in `CONFIG.COLORS`/draw helpers so the look is tweakable in one place.
- Record a side-by-side of the reference and the in-game Caius in the evidence file.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 007: squash, shake, pickup pop.
- Audio: out of scope for MVP.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Visual/Feel
**Required evidence**:
- Visual/Feel: a retained screenshot in `production/qa/evidence/` + sign-off in `production/qa/evidence/caius-art-and-park-scenery-evidence.md`. Not waived at `qa.level: minimal`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: Story 003 (obstacle shapes to restyle)
- Unlocks: Story 007

---

## Completion Notes
**Completed**: 2026-10-05
**Criteria**: 8/8 passing. 60 fps is measured on desktop headless Chrome (3.3 ms/frame), not on a phone.
**Deviations**: Advisory — Caius is drawn 1.6x larger on the Title for a clear look-back pose. Sign-off was given by Claude under the user's delegated autonomous run, not by the user.
**Test Evidence**: Visual/Feel: evidence doc at `production/qa/evidence/caius-art-and-park-scenery-evidence.md`, 10 retained screenshots, `cdp-check` 5/5 PASS.
**Code Review**: Skipped — solo mode
