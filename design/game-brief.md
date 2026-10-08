# Game Brief: Caius Run

**One-sentence pitch:** A Subway Surfers-style 3-lane endless runner starring Caius, a red golden retriever, sprinting down a sunny park path that you play one-handed on your phone from a QR code.

## Core loop
- Run: speed climbs, obstacles and treat lines scroll toward the camera.
- Dodge and grab: swipe to change lane, jump over low obstacles, collect bones for bonus points.
- Crash: score and session best shown; "Try Again" restarts in about 2 seconds.

## Player goal & fail state — what "working" looks like
- Goal: survive as far as possible and beat your session best. Score = distance + treats, live in a corner.
- Fail: touching a crate (blocks a lane) or a low obstacle (log, cone) while not airborne ends the run. At least one open path always exists, so no crash is unfair.
- Working = a 30-90 s run is playable start to death to retry on a phone, with no scroll, zoom or pull-to-refresh interference.

## MVP — what must exist to be the game
1. Pseudo-3D 3-lane park track on canvas: lanes converge to a horizon, camera behind Caius, trees/benches/bushes scrolling at the sides, portrait and responsive.
2. Input: swipe left/right (arrows / A, D) = quick lane slide; swipe up / tap (space) = jump with gravity arc; page scroll, zoom, pull-to-refresh blocked.
3. Obstacles + spawner: crates fill a lane, logs and cones need a jump; never blocks all 3 lanes without a way through; speed ramps up and density rises over time.
4. Collision, score and screens: Title ("Tap to Start"), Play (live score), Game Over (score, session best, big Try Again button).
5. Treats: bone lines along lanes, each adds bonus points.
6. Caius drawn from the reference art: vector, rear view running, jump pose, tongue out, ear/tail flop, tilt into lane changes; looks back over shoulder on Title.
7. Juice: landing squash, crash screen shake, treat pop.

## Out of scope — not building this
- Birthday add-on: built as story 008, then removed on 2026-10-09 at the user's request; the game ships without it.
- No external libraries, no engine, no assets beyond the single `.html` file (inline CSS + JS).
- No save system or persistent leaderboard (best score is per session), no shop, no power-ups, no multiple characters or levels, no audio required for MVP.

## Build order
1. Track, perspective projection and game loop with a placeholder Caius (prove the 3-lane pseudo-3D feels right on a phone).
2. Input (swipe/tap/keys) + lane slide + jump arc.
3. Obstacle spawner with guaranteed-path rule + speed ramp + collision.
4. Screens: Title, Game Over, instant Try Again.
5. Treats + score.
6. Caius art from reference + park scenery.
7. Juice, then the birthday add-on as its own story.

---
**Who it's for / what they feel:** Anyone with a phone and two minutes; a light, warm "one more run" feeling, a fun game and nothing more.

**Art & audio direction:** Flat vector with dark outlines, warm bright palette from Caius's coat (burnt orange body, lighter amber feathering, pink tongue, dark brown paw pads) over sunny park greens and sky; rounded friendly UI; no audio required.

**Reference game:** Subway Surfers — the 3-lane swipe-dodge loop with pseudo-3D camera behind the runner; the MVP drops missions, power-ups, characters and meta-progression.
