# Evidence: Story 001 — Pseudo-3D track and game loop

**Date:** 2026-10-02
**Build:** `src/index.html`, headless Chrome (`google-chrome --headless=new`), opened from `file://`
**Parse check:** inline script extracted and run through `node --check` — exit 0
**Run result:** OBSERVED — 3 converging lanes, scrolling dashes and grass stripes, placeholder Caius in the middle lane

## Screenshots (retained in `production/qa/evidence/track-and-game-loop/`)

| File | What it shows |
|------|---------------|
| `01-portrait-390x844.png` | Portrait phone (390x844 @2x): lanes converge to horizon, Caius near bottom in lane 1 of 0-2, no scrollbars |
| `02-portrait-360x640.png` | Small phone (360x640 @2x): same layout, nothing clipped |
| `03-speed-9-390x844.png` | Default speed 9 |
| `04-speed-40-390x844.png` | `?speed=40`: image differs from 03 below the horizon, so the single `state.speed` variable changes the scroll |
| `05-landscape-844x390.png` | Landscape: road width capped by height, still fills the viewport without scrollbars |

## Acceptance criteria

- [x] Single self-contained `src/index.html`, no external URLs/scripts/links (grep: 0 matches)
- [x] Canvas fills viewport, DPR-aware, resize/orientationchange handlers — OBSERVED at 3 sizes; rotation not tried on a real device
- [x] 3 lanes in perspective with scrolling markings — OBSERVED (01, 02)
- [x] One `project(laneX, z)` mapping; far dashes are small, near ones large — OBSERVED
- [x] Placeholder Caius near bottom, middle lane, camera behind — OBSERVED
- [x] `requestAnimationFrame` + `maxDt` clamp; `visibilitychange` resets `lastTime` so the first frame back has dt = 0 — by code reading, not exercised in a real hidden tab
- [x] Speed is one variable — OBSERVED (03 vs 04)
- [x] Sections labelled, all tunables in `CONFIG`

## Sign-off

Look: covered above by the retained screenshots. A still cannot show feel (scroll smoothness, fps); the user reported running the build and approving how it looks and runs. No fps measurement was taken.

| Role | Name | Date | Sign-off |
|------|------|------|----------|
| Lead (solo developer) | user | 2026-10-05 | [x] Approved |
