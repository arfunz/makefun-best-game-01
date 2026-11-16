// WAYANG CLASH — the fight itself.
// Owns the match: phases, rounds, the 60-second timer, physics, hitboxes,
// damage, meters, projectiles, particles and floating numbers. The renderer
// only draws what this file decides; the AI and the screenshot autopilot only
// feed it inputs. One step is one 60 Hz tick, so a staged scene is exact.

import {
  CANVAS_WIDTH,
  GROUND_Y,
  ROUND_TIME_SECONDS,
  ROUNDS_TO_WIN,
  MAX_HEALTH,
  SPECIAL_METER_MAX,
  FIGHTER_BODY_HALF_WIDTH,
  STAGE_MIN_X,
  STAGE_MAX_X,
  GRAVITY,
  HIT_STOP_FRAMES,
  KO_HIT_STOP_FRAMES,
  METER_ON_LANDING_HIT,
  METER_ON_TAKING_HIT,
  METER_ON_BLOCKED_HIT,
} from './config.js';
import { createFighterState } from './fighter.js';
import { createSeededRandom } from './random.js';

const FRAMES_PER_SECOND = 60;
const INTRO_FRAMES = 110;
const ROUND_END_FRAMES = 150;
const MATCH_END_FRAMES = 400;

export function createWorld(seed, playerId, opponentId, playerDef, opponentDef) {
  return {
    seed,
    rng: createSeededRandom(seed),
    phase: 'title',
    phaseFrame: 0,
    round: 1,
    timerFrames: ROUND_TIME_SECONDS * FRAMES_PER_SECOND,
    player: createFighterState(playerDef, 420, 1),
    opponent: createFighterState(opponentDef, CANVAS_WIDTH - 420, -1),
    projectiles: [],
    particles: [],
    floats: [],
    shake: 0,
    hitStop: 0,
    slowMotion: 0,
    winner: null,
    loser: null,
    roundWinner: null,
    roundLoser: null,
    events: [],
    titleBob: 0,
  };
}

export function startMatch(world) {
  world.player.roundsWon = 0;
  world.opponent.roundsWon = 0;
  world.round = 1;
  world.winner = null;
  world.loser = null;
  beginRound(world);
}

export function beginRound(world) {
  world.phase = 'intro';
  world.phaseFrame = 0;
  world.timerFrames = ROUND_TIME_SECONDS * FRAMES_PER_SECOND;
  world.roundWinner = null;
  world.roundLoser = null;
  world.projectiles = [];
  world.player.x = 420;
  world.opponent.x = CANVAS_WIDTH - 420;
  world.player.y = 0;
  world.opponent.y = 0;
  world.player.vx = 0;
  world.opponent.vx = 0;
  world.player.vy = 0;
  world.opponent.vy = 0;
  world.player.health = MAX_HEALTH;
  world.opponent.health = MAX_HEALTH;
  world.player.meter = 0;
  world.opponent.meter = 0;
  setFighterState(world.player, 'idle');
  setFighterState(world.opponent, 'idle');
  world.player.facing = 1;
  world.opponent.facing = -1;
  world.events.push('round-start');
}

export function setFighterState(fighter, state) {
  fighter.state = state;
  fighter.stateFrame = 0;
  fighter.attackHasHit = false;
}

function stateDuration(fighter, kind) {
  const move = fighter.def[kind];
  return move.startup + move.active + move.recovery;
}

function startAttack(world, fighter, kind) {
  if (fighter.state === 'punch' || fighter.state === 'kick' || fighter.state === 'special') return;
  if (!fighter.onGround && kind !== 'special') return;
  setFighterState(fighter, kind);
  world.events.push(kind === 'special' ? 'special' : 'attack');
}

