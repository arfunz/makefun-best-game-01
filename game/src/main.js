// WAYANG CLASH — bootstrap and the 60 Hz game loop.
// Two modes: interactive play (title, fight, results) and screenshot mode
// (?shot=start|play|end&seed=N), which stages one real frame and freezes it.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { FIGHTER_DEFS } from './fighter.js';
import { createWorld, drainEvents, startMatch, stepWorld, emptyInput } from './world.js';
import { createAIState, updateAI } from './ai.js';
import { drawScene } from './render.js';
import { createAudio, ensureAudio, playBlockSound, playGong, playHitSound, playMusicStep, playRoundPhrase, playSpecialSound, playWhooshSound } from './audio.js';
import { createInput } from './input.js';
import { createStagedWorld, SHOT_NAMES } from './shots.js';

const STEP_SECONDS = 1 / 60;
const GAME_SEED = 20261116;

function playEventSounds(audio, events) {
  for (const event of events) {
    if (event === 'hit') playHitSound(audio, false);
    else if (event === 'blocked') playBlockSound(audio);
    else if (event === 'attack') playWhooshSound(audio);
    else if (event === 'special' || event === 'projectile') playSpecialSound(audio);
    else if (event === 'round-start') playGong(audio);
    else if (event === 'fight') playRoundPhrase(audio);
    else if (event === 'ko' || event === 'match-end') playGong(audio);
  }
}

function statusText(world) {
  if (world.phase === 'title') return 'WAYANG CLASH — tekan Enter untuk bertanding';
  if (world.phase === 'intro') return `Ronde ${world.round} — bersiaplah`;
  if (world.phase === 'fight') return `${world.player.def.name} ${world.player.health} — ${world.opponent.health} ${world.opponent.def.name}`;
  if (world.phase === 'roundEnd') return world.roundWinner ? `${world.roundWinner.def.name} memenangkan ronde ${world.round}` : `Ronde ${world.round} seri`;
  if (world.phase === 'matchEnd') return `${world.winner.def.name} memenangkan pertandingan ${world.player.roundsWon}—${world.opponent.roundsWon}`;
  return 'WAYANG CLASH';
}

function main() {
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;

  if (shot && SHOT_NAMES.includes(shot)) {
    const world = createStagedWorld(shot, seed, FIGHTER_DEFS.arjuna, FIGHTER_DEFS.rahwana);
    drawScene(ctx, world, 0);
    if (status) status.textContent = `WAYANG CLASH — shot ${shot}`;
    document.title = 'shot-ready';
    window.__world = world;
    return;
  }

  const audio = createAudio();
  const input = createInput();
  input.attach();
  const world = createWorld(GAME_SEED, 'arjuna', 'rahwana', FIGHTER_DEFS.arjuna, FIGHTER_DEFS.rahwana);
  const ai = createAIState();
  window.__world = world;

  let lastTime = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(100, now - lastTime);
    lastTime = now;
    accumulator += elapsed / 1000;
    let steps = 0;
    while (accumulator >= STEP_SECONDS && steps < 5) {
      accumulator -= STEP_SECONDS;
      steps += 1;
      ensureAudioOnGesture(audio, input);
      tick();
      input.endFrame();
    }
    drawScene(ctx, world, now);
    if (status) status.textContent = statusText(world);
    requestAnimationFrame(frame);
  }

  function ensureAudioOnGesture(audio, input) {
    if (input.held.size > 0 || input.clicked) ensureAudio(audio);
  }

  function tick() {
    if (world.phase === 'title') {
      if (input.consumeStart()) startMatch(world);
      stepWorld(world, emptyInput(), emptyInput());
    } else if (world.phase === 'matchEnd') {
      if (input.consumeRestart()) startMatch(world);
      stepWorld(world, emptyInput(), emptyInput());
    } else {
      const playerInput = input.readFighterInput();
      const aiInput = world.phase === 'fight' ? updateAI(ai, world, world.opponent, world.player) : emptyInput();
      stepWorld(world, playerInput, aiInput);
      if (world.phase === 'fight') playMusicStep(audio);
    }
    playEventSounds(audio, drainEvents(world));
  }

  requestAnimationFrame(frame);
}

main();
