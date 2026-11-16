// WAYANG CLASH — keyboard input for player one.
// Tracks held keys and edge-triggered presses (jump, punch, kick, special fire
// once per key-down, not once per frame). Also exposes the start/restart keys
// and a click-to-start hook for the mouse.

import { P1_KEYS, START_KEYS, RESTART_KEYS } from './config.js';
import { emptyInput } from './world.js';

export function createInput() {
  return {
    held: new Set(),
    pressed: new Set(),
    startPressed: false,
    restartPressed: false,
    clicked: false,
    attach() {
      window.addEventListener('keydown', (event) => {
        if (event.repeat) return;
        this.held.add(event.code);
        this.pressed.add(event.code);
        if (START_KEYS.includes(event.code)) this.startPressed = true;
        if (RESTART_KEYS.includes(event.code)) this.restartPressed = true;
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
      });
      window.addEventListener('keyup', (event) => {
        this.held.delete(event.code);
      });
      window.addEventListener('mousedown', () => {
        this.clicked = true;
      });
      window.addEventListener('blur', () => {
        this.held.clear();
      });
    },
    readFighterInput() {
      const input = emptyInput();
      input.left = this.held.has(P1_KEYS.left);
      input.right = this.held.has(P1_KEYS.right);
      input.jump = this.pressed.has(P1_KEYS.jump);
      input.block = this.held.has(P1_KEYS.block);
      input.punch = this.pressed.has(P1_KEYS.punch);
      input.kick = this.pressed.has(P1_KEYS.kick);
      input.special = this.pressed.has(P1_KEYS.special);
      return input;
    },
    consumeStart() {
      const value = this.startPressed || this.clicked;
      this.startPressed = false;
      this.clicked = false;
      return value;
    },
    consumeRestart() {
      const value = this.restartPressed || this.clicked;
      this.restartPressed = false;
      this.clicked = false;
      return value;
    },
    endFrame() {
      this.pressed.clear();
    },
  };
}
