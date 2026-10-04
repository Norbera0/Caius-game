# Epic: Caius Run

> **Source**: `design/game-brief.md` (minimal tier — epic synthesized from the brief)
> **Status**: Complete (MVP + birthday add-on)

## Goal

A Subway Surfers-style 3-lane endless runner starring Caius, a red golden retriever, sprinting down a sunny park path; played one-handed on a phone from a QR code.

## Scope (the brief's MVP)

1. Pseudo-3D 3-lane park track on canvas
2. Input: swipe/tap/keys, page scroll/zoom/pull-to-refresh blocked
3. Obstacles + spawner with a guaranteed path, speed ramp, collision
4. Score and screens: Title, Play, Game Over, Try Again
5. Bone treats
6. Caius art from the reference + park scenery
7. Juice: landing squash, crash shake, treat pop

## Ordering

Brief build order: track and loop first, then input, obstacles and collision, screens, treats, art, juice. Story numbers follow it.

## Out of scope

Birthday add-on (separate story after MVP), external libraries, engine, save system, power-ups, extra characters or levels, audio.

## Stories

| # | Story | Type | Status | ADR |
|---|-------|------|--------|-----|
| 001 | Pseudo-3D track and game loop | Visual/Feel | Complete | N/A |
| 002 | Input, lane slide and jump | Logic | Complete | N/A |
| 003 | Obstacles, spawner, speed ramp and collision | Logic | Complete | N/A |
| 004 | Score, Title, Play and Game Over screens | UI | Complete | N/A |
| 005 | Bone treats and bonus points | Logic | Complete | N/A |
| 006 | Caius character art and park scenery | Visual/Feel | Complete | N/A |
| 007 | Game feel: landing squash, crash shake, treat pop | Visual/Feel | Complete | N/A |
| 008 | Birthday banner and confetti at a score milestone | UI | Complete | N/A |
