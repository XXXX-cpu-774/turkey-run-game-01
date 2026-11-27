// The simulation: a side-scrolling escape run. The turkey runs right across a
// farmyard while the world scrolls left; the farmer chases from behind, the
// oven and falling carving knives are the hazards, corn is the score. The
// world advances in fixed 1/60 s steps and reports events as bit flags so the
// loop can play sounds and switch screens.

import {
  ESCAPE_DISTANCE, FARMER, FIELD, LIVES, PX_PER_METRE, RUN, SCORE, SPAWN, STEP, TURKEY,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_CORN = 8;
export const EVENT_GOLDEN_CORN = 16;
export const EVENT_BOOST = 32;
export const EVENT_HIDE = 64;
export const EVENT_NEAR_MISS = 128;
export const EVENT_KNIFE_LAND = 256;
export const EVENT_JUMP = 512;
export const EVENT_LAND = 1024;

export const KIND_BALE = 'bale';
export const KIND_FENCE = 'fence';
export const KIND_MUD = 'mud';
export const KIND_OVEN = 'oven';
export const KIND_SCARECROW = 'scarecrow';
export const KIND_LINE = 'line';
export const KIND_CORN = 'corn';
export const KIND_GOLDEN_CORN = 'golden';
export const KIND_CHILI = 'chili';
export const KIND_HAYSTACK = 'haystack';
export const KIND_KNIFE = 'knife';

const OBSTACLE_SIZES = {
  [KIND_BALE]: { width: 72, height: 54 },
  [KIND_FENCE]: { width: 26, height: 88 },
  [KIND_MUD]: { width: 130, height: 14 },
  [KIND_OVEN]: { width: 96, height: 112 },
  [KIND_SCARECROW]: { width: 46, height: 122 },
  // The washing line's bar hangs at head height: slide under it.
  [KIND_LINE]: { width: 30, height: 30 },
};

const OBSTACLE_WEIGHTS = [
  [KIND_BALE, 0.3],
  [KIND_FENCE, 0.22],
  [KIND_MUD, 0.14],
  [KIND_OVEN, 0.14],
  [KIND_SCARECROW, 0.14],
  [KIND_LINE, 0.14],
];

const MIN_X = 120;
const MAX_X = 560;
const MOVE_SPEED = 430;

function pickWeighted(random, table) {
  let roll = random();
  for (let i = 0; i < table.length; i += 1) {
    roll -= table[i][1];
    if (roll <= 0) return table[i][0];
  }
  return table[0][0];
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const state = {
    score: 0,
    distance: 0,
    lives: LIVES,
    stamina: RUN.staminaMax,
    speed: RUN.baseSpeed,
    farmerGap: FARMER.startGap,
    farmerStun: 0,
    outcome: null,
    time: 0,
    scroll: 0,
    cornCollected: 0,
    goldenCollected: 0,
    nearMisses: 0,
    turkey: {
      x: TURKEY.x,
      y: FIELD.groundY - TURKEY.height,
      vy: 0,
      grounded: true,
      sliding: false,
      slideTimer: 0,
      invulnerable: 0,
      runPhase: 0,
      sprinting: false,
      facing: 1,
      // A jump pressed just before landing is remembered briefly and fires
      // on landing, so a jump timed a hair early still clears the obstacle.
      jumpBuffer: 0,
    },
    obstacles: [],
    pickups: [],
    knives: [],
    popups: [],
    feathers: [],
    spawnTimer: 0.9,
    knifeTimer: 2.2,
    cornTimer: 0.8,
    specialTimer: 5,
    stumbleTimer: 0,
    boostTimer: 0,
    mudTimer: 0,
    cleanTimer: 0,
  };

  function turkeyBox() {
    const t = state.turkey;
    const height = t.sliding ? TURKEY.slideHeight : TURKEY.height;
    // The box follows the jump: t.y is the top of the body. When sliding the
    // turkey crouches to the ground, so the box sits at ground level.
    const y = t.sliding ? FIELD.groundY - TURKEY.slideHeight : t.y;
    return { x: t.x, y, width: TURKEY.width, height };
  }

  function addPopup(x, y, text, color) {
    // Stack popups that arrive together so their texts never print on top
    // of each other.
    const stack = state.popups.filter((p) => Math.abs(p.x - x) < 140).length;
    state.popups.push({ x, y: y - stack * 26, text, color: color || '#ffffff', ttl: 1.1 });
  }

  function burstFeathers(x, y) {
    const colors = ['#a0522d', '#d2691e', '#e8a33c', '#8a5a2e', '#c89a62'];
    for (let i = 0; i < 14; i += 1) {
      state.feathers.push({
        x, y,
        vx: (random() - 0.5) * 320,
        vy: -random() * 320 - 40,
        ttl: 0.7 + random() * 0.5,
        color: colors[Math.floor(random() * colors.length)],
        size: 4 + random() * 6,
      });
    }
  }

  function runSpeed() {
    let speed = Math.min(RUN.maxSpeed, RUN.baseSpeed + state.distance * RUN.speedPerMetre);
    if (state.boostTimer > 0) speed *= 1.6;
    if (state.stumbleTimer > 0) speed *= 0.55;
    if (state.mudTimer > 0) speed *= 0.6;
    return speed;
  }

  function spawnObstacle() {
    const kind = pickWeighted(random, OBSTACLE_WEIGHTS);
    const size = OBSTACLE_SIZES[kind];
    state.obstacles.push({
      kind,
      x: FIELD.width + 40,
      y: kind === KIND_LINE ? FIELD.groundY - 90 : FIELD.groundY - size.height,
      width: size.width,
      height: size.height,
      passed: false,
      nearMissed: false,
      mudApplied: false,
    });
  }

  function spawnCornCluster() {
    const pattern = random();
    const baseX = FIELD.width + 40;
    const add = (x, y, golden) => state.pickups.push({
      kind: golden ? KIND_GOLDEN_CORN : KIND_CORN,
      x, y, width: 30, height: 30, taken: false, bob: random() * Math.PI * 2,
    });
    if (pattern < 0.45) {
      // A low line of three, easy to grab while running.
      for (let i = 0; i < 3; i += 1) add(baseX + i * 48, FIELD.groundY - 44, false);
    } else if (pattern < 0.8) {
      // An arc over a jump: the middle cob is the reward for jumping well.
      for (let i = 0; i < 5; i += 1) {
        const t = i / 4;
        add(baseX + i * 44, FIELD.groundY - 44 - Math.sin(t * Math.PI) * 130, false);
      }
    } else {
      // One golden cob, high up.
      add(baseX + 60, FIELD.groundY - 220, true);
    }
  }

  function spawnSpecial() {
    const kind = random() < 0.5 ? KIND_CHILI : KIND_HAYSTACK;
    state.pickups.push({
      kind,
      x: FIELD.width + 40,
      y: FIELD.groundY - (kind === KIND_HAYSTACK ? 66 : 44),
      width: kind === KIND_HAYSTACK ? 78 : 34,
      height: kind === KIND_HAYSTACK ? 66 : 40,
      taken: false,
      bob: 0,
    });
  }

  function spawnKnife() {
    // Aimed near the turkey's current lane, with a telegraphed target. The
    // knife hangs in the sky above its target while it is telegraphed and
    // drops straight down: the shadow always marks where it will land.
    const targetX = Math.min(
      MAX_X + 120,
      Math.max(MIN_X - 40, state.turkey.x + (random() - 0.5) * 320),
    );
    state.knives.push({
      kind: KIND_KNIFE,
      targetX,
      x: targetX,
      y: -110,
      width: 30,
      height: 96,
      warning: SPAWN.knifeWarning,
      falling: false,
      stuck: 0,
      done: false,
      nearMissed: false,
    });
  }

  function applyHit(source) {
    const t = state.turkey;
    if (t.invulnerable > 0 || state.outcome) return EVENT_NONE;
    state.lives -= 1;
    state.farmerGap = Math.max(0, state.farmerGap - FARMER.hitGapLoss);
    state.stumbleTimer = 0.7;
    t.invulnerable = TURKEY.invulnerable;
    burstFeathers(t.x + TURKEY.width / 2, t.y + 30);
    addPopup(t.x + 10, t.y - 20, 'OUCH!', '#ff9f1c');
    if (state.lives <= 0) {
      state.outcome = 'caught';
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function reset() {
    state.score = 0;
    state.distance = 0;
    state.lives = LIVES;
    state.stamina = RUN.staminaMax;
    state.speed = RUN.baseSpeed;
    state.farmerGap = FARMER.startGap;
    state.farmerStun = 0;
    state.outcome = null;
    state.time = 0;
    state.scroll = 0;
    state.cornCollected = 0;
    state.goldenCollected = 0;
    state.nearMisses = 0;
    state.turkey.x = TURKEY.x;
    state.turkey.y = FIELD.groundY - TURKEY.height;
    state.turkey.vy = 0;
    state.turkey.grounded = true;
    state.turkey.sliding = false;
    state.turkey.slideTimer = 0;
    state.turkey.invulnerable = 0;
    state.turkey.runPhase = 0;
    state.turkey.sprinting = false;
    state.obstacles.length = 0;
    state.pickups.length = 0;
    state.knives.length = 0;
    state.popups.length = 0;
    state.feathers.length = 0;
    state.spawnTimer = 0.9;
    state.knifeTimer = 2.2;
    state.cornTimer = 0.8;
    state.specialTimer = 5;
    state.stumbleTimer = 0;
    state.boostTimer = 0;
    state.mudTimer = 0;
    state.cleanTimer = 0;
  }

  function step(dt, controls, attract) {
    const t = state.turkey;
    let events = EVENT_NONE;
    state.time += dt;

    // Timers always tick down.
    if (t.invulnerable > 0) t.invulnerable -= dt;
    if (t.slideTimer > 0) {
      t.slideTimer -= dt;
      if (t.slideTimer <= 0) t.sliding = false;
    }
    if (state.stumbleTimer > 0) state.stumbleTimer -= dt;
    if (state.boostTimer > 0) state.boostTimer -= dt;
    if (state.mudTimer > 0) state.mudTimer -= dt;
    if (state.farmerStun > 0) state.farmerStun -= dt;

    const speed = runSpeed();
    state.speed = speed;
    state.scroll += speed * dt;
    t.runPhase += dt * (speed / 34);

    if (attract) {
      // The title screen: the turkey runs in place, the farmer trails behind,
      // the farm scrolls by. No hazards, no score.
      state.distance += (speed * dt) / PX_PER_METRE;
      return EVENT_NONE;
    }

    if (state.outcome) return EVENT_NONE;

    // --- Controls: sideways movement, jump, slide, sprint. ---
    const move = controls.moveDir || 0;
    if (move !== 0) {
      t.x = Math.min(MAX_X, Math.max(MIN_X, t.x + move * MOVE_SPEED * dt));
      t.facing = move;
    } else if (typeof controls.mouseX === 'number') {
      const target = Math.min(MAX_X, Math.max(MIN_X, controls.mouseX - TURKEY.width / 2));
      const diff = target - t.x;
      if (Math.abs(diff) > 4) t.x += Math.sign(diff) * Math.min(Math.abs(diff), MOVE_SPEED * dt);
    }
    // Jump: a press is remembered for 0.15 s, so a jump pressed just before
    // landing fires the moment the turkey touches down.
    if (controls.jumpHeld) t.jumpBuffer = 0.15;
    else t.jumpBuffer = Math.max(0, t.jumpBuffer - dt);
    if (t.jumpBuffer > 0 && t.grounded) {
      t.vy = TURKEY.jumpVelocity;
      t.grounded = false;
      t.sliding = false;
      t.jumpBuffer = 0;
      events |= EVENT_JUMP;
    }
    if (controls.slideHeld && t.grounded && !t.sliding) {
      t.sliding = true;
      t.slideTimer = 0.55;
    }
    const wantSprint = controls.sprintHeld && state.stamina > 1;
    t.sprinting = wantSprint;
    if (wantSprint) {
      state.stamina = Math.max(0, state.stamina - RUN.sprintStaminaDrain * dt);
    } else {
      state.stamina = Math.min(RUN.staminaMax, state.stamina + RUN.staminaRegen * dt);
    }

    // --- Vertical physics. ---
    if (!t.grounded) {
      t.vy += TURKEY.gravity * dt;
      t.y += t.vy * dt;
      const ground = FIELD.groundY - (t.sliding ? TURKEY.slideHeight : TURKEY.height);
      if (t.y >= ground) {
        t.y = ground;
        t.vy = 0;
        t.grounded = true;
        events |= EVENT_LAND;
      }
    }

    // --- Distance and score. ---
    const metres = (speed * dt) / PX_PER_METRE;
    state.distance += metres;
    state.score += metres * SCORE.perMetre;
    if (state.distance >= ESCAPE_DISTANCE) {
      state.outcome = 'escaped';
      state.score += SCORE.escapeBonus;
      return events | EVENT_ESCAPED;
    }

    // --- The farmer: he closes in on hits, falls back when the turkey runs clean. ---
    if (state.farmerStun > 0) {
      state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + speed * dt * 0.4);
    } else if (state.farmerGap > 0) {
      // A gap of zero means the farmer is on the turkey: it never recovers.
      state.cleanTimer += dt;
      const recovery = FARMER.cleanRecovery + (t.sprinting ? FARMER.sprintRecovery : 0);
      state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + recovery * dt);
    }
    if (state.farmerGap <= 0) {
      state.outcome = 'caught';
      return events | EVENT_OVER;
    }

    // --- Spawning, scaled by how far the run has gone. ---
    const ramp = Math.min(1, state.distance / 500);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObstacle();
      const interval = SPAWN.intervalStart + (SPAWN.intervalEnd - SPAWN.intervalStart) * ramp;
      state.spawnTimer = interval * (0.85 + random() * 0.35);
    }
    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      spawnKnife();
      const interval = SPAWN.knifeIntervalStart + (SPAWN.knifeIntervalEnd - SPAWN.knifeIntervalStart) * ramp;
      state.knifeTimer = interval * (0.85 + random() * 0.4);
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnCornCluster();
      state.cornTimer = SPAWN.cornInterval * (0.85 + random() * 0.5);
    }
    state.specialTimer -= dt;
    if (state.specialTimer <= 0) {
      spawnSpecial();
      state.specialTimer = SPAWN.specialInterval * (0.9 + random() * 0.4);
    }

    const box = turkeyBox();

    // --- Obstacles scroll, collide, and are passed. ---
    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const ob = state.obstacles[i];
      ob.x -= speed * dt;
      if (ob.x + ob.width < -60) {
        state.obstacles.splice(i, 1);
        continue;
      }
      if (ob.kind === KIND_MUD) {
        if (boxesOverlap(box, ob) && t.grounded) {
          if (!ob.mudApplied) {
            ob.mudApplied = true;
            state.farmerGap = Math.max(0, state.farmerGap - 20);
            addPopup(t.x + 10, t.y - 20, 'MUD!', '#c9a94a');
          }
          state.mudTimer = Math.max(state.mudTimer, 0.35);
        }
        continue;
      }
      if (!ob.passed && ob.x + ob.width < t.x) {
        ob.passed = true;
      }
      if (!ob.nearMissed && !ob.passed) {
        const expanded = { x: box.x - 26, y: box.y - 26, width: box.width + 52, height: box.height + 52 };
        if (boxesOverlap(expanded, ob)) {
          ob.nearMissed = true;
          state.nearMisses += 1;
          state.score += SCORE.nearMiss;
          addPopup(t.x + 20, t.y - 30, `CLOSE! +${SCORE.nearMiss}`, '#7ed957');
          events |= EVENT_NEAR_MISS;
        }
      }
      if (boxesOverlap(box, ob)) {
        events |= applyHit(ob.kind);
        if (state.outcome) return events;
        // A hit knocks the obstacle away so it cannot hit twice.
        state.obstacles.splice(i, 1);
      }
    }

    // --- Falling knives: telegraph, drop, stick, fade. ---
    for (let i = state.knives.length - 1; i >= 0; i -= 1) {
      const knife = state.knives[i];
      if (knife.warning > 0) {
        knife.warning -= dt;
        if (knife.warning <= 0) knife.falling = true;
      } else if (knife.falling) {
        knife.y += 2600 * dt;
        if (knife.y >= FIELD.groundY - knife.height) {
          knife.y = FIELD.groundY - knife.height;
          knife.falling = false;
          knife.stuck = 1.3;
          events |= EVENT_KNIFE_LAND;
        }
      } else if (knife.stuck > 0) {
        knife.stuck -= dt;
      } else {
        knife.done = true;
      }
      // The knife hangs above its target while telegraphed and drops straight
      // down; only once it is stuck in the ground does it scroll with the world.
      if (knife.stuck > 0 || knife.done) knife.x -= speed * dt;
      if (knife.done || knife.x + knife.width < -60) {
        state.knives.splice(i, 1);
        continue;
      }
      const knifeBox = { x: knife.x, y: knife.y, width: knife.width, height: knife.height };
      if (knife.falling || knife.stuck > 0) {
        if (!knife.nearMissed) {
          const expanded = { x: box.x - 26, y: box.y - 26, width: box.width + 52, height: box.height + 52 };
          if (boxesOverlap(expanded, knifeBox)) {
            knife.nearMissed = true;
            state.nearMisses += 1;
            state.score += SCORE.nearMiss;
            addPopup(t.x + 20, t.y - 30, `CLOSE! +${SCORE.nearMiss}`, '#7ed957');
            events |= EVENT_NEAR_MISS;
          }
        }
        if (boxesOverlap(box, knifeBox)) {
          events |= applyHit('knife');
          if (state.outcome) return events;
          state.knives.splice(i, 1);
        }
      }
    }

    // --- Pickups scroll and are collected. ---
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const p = state.pickups[i];
      p.x -= speed * dt;
      p.bob += dt * 4;
      if (p.x + p.width < -60) {
        state.pickups.splice(i, 1);
        continue;
      }
      if (!p.taken && boxesOverlap(box, { x: p.x, y: p.y + Math.sin(p.bob) * 4, width: p.width, height: p.height })) {
        p.taken = true;
        state.pickups.splice(i, 1);
        if (p.kind === KIND_CORN) {
          state.cornCollected += 1;
          state.score += SCORE.corn;
          state.stamina = Math.min(RUN.staminaMax, state.stamina + RUN.cornStamina);
          addPopup(p.x, p.y - 10, `+${SCORE.corn}`, '#f2c94c');
          events |= EVENT_CORN;
        } else if (p.kind === KIND_GOLDEN_CORN) {
          state.goldenCollected += 1;
          state.score += SCORE.goldenCorn;
          state.stamina = Math.min(RUN.staminaMax, state.stamina + RUN.cornStamina * 2);
          addPopup(p.x, p.y - 10, `+${SCORE.goldenCorn}`, '#ffe066');
          events |= EVENT_GOLDEN_CORN;
        } else if (p.kind === KIND_CHILI) {
          state.boostTimer = 3;
          state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + 40);
          addPopup(p.x, p.y - 10, 'SPEED!', '#ff6b5e');
          events |= EVENT_BOOST;
        } else if (p.kind === KIND_HAYSTACK) {
          state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FARMER.haystackGap);
          state.farmerStun = FARMER.haystackStun;
          addPopup(p.x, p.y - 10, 'HIDDEN!', '#e8c96a');
          events |= EVENT_HIDE;
        }
      }
    }

    // --- Popups and feathers drift. ---
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const popup = state.popups[i];
      popup.y -= 42 * dt;
      popup.ttl -= dt;
      if (popup.ttl <= 0) state.popups.splice(i, 1);
    }
    for (let i = state.feathers.length - 1; i >= 0; i -= 1) {
      const f = state.feathers[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 900 * dt;
      f.ttl -= dt;
      if (f.ttl <= 0 || f.y > FIELD.groundY) state.feathers.splice(i, 1);
    }

    return events;
  }

  return {
    state,
    step,
    reset,
    turkeyBox,
    // Debug hooks for the play-test and the screenshot scenes.
    debug: {
      forceHit() { return applyHit('debug'); },
      setFarmerGap(value) { state.farmerGap = value; },
      setDistance(value) { state.distance = value; },
      setLives(value) { state.lives = value; },
      setStamina(value) { state.stamina = value; },
      clearHazards() {
        state.obstacles.length = 0;
        state.knives.length = 0;
      },
    },
  };
}
