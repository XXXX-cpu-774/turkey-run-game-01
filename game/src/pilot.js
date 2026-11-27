// The autopilot: a simple look-ahead driver used by the screenshot scenes and
// the play-test. It jumps what must be jumped, slides under the washing line,
// sidesteps falling knives, sprints when the farmer closes in, and drifts
// toward corn when nothing threatens. `skill` 1 is a good pilot; 0 is sloppy.

import { FIELD, TURKEY } from './config.js';
import { KIND_LINE } from './world.js';

// The knife's fall speed, matching world.js: it drops 634 px in 0.244 s.
const KNIFE_FALL_SPEED = 2600;
const KNIFE_FALL_TIME = 634 / KNIFE_FALL_SPEED;

export function autopilot(state, skill) {
  const t = state.turkey;
  const speed = state.speed;
  const lookahead = skill > 0.5 ? 0.6 : 0.22;

  let moveDir = 0;
  let jump = false;
  let slide = false;
  let sprint = false;

  // A washing line beats every other decision. Three cases, all measured in
  // the turkey's own frame: a line close ahead means slide under it; a line
  // already overhead means slide now (a slid turkey is too low to touch the
  // bar); a line anywhere just ahead means do not jump into it.
  let lineClose = false;
  let lineOverhead = false;
  let lineAhead = false;
  for (const ob of state.obstacles) {
    if (ob.kind !== KIND_LINE) continue;
    // A line overlapping the turkey's own x-range is overhead right now —
    // the bar is at head height, so the turkey must slide, never jump.
    if (ob.x + ob.width > t.x && ob.x < t.x + TURKEY.width) {
      lineOverhead = true;
      continue;
    }
    const dist = ob.x - (t.x + TURKEY.width);
    if (dist < 0) continue;
    if (dist / speed < 0.4) lineClose = true;
    else if (dist < 300) lineAhead = true;
  }
  if (lineClose || lineOverhead) slide = true;

  // When to leave the ground for an obstacle: the jump arc must keep the
  // turkey's feet above the obstacle's top from the moment its front edge
  // reaches the turkey until its back edge has passed. Solve the arc for the
  // latest safe take-off and jump then — jumping too early clips the back
  // edge on the way down, jumping too late clips the front edge.
  function jumpAtFor(ob, speed) {
    const disc = TURKEY.jumpVelocity * TURKEY.jumpVelocity - 2 * TURKEY.gravity * ob.height;
    if (disc <= 0) return 0.5;
    const t2 = (-TURKEY.jumpVelocity + Math.sqrt(disc)) / TURKEY.gravity;
    // 0.08 s of margin: the pilot only gets to act once a frame, and the
    // turkey may still be landing from the previous jump when the moment comes.
    const latest = t2 - ob.width / speed - 0.08;
    return Math.min(0.5, Math.max(0.25, latest));
  }

  // The nearest jumpable threat: ground obstacles, knives stuck in the
  // ground, and knives still in the sky. A knife that is telegraphed or
  // falling lands at its current x and then scrolls toward the turkey with
  // the world, so it is a jump threat from the moment it appears — its
  // arrival time is the warning, plus the fall, plus the scroll after landing.
  let threat = null;
  function consider(ob, ttc) {
    if (ttc < lookahead && (!threat || ttc < threat.ttc)) threat = { ob, ttc };
  }
  for (const ob of state.obstacles) {
    if (ob.kind === KIND_LINE) continue;
    const dist = ob.x - (t.x + TURKEY.width);
    if (dist < -20) continue;
    consider(ob, dist / speed);
  }
  for (const knife of state.knives) {
    if (knife.done) continue;
    const dist = knife.x - (t.x + TURKEY.width);
    if (dist < -20) continue;
    if (knife.stuck > 0) {
      consider(knife, dist / speed);
    } else {
      const landIn = knife.warning > 0
        ? knife.warning + KNIFE_FALL_TIME
        : Math.max(0, (FIELD.groundY - knife.height - knife.y) / KNIFE_FALL_SPEED);
      consider(knife, landIn + Math.max(0, dist) / speed);
    }
  }
  // Seconds until the turkey touches down again, from its current height and
  // fall speed. Used to queue a jump that fires on landing.
  function timeToLand(t) {
    if (t.grounded) return 0;
    const ground = FIELD.groundY - TURKEY.height;
    const a = 0.5 * TURKEY.gravity;
    const b = t.vy;
    const c = t.y - ground;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return Infinity;
    return (-b + Math.sqrt(disc)) / (2 * a);
  }

  if (threat && !lineClose && !lineOverhead && !lineAhead) {
    const when = skill > 0.5 ? jumpAtFor(threat.ob, speed) : 0.3;
    // Jump now if grounded, or queue it if the turkey is about to land —
    // the world buffers the press and fires it on touchdown. Holding jump
    // while high in the air would only bunny-hop on the next landing.
    if (threat.ttc < when && (t.grounded || timeToLand(t) < 0.15)) {
      jump = true;
    }
  }

  // Is there a solid obstacle immediately on the given side of the turkey?
  // Dodging into one costs the same life as the knife, so never do it.
  function blockedOnSide(dir) {
    const near = dir < 0 ? t.x - 70 : t.x + TURKEY.width;
    const far = dir < 0 ? t.x : t.x + TURKEY.width + 70;
    for (const ob of state.obstacles) {
      if (ob.kind === KIND_LINE) continue;
      if (ob.x + ob.width > near && ob.x < far) return true;
    }
    for (const knife of state.knives) {
      if (knife.stuck <= 0) continue;
      if (knife.x + knife.width > near && knife.x < far) return true;
    }
    return false;
  }

  // Falling knives: sidestep away from the telegraphed target, which is a
  // fixed spot in the sky — the knife drops straight down onto it. When a
  // jump is imminent, hold still instead: moving sideways changes the
  // distance to the threat, so a jump timed from the current position would
  // land early or late. And never dodge into an obstacle on that side —
  // try the other side, or hold still.
  const jumpImminent = threat !== null && threat.ttc < 0.55;
  if (!jumpImminent) {
    for (const knife of state.knives) {
      if (knife.stuck > 0 || knife.done) continue;
      if (knife.warning <= 0 && !knife.falling) continue;
      const dx = (knife.x + 15) - (t.x + TURKEY.width / 2);
      if (Math.abs(dx) < 78) {
        const away = dx > 0 ? -1 : 1;
        if (!blockedOnSide(away)) moveDir = away;
        else if (!blockedOnSide(-away)) moveDir = -away;
        break;
      }
    }
  }

  // Nothing threatening: drift toward the nearest corn ahead — never chase
  // corn behind the turkey, which would run it back into the farmer — and
  // otherwise drift back to the middle of the lane.
  if (!threat && moveDir === 0) {
    let corn = null;
    for (const p of state.pickups) {
      if (p.kind !== 'corn' && p.kind !== 'golden') continue;
      if (p.x < t.x + 30 || p.x > t.x + 420) continue;
      if (corn === null || p.x < corn.x) corn = p;
    }
    if (corn) {
      const centre = t.x + TURKEY.width / 2;
      if (corn.x + 15 > centre + 14) moveDir = 1;
      else if (corn.x + 15 < centre - 14) moveDir = -1;
    } else {
      const centre = t.x + TURKEY.width / 2;
      if (centre < 240) moveDir = 1;
      else if (centre > 300) moveDir = -1;
    }
  }

  // Sprint when the farmer is close and there is stamina to spend.
  if (state.farmerGap < 170 && state.stamina > 30) sprint = true;
  // Never sprint into a threat you cannot see past.
  if (threat && threat.ttc < 0.3) sprint = false;

  return { moveDir, jump, slide, sprint };
}

export function controlsFromPilot(decision, previousJumpHeld) {
  return {
    moveDir: decision.moveDir,
    jumpPressed: decision.jump && !previousJumpHeld,
    jumpHeld: decision.jump,
    slideHeld: decision.slide,
    sprintHeld: decision.sprint,
    mouseX: null,
  };
}