function launchSpecial(world, fighter) {
  const def = fighter.def;
  const spec = def.special;
  const startX = fighter.x + fighter.facing * 70;
  world.projectiles.push({
    owner: fighter,
    kind: spec.kind,
    x: startX,
    y: GROUND_Y - 165,
    vx: fighter.facing * spec.projectileSpeed,
    damage: spec.damage,
    life: 110,
    hasHit: false,
  });
  world.events.push('projectile');
}

function hurtBox(fighter) {
  return {
    left: fighter.x - FIGHTER_BODY_HALF_WIDTH,
    right: fighter.x + FIGHTER_BODY_HALF_WIDTH,
    top: GROUND_Y - 250 + fighter.y,
    bottom: GROUND_Y + fighter.y,
  };
}

function attackBox(fighter, kind) {
  const move = fighter.def[kind];
  const reach = move.range;
  const front = fighter.x + fighter.facing * reach;
  return {
    left: Math.min(fighter.x, front) - 10,
    right: Math.max(fighter.x, front) + 10,
    top: GROUND_Y - 215 + fighter.y,
    bottom: GROUND_Y - 60 + fighter.y,
  };
}

function boxesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function addMeter(fighter, amount) {
  fighter.meter = Math.min(SPECIAL_METER_MAX, fighter.meter + amount);
}

function spawnHitSparks(world, x, y, count, big) {
  for (let i = 0; i < count; i++) {
    const angle = world.rng.range(0, Math.PI * 2);
    const speed = world.rng.range(1.5, big ? 7 : 4.5);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: world.rng.int(14, big ? 34 : 24),
      maxLife: 34,
      size: world.rng.range(2, big ? 6 : 4),
      gold: world.rng.chance(0.7),
    });
  }
}

function spawnFloat(world, x, y, text, big) {
  world.floats.push({ x, y, text, life: 42, big: !!big });
}

function applyHit(world, attacker, defender, damage, kind) {
  const blocked = defender.blocking && defender.onGround && defender.state !== 'hit';
  const finalDamage = blocked ? Math.max(1, Math.floor(damage / 5)) : damage;
  defender.health = Math.max(0, defender.health - finalDamage);
  addMeter(attacker, METER_ON_LANDING_HIT);
  addMeter(defender, blocked ? METER_ON_BLOCKED_HIT : METER_ON_TAKING_HIT);
  const hitX = defender.x - defender.facing * 30;
  const hitY = GROUND_Y - 175 + defender.y;
  spawnHitSparks(world, hitX, hitY, blocked ? 6 : 14, damage >= 13);
  spawnFloat(world, hitX, hitY - 30, blocked ? 'BLOCK' : `-${finalDamage}`, damage >= 13);
  world.shake = Math.max(world.shake, damage >= 13 ? 9 : 5);
  world.hitStop = Math.max(world.hitStop, HIT_STOP_FRAMES);
  world.events.push(blocked ? 'blocked' : 'hit');
  if (!blocked) {
    defender.vx = attacker.facing * (damage >= 13 ? 5 : 3);
    if (defender.health <= 0) {
      knockOut(world, attacker, defender);
    } else {
      setFighterState(defender, 'hit');
    }
  }
}

function knockOut(world, winner, loser) {
  world.roundWinner = winner;
  world.roundLoser = loser;
  winner.roundsWon += 1;
  setFighterState(loser, 'ko');
  setFighterState(winner, 'win');
  world.hitStop = KO_HIT_STOP_FRAMES;
  world.slowMotion = 40;
  world.shake = 14;
  spawnHitSparks(world, loser.x, GROUND_Y - 150, 30, true);
  spawnFloat(world, loser.x, GROUND_Y - 300, 'K.O.!', true);
  world.events.push('ko');
}

