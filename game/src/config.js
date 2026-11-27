// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels of scroll that count as one metre of escape. */
export const PX_PER_METRE = 50;

/** Reach this distance and the turkey escapes to the forest. */
export const ESCAPE_DISTANCE = 600;

export const TURKEY = {
  x: 260,
  width: 64,
  height: 76,
  slideHeight: 40,
  jumpVelocity: -1050,
  gravity: 2400,
  invulnerable: 1.6,
};

export const LIVES = 3;

export const RUN = {
  baseSpeed: 330,
  maxSpeed: 640,
  /** Speed gained per metre travelled, in px/s. */
  speedPerMetre: 0.55,
  sprintMultiplier: 1.45,
  sprintStaminaDrain: 34,
  staminaRegen: 16,
  staminaMax: 100,
  /** Stamina a corn cob restores. */
  cornStamina: 8,
};

export const FARMER = {
  /** Gap in pixels behind the turkey when the run starts. */
  startGap: 340,
  maxGap: 360,
  /** Gap lost when the turkey is hit. */
  hitGapLoss: 95,
  /** Gap the farmer regains each second while the turkey runs clean. */
  cleanRecovery: 3,
  /** Gap gained while sprinting, per second. */
  sprintRecovery: 26,
  /** Gap gained by hiding in a haystack. */
  haystackGap: 130,
  /** Seconds the farmer is stunned after a haystack hide. */
  haystackStun: 2.2,
};

export const SPAWN = {
  /** Seconds between obstacle spawns at the start and at full ramp. */
  intervalStart: 1.6,
  intervalEnd: 0.7,
  /** Seconds between falling knives at the start and at full ramp. */
  knifeIntervalStart: 4.2,
  knifeIntervalEnd: 2.6,
  /** Seconds a falling knife is telegraphed before it drops. */
  knifeWarning: 0.65,
  /** Seconds between corn spawns. */
  cornInterval: 1.5,
  goldenCornChance: 0.08,
  /** Seconds between special pickups (chili, haystack). */
  specialInterval: 7,
};

export const SCORE = {
  corn: 10,
  goldenCorn: 30,
  nearMiss: 5,
  /** Points per metre of escape. */
  perMetre: 1,
  escapeBonus: 500,
};

export const PALETTE = {
  skyTop: '#7ec8f2',
  skyBottom: '#fde9b8',
  sun: '#ffd94d',
  sunCore: '#fff3b0',
  hillFar: '#8fbf7a',
  hillNear: '#6da85c',
  ground: '#9c7a4a',
  grass: '#5f9e46',
  grassDark: '#4c8339',
  barn: '#b8452f',
  barnRoof: '#7d2d1e',
  barnTrim: '#f3e6c8',
  fence: '#8a6a42',
  tree: '#3f7d33',
  treeTrunk: '#6b4a2b',
  turkeyBody: '#8a5a2e',
  turkeyBelly: '#c89a62',
  turkeyHead: '#d8c8b8',
  turkeyBeak: '#e8a33c',
  turkeyWattle: '#e5534b',
  turkeyTail: ['#a0522d', '#d2691e', '#e8a33c', '#c96a3a', '#8a5a2e'],
  turkeyLeg: '#e8a33c',
  farmerShirt: '#4a6fa5',
  farmerOveralls: '#3b5b8c',
  farmerSkin: '#e8b98a',
  farmerHat: '#d8b25a',
  farmerBeard: '#f0f0f0',
  oven: '#3a3f47',
  ovenDoor: '#23262c',
  ovenFire: '#ff7a2a',
  ovenGlow: '#ffb347',
  knifeBlade: '#dfe5ec',
  knifeEdge: '#f8fafc',
  knifeHandle: '#5a3a22',
  knifeShadow: 'rgba(0,0,0,0.25)',
  corn: '#f2c94c',
  cornHusk: '#5f9e46',
  goldenCorn: '#ffe066',
  chili: '#d92b1f',
  chiliStem: '#3f7d33',
  hay: '#e8c96a',
  hayDark: '#c9a94a',
  mud: '#6b4a2b',
  panel: 'rgba(20, 24, 32, 0.72)',
  panelSolid: '#252b38',
  text: '#ffffff',
  textDark: '#2a2118',
  muted: '#d8d2c2',
  heart: '#e5534b',
  stamina: '#7ed957',
  staminaLow: '#ff9f1c',
  danger: '#ff4d4d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
