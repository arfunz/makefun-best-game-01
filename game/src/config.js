// WAYANG CLASH — shared tuning constants.
// One place for every number the fight, the stage and the HUD agree on.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;
export const GROUND_Y = 648;

export const ROUND_TIME_SECONDS = 60;
export const ROUNDS_TO_WIN = 2;
export const MAX_HEALTH = 100;
export const SPECIAL_METER_MAX = 100;

export const FIGHTER_BODY_HALF_WIDTH = 42;
export const FIGHTER_BODY_HEIGHT = 250;
export const STAGE_MIN_X = 130;
export const STAGE_MAX_X = CANVAS_WIDTH - 130;

export const GRAVITY = 0.75;
export const HIT_STOP_FRAMES = 5;
export const KO_HIT_STOP_FRAMES = 14;

export const METER_ON_LANDING_HIT = 10;
export const METER_ON_TAKING_HIT = 6;
export const METER_ON_BLOCKED_HIT = 4;

export const P1_KEYS = {
  left: 'KeyA',
  right: 'KeyD',
  jump: 'KeyW',
  block: 'KeyS',
  punch: 'KeyJ',
  kick: 'KeyK',
  special: 'KeyL',
};

export const START_KEYS = ['Enter', 'NumpadEnter', 'Space'];
export const RESTART_KEYS = ['KeyR'];
