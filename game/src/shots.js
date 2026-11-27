// The screenshot scenes behind ?shot=start|play|end|escape. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// the autopilot, so the frame is what a short game really looks like and the
// same seed always gives the same frame.

import { ESCAPE_DISTANCE, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER } from './world.js';
import { autopilot, controlsFromPilot } from './pilot.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 14;
const END_LIMIT_SECONDS = 600;
const ESCAPE_WARP_METRES = 560;

function runFor(world, seconds, skill) {
  let jumpHeld = false;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const decision = autopilot(world.state, skill);
    const controls = controlsFromPilot(decision, jumpHeld);
    jumpHeld = decision.jump;
    const events = world.step(STEP, controls, false);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Names: start (title), play (mid-run), end (caught),
 * escape (the forest ending); any other name is start.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'escape') {
    // Warp near the forest, then let the good pilot finish the run.
    world.debug.setDistance(ESCAPE_WARP_METRES);
    world.debug.clearHazards();
    const events = runFor(world, 60, 1);
    const escaped = world.state.outcome === 'escaped';
    return { screen: escaped ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { moveDir: 0, jumpPressed: false, jumpHeld: false, slideHeld: false, sprintHeld: false, mouseX: null }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // The sloppy pilot is caught out once the pace picks up.
    runFor(world, END_LIMIT_SECONDS, 0);
    const over = world.state.lives === 0 || world.state.outcome === 'caught';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  runFor(world, PLAY_SECONDS, 1);
  return { screen: SCREEN_PLAY, best: Math.floor(world.state.score) };
}
