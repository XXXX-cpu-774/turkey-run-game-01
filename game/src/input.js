// Keyboard and pointer input. Jump, slide and sprint are held states read every
// frame; one-shot presses (start or restart, pause, mute) are queued as bit
// flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const SLIDE = new Set(['ArrowDown', 'KeyS']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let jumpHeld = false;
  let slideHeld = false;
  let sprintHeld = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      jumpHeld = true;
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (SLIDE.has(event.code)) {
      slideHeld = true;
    } else if (SPRINT.has(event.code)) {
      sprintHeld = true;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (JUMP.has(event.code)) jumpHeld = false;
    else if (SLIDE.has(event.code)) slideHeld = false;
    else if (SPRINT.has(event.code)) sprintHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    jumpHeld = false;
    slideHeld = false;
    sprintHeld = false;
  });
  // Mouse: a click jumps (and starts / restarts), holding the right half of the
  // screen sprints. Touch works the same way through pointer events.
  target.addEventListener('pointerdown', (event) => {
    if (event.button === 2) {
      sprintHeld = true;
      return;
    }
    jumpHeld = true;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', (event) => {
    if (event.button === 2) sprintHeld = false;
    else jumpHeld = false;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());
  let pointerClientX = null;
  target.addEventListener('pointermove', (event) => {
    pointerClientX = event.clientX;
  });

  return {
    jumpHeld() { return jumpHeld; },
    slideHeld() { return slideHeld; },
    sprintHeld() { return sprintHeld; },
    /** The pointer's x in the page, or null when it never moved over the game. */
    pointerClientX() { return pointerClientX; },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
