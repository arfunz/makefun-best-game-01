// WAYANG CLASH — the AI opponent.
// A small state machine that plays the fight like a person learning the game:
// it walks in when far, strikes when close, sometimes blocks an incoming
// attack, and sometimes leaps back. Each round it reacts faster and presses
// harder, so the challenge grows as the match goes on.

import { emptyInput } from './world.js';

export function createAIState() {
  return {
    thinkTimer: 0,
    plan: 'approach',
    planTimer: 0,
    reactionFrames: 26,
    aggression: 0.45,
  };
}

export function updateAI(ai, world, me, foe) {
  const input = emptyInput();
  ai.thinkTimer -= 1;
  ai.planTimer -= 1;

  const distance = Math.abs(foe.x - me.x);
  const foeAttacking = foe.state === 'punch' || foe.state === 'kick' || foe.state === 'special';
  const inRange = distance < 150;
  const closeRange = distance < 105;

  if (ai.thinkTimer <= 0) {
    ai.thinkTimer = ai.reactionFrames;
    const roundBoost = (world.round - 1) * 0.12;
    const aggression = Math.min(0.85, ai.aggression + roundBoost);
    if (foeAttacking && distance < 260 && world.rng.chance(0.45)) {
      ai.plan = 'block';
      ai.planTimer = 14;
    } else if (inRange && world.rng.chance(aggression)) {
      ai.plan = world.rng.chance(0.6) ? 'attack' : 'kick';
      ai.planTimer = 10;
    } else if (distance > 320 && world.rng.chance(0.2)) {
      ai.plan = 'jump-in';
      ai.planTimer = 30;
    } else if (me.meter >= 100 && inRange && world.rng.chance(0.7)) {
      ai.plan = 'special';
      ai.planTimer = 12;
    } else if (distance < 70 && world.rng.chance(0.25)) {
      ai.plan = 'retreat';
      ai.planTimer = 20;
    } else {
      ai.plan = 'approach';
      ai.planTimer = 24;
    }
    ai.reactionFrames = Math.max(12, 26 - (world.round - 1) * 5);
  }

  const toward = foe.x > me.x ? 1 : -1;
  if (ai.plan === 'approach' || ai.plan === 'jump-in') {
    if (toward > 0) input.right = true;
    else input.left = true;
    if (ai.plan === 'jump-in' && me.onGround) input.jump = true;
  } else if (ai.plan === 'retreat') {
    if (toward > 0) input.left = true;
    else input.right = true;
  } else if (ai.plan === 'block') {
    input.block = true;
  } else if (ai.plan === 'attack') {
    if (closeRange) input.punch = true;
    else if (toward > 0) input.right = true;
    else input.left = true;
  } else if (ai.plan === 'kick') {
    if (inRange) input.kick = true;
    else if (toward > 0) input.right = true;
    else input.left = true;
  } else if (ai.plan === 'special') {
    input.special = true;
  }

  return input;
}

// The screenshot autopilot: both fighters play themselves with a seeded
// policy, so a staged shot is a real frame of a real fight.
export function autopilotInput(world, me, foe, rng, frame) {
  const input = emptyInput();
  const distance = Math.abs(foe.x - me.x);
  const toward = foe.x > me.x ? 1 : -1;
  const slot = Math.floor(frame / 45) % 4;
  if (slot === 0) {
    if (distance > 130) {
      if (toward > 0) input.right = true;
      else input.left = true;
    } else {
      input.punch = true;
    }
  } else if (slot === 1) {
    if (distance > 150) {
      if (toward > 0) input.right = true;
      else input.left = true;
    } else {
      input.kick = true;
    }
  } else if (slot === 2) {
    if (me.onGround && rng.chance(0.4)) input.jump = true;
    if (distance > 130) {
      if (toward > 0) input.right = true;
      else input.left = true;
    }
  } else {
    if (me.meter >= 100) input.special = true;
    else if (distance < 120) input.block = true;
    else if (toward > 0) input.right = true;
    else input.left = true;
  }
  return input;
}
