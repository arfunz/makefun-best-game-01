// WAYANG CLASH — synthesized gamelan-style sound.
// Every sound is built with WebAudio oscillators and filtered noise: no audio
// files, no network. The context starts only after the player's first
// gesture, and every call is guarded so the game plays silently when audio
// is unavailable (for example in a headless screenshot run).

const SLENDRO = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

export function createAudio() {
  return {
    ctx: null,
    enabled: false,
    musicStep: 0,
    nextMusicTime: 0,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    return;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audio.ctx = new Ctor();
    audio.enabled = true;
  } catch (err) {
    audio.ctx = null;
    audio.enabled = false;
  }
}

function pluck(audio, frequency, when, duration, volume) {
  if (!audio.ctx) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function noiseBurst(audio, when, duration, volume, filterFreq) {
  if (!audio.ctx) return;
  const length = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, when);
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.ctx.destination);
  source.start(when);
}

export function playHitSound(audio, heavy) {
  if (!audio.ctx || !audio.enabled) return;
  const now = audio.ctx.currentTime;
  noiseBurst(audio, now, heavy ? 0.16 : 0.1, heavy ? 0.5 : 0.3, heavy ? 700 : 1200);
  pluck(audio, heavy ? 110 : 164.8, now, 0.12, 0.25);
}

export function playBlockSound(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const now = audio.ctx.currentTime;
  noiseBurst(audio, now, 0.07, 0.2, 2500);
  pluck(audio, 523.25, now, 0.08, 0.12);
}

export function playWhooshSound(audio) {
  if (!audio.ctx || !audio.enabled) return;
  noiseBurst(audio, audio.ctx.currentTime, 0.14, 0.18, 1800);
}

export function playSpecialSound(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const now = audio.ctx.currentTime;
  pluck(audio, 440, now, 0.3, 0.3);
  pluck(audio, 587.33, now + 0.08, 0.3, 0.3);
  pluck(audio, 880, now + 0.16, 0.4, 0.25);
  noiseBurst(audio, now, 0.3, 0.2, 900);
}

export function playGong(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const now = audio.ctx.currentTime;
  pluck(audio, 55, now, 2.5, 0.5);
  pluck(audio, 82.41, now, 2.0, 0.3);
  pluck(audio, 110, now, 1.6, 0.25);
  pluck(audio, 220, now, 1.2, 0.15);
}

export function playRoundPhrase(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const now = audio.ctx.currentTime;
  const phrase = [0, 2, 4, 3, 1, 4];
  phrase.forEach((step, i) => {
    pluck(audio, SLENDRO[step], now + i * 0.16, 0.5, 0.16);
  });
}

// A sparse, quiet metallophone loop during the fight: one note a beat.
export function playMusicStep(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const now = audio.ctx.currentTime;
  if (now < audio.nextMusicTime) return;
  audio.nextMusicTime = now + 0.42;
  const pattern = [0, 2, 1, 4, 3, 2, 4, 1];
  const note = SLENDRO[pattern[audio.musicStep % pattern.length]];
  pluck(audio, note, now, 0.55, 0.07);
  if (audio.musicStep % 8 === 7) pluck(audio, SLENDRO[0] / 2, now, 1.2, 0.1);
  audio.musicStep += 1;
}
