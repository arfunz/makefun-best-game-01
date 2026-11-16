// WAYANG CLASH — the two fighters.
// Each entry is the fighter's whole identity: how fast it moves, how hard it
// hits, what its special move is, and how the renderer draws its puppet.

export const FIGHTER_IDS = ['arjuna', 'rahwana'];

export const FIGHTER_DEFS = {
  arjuna: {
    id: 'arjuna',
    name: 'ARJUNA',
    title: 'Pemanah dari Hastina',
    speed: 3.6,
    jumpVelocity: -14.5,
    health: 100,
    punch: { damage: 6, range: 100, startup: 4, active: 4, recovery: 10 },
    kick: { damage: 9, range: 125, startup: 8, active: 5, recovery: 16 },
    special: {
      name: 'Panah Pasupati',
      damage: 18,
      projectileSpeed: 10,
      kind: 'arrow',
    },
    gold: '#e8b64c',
    trim: '#f7dc8a',
    cloth: '#2e6f5e',
    jewel: '#7fd4a8',
    crown: 'slim',
    weapon: 'bow',
    flavor: 'Cepat dan lincah. Panahnya menembus kegelapan.',
  },
  rahwana: {
    id: 'rahwana',
    name: 'RAHWANA',
    title: 'Raja Alengka',
    speed: 2.6,
    jumpVelocity: -13,
    health: 100,
    punch: { damage: 8, range: 105, startup: 6, active: 4, recovery: 13 },
    kick: { damage: 13, range: 130, startup: 10, active: 5, recovery: 20 },
    special: {
      name: 'Api Alengka',
      damage: 22,
      projectileSpeed: 7,
      kind: 'fireball',
    },
    gold: '#e8b64c',
    trim: '#ff9d4d',
    cloth: '#8e2f23',
    jewel: '#ff6b4a',
    crown: 'wide',
    weapon: 'mace',
    flavor: 'Lambat tapi menghancurkan. Apinya membakar kelir.',
  },
};

export function getFighterDef(id) {
  return FIGHTER_DEFS[id];
}

export function createFighterState(def, x, facing) {
  return {
    def,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    health: def.health,
    meter: 0,
    state: 'idle',
    stateFrame: 0,
    attackHasHit: false,
    blocking: false,
    onGround: true,
    roundsWon: 0,
    walkCycle: 0,
  };
}
