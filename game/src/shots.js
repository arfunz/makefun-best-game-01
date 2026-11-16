// WAYANG CLASH — screenshot staging.
// Each ?shot= scene is a real frame of a real fight: the world is created
// fresh from a seed, an autopilot plays both fighters forward under the real
// rules, and the frame is frozen at the moment the scene asks for. Nothing
// here draws anything the game itself does not draw.

import { beginRound, createWorld, drainEvents, emptyInput, startMatch, stepWorld } from './world.js';
import { autopilotInput } from './ai.js';

export const SHOT_NAMES = ['start', 'play', 'end'];

function stepAutopilot(world, frame) {
  const inputPlayer = autopilotInput(world, world.player, world.opponent, world.rng, frame);
  const inputOpponent = autopilotInput(world, world.opponent, world.player, world.rng, frame + 23);
  stepWorld(world, inputPlayer, inputOpponent);
}

function stageStart(world) {
  for (let frame = 0; frame < 150; frame++) {
    stepWorld(world, emptyInput(), emptyInput());
  }
}

function stagePlay(world) {
  startMatch(world);
  let hitSeen = false;
  for (let frame = 0; frame < 1500; frame++) {
    stepAutopilot(world, frame);
    const freshEvents = drainEvents(world);
    if (freshEvents.includes('hit') && frame > 200) {
      hitSeen = true;
      break;
    }
  }
  if (hitSeen) {
    for (let frame = 0; frame < 6; frame++) stepAutopilot(world, 1500 + frame);
  }
}

function stageEnd(world) {
  startMatch(world);
  for (let frame = 0; frame < 20000; frame++) {
    stepAutopilot(world, frame);
    if (world.phase === 'matchEnd') {
      for (let extra = 0; extra < 40; extra++) stepAutopilot(world, 20000 + extra);
      return;
    }
  }
  // Fallback: freeze on the first round-ending K.O. if the match ran long.
  for (let frame = 0; frame < 20000; frame++) {
    stepAutopilot(world, frame);
    if (world.phase === 'roundEnd' && world.roundWinner) return;
  }
}

export function stageShot(world, name) {
  if (name === 'start') stageStart(world);
  else if (name === 'play') stagePlay(world);
  else if (name === 'end') stageEnd(world);
  else throw new Error(`unknown shot: ${name}`);
}

export function createStagedWorld(name, seed, playerDef, opponentDef) {
  const world = createWorld(seed, 'arjuna', 'rahwana', playerDef, opponentDef);
  stageShot(world, name);
  return world;
}
