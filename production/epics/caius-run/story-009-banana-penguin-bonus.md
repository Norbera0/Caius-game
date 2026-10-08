# Story 009: Banana penguin bonus with a pick-up card

> **Epic**: Caius Run
> **Status**: Complete
> **Layer**: Feature
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-09

## Context

**GDD**: `design/game-brief.md`
**Requirement**: User request 2026-10-09: "bring back the bone, and the banana penguin is a new thing. it is more sparse and make it bigger! and when the dog gets it, it will show a prompt of the Banana Penguin."

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**Engine**: none — vanilla JS + canvas, single file `src/index.html` | **Risk**: N/A — no engine

---

## Acceptance Criteria

- [x] Bones are the regular treat again (lines of 3-8, +10 each).
- [x] The banana penguin (`assets/art/reference/banana_penguin.jpg`) is a separate, rare pickup: at most one per `CONFIG.penguin.minSpacing` (40 z, ~10-16 s), never on an obstacle or inside a bone line, always in a reachable lane.
- [x] It is drawn much bigger than a bone (1.15 lane widths tall) with a golden glow and orbiting sparkles.
- [x] Picking it up adds +100 and shows a "Banana Penguin!" card with the penguin, "Rare find" and "+100".
- [x] The run never pauses for the card; it pops in, stays ~2.4 s, then fades.
- [x] Retry clears the card and the penguin count; the card fits a 360 px wide screen.

---

## Test Evidence

**Story Type**: UI
- Screenshots in `production/qa/evidence/banana-penguin/` (penguin and bones on the path, the card at 390x844 and 360x640).
- `node tools/qa/cdp-check.mjs banana-penguin` 8/8 PASS (4-minute spawner simulation: 16 penguins, closest 41.5 z apart, 0 obstacle overlaps, 0 bone clashes; live pickup, +100, no pause, card timing, retry reset).

## Completion Notes
**Completed**: 2026-10-09
**Deviations**: The card does not pause the game, so a pick-up never causes an unfair crash.
**Code Review**: Skipped — solo mode
**Revised**: 2026-10-09 — the banana penguin is named **Gingu**; the card reads "Gingu acquired!" with "Banana Penguin +100". Made a bit more common (chance 0.5, min spacing 28 z, about one every 7-11 s; 24 in a simulated 4 minutes).