function endRoundByTimeout(world) {
  const p = world.player;
  const o = world.opponent;
  if (p.health === o.health) {
    world.roundWinner = null;
    world.roundLoser = null;
    world.events.push('draw');
  } else if (p.health > o.health) {
    world.roundWinner = p;
    world.roundLoser = o;
    p.roundsWon += 1;
    setFighterState(o, 'ko');
    setFighterState(p, 'win');
    world.events.push('timeout');
  } else {
    world.roundWinner = o;
    world.roundLoser = p;
    o.roundsWon += 1;
    setFighterState(p, 'ko');
    setFighterState(o, 'win');
    world.events.push('timeout');
  }
  world.phase = 'roundEnd';
  world.phaseFrame = 0;
}

function updateFighter(world, fighter, foe, input) {
  fighter.stateFrame += 1;
  const def = fighter.def;
  const onGround = fighter.onGround;

  if (fighter.state === 'ko' || fighter.state === 'win') {
    fighter.vx *= 0.9;
    return;
  }

  if (fighter.state === 'hit') {
    if (fighter.stateFrame >= 12) setFighterState(fighter, 'idle');
    fighter.vx *= 0.85;
    return;
  }

  if (fighter.state === 'punch' || fighter.state === 'kick') {
    const kind = fighter.state;
    const move = def[kind];
    const activeStart = move.startup;
    const activeEnd = move.startup + move.active;
    if (!fighter.attackHasHit && fighter.stateFrame >= activeStart && fighter.stateFrame < activeEnd) {
      if (boxesOverlap(attackBox(fighter, kind), hurtBox(foe))) {
        fighter.attackHasHit = true;
        applyHit(world, fighter, foe, move.damage, kind);
      }
    }
    if (fighter.stateFrame >= stateDuration(fighter, kind)) setFighterState(fighter, 'idle');
    fighter.vx *= 0.8;
    return;
  }

  if (fighter.state === 'special') {
    if (fighter.stateFrame === 10) launchSpecial(world, fighter);
    if (fighter.stateFrame >= 30) setFighterState(fighter, 'idle');
    fighter.vx *= 0.8;
    return;
  }

  fighter.blocking = false;
  if (input.block && onGround) {
    fighter.blocking = true;
    fighter.vx *= 0.7;
    return;
  }

  if (input.jump && onGround) {
    fighter.vy = def.jumpVelocity;
    fighter.onGround = false;
    setFighterState(fighter, 'jump');
    world.events.push('jump');
    return;
  }

  if (input.punch) {
    startAttack(world, fighter, 'punch');
    return;
  }
  if (input.kick) {
    startAttack(world, fighter, 'kick');
    return;
  }
  if (input.special && fighter.meter >= SPECIAL_METER_MAX) {
    fighter.meter = 0;
    startAttack(world, fighter, 'special');
    return;
  }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    fighter.vx = dir * def.speed;
    fighter.facing = dir;
    if (onGround) {
      fighter.state = 'walk';
      fighter.walkCycle += 1;
    }
  } else {
    fighter.vx = 0;
    if (onGround) fighter.state = 'idle';
  }
}

function applyPhysics(fighter) {
  fighter.x += fighter.vx;
  if (!fighter.onGround) {
    fighter.vy += GRAVITY;
    fighter.y += fighter.vy;
    if (fighter.y >= 0) {
      fighter.y = 0;
      fighter.vy = 0;
      fighter.onGround = true;
      if (fighter.state === 'jump') setFighterState(fighter, 'idle');
    }
  }
  fighter.x = Math.max(STAGE_MIN_X, Math.min(STAGE_MAX_X, fighter.x));
}

function separateFighters(a, b) {
  const minGap = FIGHTER_BODY_HALF_WIDTH * 2 - 6;
  const gap = b.x - a.x;
  if (Math.abs(gap) < minGap && a.y === 0 && b.y === 0) {
    const push = (minGap - Math.abs(gap)) / 2;
    const sign = gap >= 0 ? 1 : -1;
    a.x = Math.max(STAGE_MIN_X, a.x - push * sign);
    b.x = Math.min(STAGE_MAX_X, b.x + push * sign);
  }
}

