# Evidence: Story 006 — Caius character art and park scenery

**Date:** 2026-10-05
**Build:** `src/index.html`, headless Chrome at 390x844 @2x, captured by `node tools/qa/cdp-check.mjs caius-art-and-park-scenery` (5/5 checks pass)
**Reference:** `/home/norbert/Projects/cloud/ref_image/dog_1.jpg` and `dog_2.jpg` (rear-run, jump, 3/4 and front-sit poses)
**Run result:** OBSERVED — vector Caius running from behind in a sunny park, look-back pose on Title, tucked jump pose, lean on lane change

## Screenshots (retained in `production/qa/evidence/caius-art-and-park-scenery/`)

| File | What it shows |
|------|---------------|
| `01-title-look-back.png` | Title: Caius (1.6x) looks back over his shoulder, face in profile, tongue out; sun, clouds, tree line, trees, benches, bushes, flowers |
| `02-title-look-back-closeup.png` | Close-up of the Title pose |
| `03-running.png` | Play: rear view in the park |
| `04-run-cycle-1..4.png` | Four frames of the run cycle: alternating hind legs, paw pads showing on the lifted foot, body bob, ear flop, tail sway |
| `05-lean-right.png` | Lean into a right lane change (0.11 rad measured) |
| `06-jump-pose.png` | Jump: hind legs tucked, pads facing the camera, ears up, shadow left on the ground |
| `07-park-with-obstacles.png` | Crates, cone and scenery together in one flat, outlined style |

## Acceptance criteria

- [x] Flat vector Caius from canvas paths, no images (0 images, 0 external resources): burnt-orange coat `#c4622d`, amber feathering `#e3955a`, dark outline, pink tongue, dark-brown pads, floppy ears, feathered tail — compared side by side with the reference sheet
- [x] Rear-view run cycle with alternating legs, bouncy bob, ear flop and tail sway — OBSERVED in 04-run-cycle-1..4
- [x] Jump pose while airborne — OBSERVED in 06
- [x] Lean proportional to lateral speed — measured 0.113 rad mid-slide, back to 0.000 after
- [x] Title look-back pose with tongue out — OBSERVED in 01/02
- [x] Trees, benches, bushes, flowers scroll on both sides with perspective; sunny sky, warm palette — OBSERVED in 01/03/07
- [x] Obstacles and bones share the flat outlined look — OBSERVED in 07
- [x] Frame budget: 61 fps headless, 3.3 ms per full frame on desktop CPU. Not measured on a phone.

## Known differences from the reference

- Stylised and simplified: rear view only during play, so the face appears only on the Title. The tail points to one side, as in the reference's running poses.

## Sign-off

Feel (stride timing, lean amount) is not shown by stills; judged from the frame sequence only.

| Role | Name | Date | Sign-off |
|------|------|------|----------|
| Lead (solo developer) | Claude, under the user's delegated autonomous run (2026-10-05) — not the user's own review | 2026-10-05 | [x] Approved |
