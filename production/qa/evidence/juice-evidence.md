# Evidence: Story 007 — Landing squash, crash shake, treat pop

**Date:** 2026-10-05
**Build:** `src/index.html`, headless Chrome 390x844 @2x, `node tools/qa/cdp-check.mjs juice` (12/12 pass; full run 107/107)
**Run result:** OBSERVED — squash on landing, "+10" pop with ring and sparkles on a bone pickup, shaken ground with steady sky and HUD on crash

## Screenshots (retained in `production/qa/evidence/juice/`)

| File | What it shows |
|------|---------------|
| `01-landing-squash.png` | Close-up just after touch-down |
| `02-treat-pop.png` | Ring, sparkles and rising "+10" at the dog; score pill bump |
| `03-crash-shake.png` | Ground layer offset by the shake; sky, horizon and score pill stay put, no edge gap |

## Acceptance criteria

- [x] Landing squash: measured scaleY 0.85 / scaleX 1.11 at the first rendered frame after landing (target 0.8 / 1.15 at t = 0), eased back to 1 within 120 ms
- [x] Crash shake ~300 ms, decaying, before Game Over
- [x] Treat pop at the bone
- [x] Cosmetic only: airtime 0.602 s against 0.62 s configured (frame sampling), hitboxes untouched
- [x] Game Over 394 ms after the crash; Try Again still instant (4 ms)
- [x] Shake never moves the page or the canvas element (scrollX/Y 0, element rect unchanged)
- [x] All strengths and durations in `CONFIG`; 61 fps headless while effects run

## Sign-off

Feel (how punchy the squash and shake are) is judged from stills and numbers only, not by hand on a phone.

| Role | Name | Date | Sign-off |
|------|------|------|----------|
| Lead (solo developer) | Claude, under the user's delegated autonomous run (2026-10-05) — not the user's own review | 2026-10-05 | [x] Approved |
