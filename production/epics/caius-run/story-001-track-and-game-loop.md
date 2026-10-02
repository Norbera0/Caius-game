# Story 001: Pseudo-3D track and game loop

> **Epic**: Caius Run
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 1`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine, nothing to rate
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (the **Player goal & fail state** field + the MVP feature this story implements), scoped to this story:*

- [ ] Game is one self-contained `src/index.html`: inline CSS + JS, vanilla JS + `<canvas>`, no external libraries, fonts or network requests.
- [ ] Canvas fills the viewport in portrait, is DPR-aware, and resizes correctly on any phone size and on rotation; no scrollbars appear.
- [ ] 3 lanes are drawn with perspective: lane edges converge to a horizon point; lane markings scroll toward the camera to show forward motion.
- [ ] One projection function maps (lane, depth) to screen x, y and scale; objects at the horizon are small and grow as depth approaches the camera.
- [ ] A placeholder Caius (simple shape) sits near the bottom, camera directly behind, in the middle lane at start.
- [ ] Game loop uses `requestAnimationFrame` with clamped delta time; returning from a hidden tab causes no time jump.
- [ ] Forward speed is a single variable that scrolls the track; changing it visibly changes scroll rate.
- [ ] Code is split into labelled sections: config, rendering, input, game loop, spawning, collision, screens. All tunables live in one `CONFIG` object (gameplay values are data-driven).

---

## Implementation Notes

- Project coding standard: gameplay values external to logic — one top-level `CONFIG` (lane count, speeds, gravity, spacing, scores).
- Section banners as comments; doc comment on each public function.
- Projection: `scale = 1 / (1 + z * k)` style; lane x = lerp(vanishingX, laneX, scale). Keep it one pure function so rendering and collision share it.
- Side scenery here is plain park-green + sky; real trees/benches/bushes land in story 006.
- Code root: no engine is configured, so the file lives at `src/index.html` (decision logged).

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 002: input, lane slide, jump.
- Story 006: Caius art, park scenery, final palette.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory, never "must exist and pass"), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Visual/Feel
**Required evidence**:
- Visual/Feel: a retained screenshot in `production/qa/evidence/` + sign-off in `production/qa/evidence/track-and-game-loop-evidence.md`. Not waived at `qa.level: minimal`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: Story 002, Story 003
