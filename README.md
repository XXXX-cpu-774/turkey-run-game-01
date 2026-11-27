# Gobble Dash — a turkey escape game

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/XXXX-cpu-774/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/XXXX-cpu-774/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A turkey is about to become Thanksgiving dinner. Run for the forest.

**Gobble Dash** is a side-scrolling escape runner, built for the
[make.fun turkey escape game bounty](https://make.fun/bounty/turkey-run-game-01).
The farmer is right behind you with his pitchfork; ahead lie hay bales, fences,
mud, the roaring oven and carving knives falling from the sky. Jump them, slide
under the washing line, sidestep the knives, grab corn for points, hide in the
haystack when the farmer gets too close — and reach the forest at 600 m before
he catches you.

## How to play

- **SPACE / ↑ / W or click** — jump (also starts / restarts)
- **← → / A D or hold-click and move** — dodge sideways
- **↓ / S** — slide under the washing line
- **SHIFT (or right mouse button)** — sprint (drains stamina)
- **P** — pause, **M** — mute

Corn restores stamina, golden corn is worth 30, a chilli pepper is a 3-second
speed boost, a haystack hides you from the farmer. Close dodges pay +5. Three
lives; every hit lets the farmer close in.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries — plain Canvas 2D and
synthesised WebAudio. The screenshots in `screenshots/` are real renders of
the game, staged by `game/src/shots.js` (`?shot=start|play|end|escape`).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
