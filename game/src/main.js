// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught and escaped (the last two share the game-over screen).
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|end|escape (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
//
// window.__game is the debug handle the play-test drives: screen, state, world
// and debug hooks (autopilot on/off, force a hit, warp the distance).
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_BOOST, EVENT_CORN, EVENT_ESCAPED, EVENT_GOLDEN_CORN,
  EVENT_HIDE, EVENT_HIT, EVENT_JUMP, EVENT_KNIFE_LAND, EVENT_LAND,
  EVENT_NEAR_MISS, EVENT_OVER,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { autopilot, controlsFromPilot } from './pilot.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let previousJumpHeld = false;
  let autopilotOn = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    autopilotOn = false;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.click();
    announce(`Playing. ${LIVES} lives. Reach 600 metres to escape.`);
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    const score = Math.floor(world.state.score);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    if (escaped) audio.escaped();
    else audio.caught();
    announce(escaped
      ? `Escaped! Score ${score}. Best ${best}.`
      : `Caught. Score ${score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function playSounds(events) {
    if (events & EVENT_JUMP) audio.jump();
    if (events & EVENT_LAND) audio.land();
    if (events & EVENT_CORN) audio.corn();
    if (events & EVENT_GOLDEN_CORN) audio.goldenCorn();
    if (events & EVENT_BOOST) audio.boost();
    if (events & EVENT_HIDE) audio.hide();
    if (events & EVENT_NEAR_MISS) audio.nearMiss();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_KNIFE_LAND) audio.knife();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { moveDir: 0, jumpPressed: false, jumpHeld: false, slideHeld: false, sprintHeld: false, mouseX: null }, true);
      return;
    }
    let controls;
    if (autopilotOn) {
      const decision = autopilot(world.state, 1);
      controls = controlsFromPilot(decision, previousJumpHeld);
      previousJumpHeld = decision.jump;
    } else {
      const jumpHeld = input.jumpHeld();
      const rect = canvas.getBoundingClientRect();
      const pointerX = input.pointerClientX();
      controls = {
        moveDir: 0,
        jumpPressed: jumpHeld && !previousJumpHeld,
        jumpHeld,
        slideHeld: input.slideHeld(),
        sprintHeld: input.sprintHeld(),
        mouseX: pointerX === null ? null : ((pointerX - rect.left) / rect.width) * 1280,
      };
      previousJumpHeld = jumpHeld;
    }
    // Arrow keys steer left and right; the mouse does the same by position.
    if (!autopilotOn) {
      const left = window.__keys?.left;
      const right = window.__keys?.right;
      controls.moveDir = (right ? 1 : 0) - (left ? 1 : 0);
      if (controls.mouseX !== null && controls.moveDir === 0) {
        // The mouse steers only when it is held down, so a resting pointer
        // never drags the turkey sideways.
        if (!input.jumpHeld()) controls.mouseX = null;
      }
    }
    const events = world.step(STEP, controls, false);
    playSounds(events);
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_HIT) announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
  }

  // Arrow-key steering is tracked here so the world never reads the DOM.
  window.__keys = { left: false, right: false };
  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') window.__keys.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') window.__keys.right = true;
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') window.__keys.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') window.__keys.right = false;
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting knives fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  window.__game = {
    get screen() { return screen; },
    get state() { return world.state; },
    get world() { return world; },
    get best() { return best; },
    get muted() { return audio.muted; },
    debug: {
      setAutopilot(value) {
        autopilotOn = !!value;
        previousJumpHeld = false;
      },
      forceHit() { return world.debug.forceHit(); },
      setFarmerGap(value) { world.debug.setFarmerGap(value); },
      setDistance(value) { world.debug.setDistance(value); },
      setLives(value) { world.debug.setLives(value); },
      setStamina(value) { world.debug.setStamina(value); },
      clearHazards() { world.debug.clearHazards(); },
      start() { if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame(); },
    },
  };

  announce('Gobble Dash. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