function updateProjectiles(world) {
  for (const proj of world.projectiles) {
    proj.x += proj.vx;
    proj.life -= 1;
    const target = proj.owner === world.player ? world.opponent : world.player;
    if (!proj.hasHit && boxesOverlap(
      { left: proj.x - 22, right: proj.x + 22, top: proj.y - 20, bottom: proj.y + 20 },
      hurtBox(target),
    )) {
      proj.hasHit = true;
      applyHit(world, proj.owner, target, proj.damage, 'special');
    }
  }
  world.projectiles = world.projectiles.filter((p) => !p.hasHit && p.life > 0 && p.x > -60 && p.x < CANVAS_WIDTH + 60);
}

function updateParticles(world) {
  for (const p of world.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.22;
    p.life -= 1;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floats) {
    f.y -= 1.1;
    f.life -= 1;
  }
  world.floats = world.floats.filter((f) => f.life > 0);
  if (world.shake > 0) world.shake *= 0.86;
  if (world.shake < 0.4) world.shake = 0;
}

function faceEachOther(world) {
  const p = world.player;
  const o = world.opponent;
  if (p.state !== 'walk' && p.state !== 'idle') return;
  p.facing = o.x >= p.x ? 1 : -1;
  o.facing = p.x >= o.x ? 1 : -1;
}

export function stepWorld(world, inputPlayer, inputOpponent) {
  world.phaseFrame += 1;
  if (world.titleBob !== undefined) world.titleBob += 1;

  if (world.hitStop > 0) {
    world.hitStop -= 1;
    updateParticles(world);
    return;
  }
  const slow = world.slowMotion > 0;
  if (slow) world.slowMotion -= 1;

  if (world.phase === 'title') {
    updateParticles(world);
    return;
  }

  if (world.phase === 'intro') {
    updateParticles(world);
    if (world.phaseFrame >= INTRO_FRAMES) {
      world.phase = 'fight';
      world.phaseFrame = 0;
      world.events.push('fight');
    }
    return;
  }

  if (world.phase === 'roundEnd') {
    updateParticles(world);
    updateFighter(world, world.player, world.opponent, { left: false, right: false, jump: false, block: false, punch: false, kick: false, special: false });
    updateFighter(world, world.opponent, world.player, { left: false, right: false, jump: false, block: false, punch: false, kick: false, special: false });
    if (world.phaseFrame >= ROUND_END_FRAMES) {
      if (world.roundWinner && world.roundWinner.roundsWon >= ROUNDS_TO_WIN) {
        world.winner = world.roundWinner;
        world.loser = world.roundLoser;
        world.phase = 'matchEnd';
        world.phaseFrame = 0;
        world.events.push('match-end');
      } else {
        world.round += 1;
        beginRound(world);
      }
    }
    return;
  }

  if (world.phase === 'matchEnd') {
    updateParticles(world);
    return;
  }

  if (world.phase !== 'fight') return;

  world.timerFrames -= 1;
  if (world.timerFrames <= 0) {
    world.timerFrames = 0;
    endRoundByTimeout(world);
    return;
  }

  faceEachOther(world);
  updateFighter(world, world.player, world.opponent, inputPlayer);
  updateFighter(world, world.opponent, world.player, inputOpponent);
  applyPhysics(world.player);
  applyPhysics(world.opponent);
  separateFighters(world.player, world.opponent);
  updateProjectiles(world);
  updateParticles(world);

  if (world.roundWinner && world.phase === 'fight') {
    world.phase = 'roundEnd';
    world.phaseFrame = 0;
  }
}

export function timerSeconds(world) {
  return Math.ceil(world.timerFrames / FRAMES_PER_SECOND);
}

export function drainEvents(world) {
  const events = world.events;
  world.events = [];
  return events;
}

export function emptyInput() {
  return { left: false, right: false, jump: false, block: false, punch: false, kick: false, special: false };
}
