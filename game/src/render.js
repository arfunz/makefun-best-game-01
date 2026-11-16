// WAYANG CLASH — everything the player sees.
// Draws the kelir stage, the two wayang puppets, the HUD and every screen
// (title, round intro, K.O., results) on one canvas. All art is procedural:
// no image or font files are loaded, so the game runs from its own files.

import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, MAX_HEALTH, SPECIAL_METER_MAX } from './config.js';
import { timerSeconds } from './world.js';

const GOLD = '#e8b64c';
const GOLD_BRIGHT = '#f7dc8a';
const INK = '#140c07';
const CREAM = '#f3e3b3';

function pointAt(x, y, angleFromDown, length) {
  return { x: x + Math.sin(angleFromDown) * length, y: y + Math.cos(angleFromDown) * length };
}

function limb(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function goldText(ctx, text, x, y, size, font, align) {
  ctx.font = font;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 8);
  ctx.strokeStyle = '#2a1503';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.fillText(text, x, y);
}

function drawStage(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, '#3d1608');
  grad.addColorStop(0.45, '#5a2210');
  grad.addColorStop(0.75, '#2a1206');
  grad.addColorStop(1, '#180a04');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Ground: dark earth below the screen, drawn first so the frame sits on it.
  ctx.fillStyle = '#1c0d05';
  ctx.fillRect(0, 630, CANVAS_WIDTH, CANVAS_HEIGHT - 630);
  ctx.fillStyle = 'rgba(232, 182, 76, 0.25)';
  ctx.fillRect(0, 630, CANVAS_WIDTH, 3);

  // Carved wooden frame with a repeating diamond motif.
  ctx.fillStyle = '#241105';
  ctx.fillRect(70, 50, CANVAS_WIDTH - 140, 600);
  ctx.fillStyle = '#3a1c07';
  ctx.fillRect(78, 58, CANVAS_WIDTH - 156, 584);

  // The kelir screen: warm cloth lit by the lamp.
  const screenGrad = ctx.createRadialGradient(640, 300, 60, 640, 330, 620);
  screenGrad.addColorStop(0, '#f8ecc4');
  screenGrad.addColorStop(0.55, '#ecd9a0');
  screenGrad.addColorStop(1, '#c9a45e');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(90, 70, CANVAS_WIDTH - 180, 560);

  // Cloth weave: faint vertical and horizontal lines.
  ctx.strokeStyle = 'rgba(120, 84, 30, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 110; x < CANVAS_WIDTH - 90; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.lineTo(x, 630);
    ctx.stroke();
  }
  for (let y = 90; y < 630; y += 26) {
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(CANVAS_WIDTH - 90, y);
    ctx.stroke();
  }

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 70, CANVAS_WIDTH - 180, 560);
  ctx.fillStyle = GOLD;
  for (let x = 110; x < CANVAS_WIDTH - 100; x += 44) {
    drawDiamond(ctx, x, 64, 7);
    drawDiamond(ctx, x, 636, 7);
  }
  for (let y = 90; y < 620; y += 44) {
    drawDiamond(ctx, 84, y, 7);
    drawDiamond(ctx, CANVAS_WIDTH - 84, y, 7);
  }

  // Hanging lamp and its glow, flickering gently.
  const flicker = 0.85 + Math.sin(time / 240) * 0.08 + Math.sin(time / 97) * 0.05;
  const glow = ctx.createRadialGradient(640, 130, 10, 640, 130, 300 * flicker);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(280, 0, 720, 460);
  ctx.strokeStyle = '#1d0e04';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(640, 58);
  ctx.lineTo(640, 96);
  ctx.stroke();
  ctx.fillStyle = '#1d0e04';
  ctx.beginPath();
  ctx.moveTo(622, 96);
  ctx.lineTo(658, 96);
  ctx.lineTo(650, 138);
  ctx.lineTo(630, 138);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffb84d';
  ctx.beginPath();
  ctx.ellipse(640, 122, 9, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.ellipse(640, 124, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

function poseFor(fighter) {
  const t = fighter.stateFrame;
  const pose = {
    lean: 0.06,
    frontArm: 0.35,
    backArm: -0.35,
    frontLeg: 0.12,
    backLeg: -0.12,
    headTilt: 0,
  };
  if (fighter.state === 'walk') {
    const swing = Math.sin(fighter.walkCycle * 0.32);
    pose.frontLeg = swing * 0.55;
    pose.backLeg = -swing * 0.55;
    pose.lean = 0.13;
    pose.frontArm = 0.35 - swing * 0.25;
    pose.backArm = -0.35 + swing * 0.25;
  } else if (fighter.state === 'punch') {
    const progress = Math.min(1, t / 8);
    const extend = Math.sin(progress * Math.PI);
    pose.frontArm = 0.35 + extend * 1.15;
    pose.backArm = -0.35 - extend * 0.4;
    pose.lean = 0.06 + extend * 0.2;
  } else if (fighter.state === 'kick') {
    const progress = Math.min(1, t / 13);
    const extend = Math.sin(progress * Math.PI);
    pose.frontLeg = 0.12 + extend * 1.35;
    pose.backLeg = -0.5;
    pose.lean = -0.08 + extend * 0.1;
    pose.frontArm = 0.35 - extend * 0.5;
    pose.backArm = -0.9;
  } else if (fighter.state === 'block') {
    pose.frontArm = 1.15;
    pose.backArm = 1.05;
    pose.lean = -0.06;
  } else if (fighter.state === 'jump') {
    pose.frontLeg = 0.7;
    pose.backLeg = -0.55;
    pose.frontArm = -0.9;
    pose.backArm = -1.1;
    pose.lean = 0.1;
  } else if (fighter.state === 'hit') {
    pose.lean = -0.3;
    pose.frontArm = -1.2;
    pose.backArm = -1.4;
    pose.headTilt = -0.2;
  } else if (fighter.state === 'special') {
    const progress = Math.min(1, t / 10);
    pose.frontArm = 0.35 + progress * 1.0;
    pose.backArm = -0.35 - progress * 0.8;
    pose.lean = 0.2;
  } else if (fighter.state === 'win') {
    pose.frontArm = 2.6;
    pose.backArm = 2.6;
    pose.lean = -0.08;
  }
  return pose;
}

function drawFighter(ctx, fighter, time) {
  const def = fighter.def;
  const pose = poseFor(fighter);
  ctx.save();
  ctx.translate(fighter.x, GROUND_Y + fighter.y);
  if (fighter.state === 'ko') {
    ctx.rotate(-Math.PI / 2 * fighter.facing);
    ctx.translate(0, -30);
  }
  ctx.scale(fighter.facing, 1);

  // Ground shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 74, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Full-meter aura.
  if (fighter.meter >= SPECIAL_METER_MAX && fighter.state !== 'ko') {
    const pulse = 0.5 + Math.sin(time / 180) * 0.2;
    const aura = ctx.createRadialGradient(0, -140, 10, 0, -140, 190);
    aura.addColorStop(0, `rgba(247, 220, 138, ${0.35 * pulse})`);
    aura.addColorStop(1, 'rgba(247, 220, 138, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-200, -340, 400, 380);
  }

  const bob = fighter.state === 'idle' ? Math.sin(time / 420 + fighter.x) * 3 : 0;
  const hipX = 0;
  const hipY = -96 + bob;
  const shoulderX = pose.lean * 90;
  const shoulderY = -188 + bob;
  const headX = shoulderX + 10 + pose.headTilt * 20;
  const headY = -228 + bob;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Back leg.
  const backKnee = pointAt(hipX - 6, hipY, pose.backLeg, 52);
  const backFoot = pointAt(backKnee.x, backKnee.y, pose.backLeg * 0.6, 48);
  limb(ctx, hipX - 6, hipY, backKnee.x, backKnee.y, 13, INK);
  limb(ctx, backKnee.x, backKnee.y, backFoot.x, backFoot.y + 2, 11, INK);

  // Back arm.
  const backElbow = pointAt(shoulderX - 4, shoulderY + 6, pose.backArm, 52);
  const backHand = pointAt(backElbow.x, backElbow.y, pose.backArm * 0.7, 48);
  limb(ctx, shoulderX - 4, shoulderY + 6, backElbow.x, backElbow.y, 12, INK);
  limb(ctx, backElbow.x, backElbow.y, backHand.x, backHand.y, 10, INK);

  // Torso: a slender S-curved wayang body.
  ctx.beginPath();
  ctx.moveTo(shoulderX - 20, shoulderY);
  ctx.quadraticCurveTo(shoulderX - 26, -140, hipX - 16, hipY + 4);
  ctx.lineTo(hipX + 16, hipY + 4);
  ctx.quadraticCurveTo(shoulderX + 24, -140, shoulderX + 18, shoulderY);
  ctx.quadraticCurveTo(shoulderX, shoulderY - 12, shoulderX - 20, shoulderY);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Cloth sash and chest jewel.
  ctx.strokeStyle = def.cloth;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(shoulderX - 18, shoulderY + 8);
  ctx.lineTo(hipX + 14, hipY - 6);
  ctx.stroke();
  ctx.fillStyle = def.jewel;
  ctx.beginPath();
  ctx.arc(shoulderX + 2, shoulderY + 22, 6, 0, Math.PI * 2);
  ctx.fill();

  // Front leg.
  const frontKnee = pointAt(hipX + 6, hipY, pose.frontLeg, 52);
  const frontFoot = pointAt(frontKnee.x, frontKnee.y, pose.frontLeg * 0.6, 48);
  limb(ctx, hipX + 6, hipY, frontKnee.x, frontKnee.y, 14, INK);
  limb(ctx, frontKnee.x, frontKnee.y, frontFoot.x, frontFoot.y + 2, 12, INK);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(frontKnee.x - 6, frontKnee.y);
  ctx.lineTo(frontFoot.x - 6, frontFoot.y);
  ctx.stroke();

  // Head: wayang profile with a pointed nose.
  ctx.beginPath();
  ctx.moveTo(headX - 12, headY - 14);
  ctx.quadraticCurveTo(headX + 2, headY - 26, headX + 18, headY - 16);
  ctx.lineTo(headX + 30, headY - 4);
  ctx.lineTo(headX + 14, headY + 2);
  ctx.quadraticCurveTo(headX + 6, headY + 12, headX - 6, headY + 10);
  ctx.quadraticCurveTo(headX - 16, headY + 2, headX - 12, headY - 14);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Eye.
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.beginPath();
  ctx.ellipse(headX + 8, headY - 8, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Crown.
  ctx.fillStyle = INK;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  if (def.crown === 'slim') {
    ctx.beginPath();
    ctx.moveTo(headX - 12, headY - 18);
    ctx.lineTo(headX - 4, headY - 62);
    ctx.lineTo(headX + 4, headY - 62);
    ctx.lineTo(headX + 10, headY - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = def.jewel;
    ctx.beginPath();
    ctx.arc(headX, headY - 52, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(headX - 16, headY - 16);
    ctx.lineTo(headX - 22, headY - 48);
    ctx.lineTo(headX - 8, headY - 38);
    ctx.lineTo(headX, headY - 56);
    ctx.lineTo(headX + 10, headY - 38);
    ctx.lineTo(headX + 24, headY - 48);
    ctx.lineTo(headX + 14, headY - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Two small heads peeking behind the crown: the ten-headed king.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(headX - 20, headY - 30, 8, 0, Math.PI * 2);
    ctx.arc(headX + 22, headY - 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Fangs.
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(headX + 12, headY + 2);
    ctx.lineTo(headX + 16, headY + 10);
    ctx.lineTo(headX + 8, headY + 6);
    ctx.closePath();
    ctx.fill();
  }

  // Front arm.
  const frontElbow = pointAt(shoulderX + 4, shoulderY + 6, pose.frontArm, 52);
  const frontHand = pointAt(frontElbow.x, frontElbow.y, pose.frontArm * 0.7, 48);
  limb(ctx, shoulderX + 4, shoulderY + 6, frontElbow.x, frontElbow.y, 12, INK);
  limb(ctx, frontElbow.x, frontElbow.y, frontHand.x, frontHand.y, 10, INK);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(shoulderX + 4, shoulderY + 6);
  ctx.lineTo(frontElbow.x, frontElbow.y);
  ctx.lineTo(frontHand.x, frontHand.y);
  ctx.stroke();

  // Weapon in the back hand.
  if (def.weapon === 'bow') {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(backHand.x - 6, backHand.y - 20, 42, -1.1, 1.1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(247, 220, 138, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(backHand.x - 6 + Math.cos(-1.1) * 42, backHand.y - 20 + Math.sin(-1.1) * 42);
    ctx.lineTo(backHand.x - 6 + Math.cos(1.1) * 42, backHand.y - 20 + Math.sin(1.1) * 42);
    ctx.stroke();
  } else {
    limb(ctx, backHand.x, backHand.y, backHand.x - 14, backHand.y - 46, 8, '#3a1c07');
    ctx.fillStyle = INK;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(backHand.x - 16, backHand.y - 56, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(backHand.x - 16 + Math.cos(a) * 12, backHand.y - 56 + Math.sin(a) * 12);
      ctx.lineTo(backHand.x - 16 + Math.cos(a) * 19, backHand.y - 56 + Math.sin(a) * 19);
      ctx.stroke();
    }
  }

  // Hit flash.
  if (fighter.state === 'hit') {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.ellipse(0, -140, 70, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawProjectile(ctx, proj, time) {
  ctx.save();
  if (proj.kind === 'arrow') {
    const dir = proj.vx > 0 ? 1 : -1;
    ctx.translate(proj.x, proj.y);
    ctx.scale(dir, 1);
    ctx.strokeStyle = GOLD_BRIGHT;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.beginPath();
    ctx.moveTo(42, 0);
    ctx.lineTo(26, -7);
    ctx.lineTo(26, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, -8);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-34, 8);
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    const flicker = 1 + Math.sin(time / 60 + proj.x / 30) * 0.15;
    const grad = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, 34 * flicker);
    grad.addColorStop(0, '#fff3c4');
    grad.addColorStop(0.4, '#ff9d4d');
    grad.addColorStop(1, 'rgba(200, 40, 10, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 34 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y - 4, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.gold ? GOLD_BRIGHT : '#ff8a5c';
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, world) {
  for (const f of world.floats) {
    const alpha = Math.max(0, f.life / 42);
    ctx.globalAlpha = alpha;
    goldText(ctx, f.text, f.x, f.y, f.big ? 54 : 26, `bold ${f.big ? 54 : 26}px Georgia, serif`);
  }
  ctx.globalAlpha = 1;
}

function healthBar(ctx, x, y, width, health, flip, name, meter, roundsWon) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 4, y - 4, width + 8, 30);
  ctx.fillStyle = '#3a0d06';
  ctx.fillRect(x, y, width, 22);
  const ratio = Math.max(0, health / MAX_HEALTH);
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, '#ff5a3c');
  grad.addColorStop(1, GOLD);
  ctx.fillStyle = grad;
  if (flip) {
    ctx.fillRect(x + width * (1 - ratio), y, width * ratio, 22);
  } else {
    ctx.fillRect(x, y, width * ratio, 22);
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, 22);
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = flip ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2a1503';
  ctx.strokeText(name, flip ? x + width : x, y - 8);
  ctx.fillStyle = CREAM;
  ctx.fillText(name, flip ? x + width : x, y - 8);
  // Round pips.
  for (let i = 0; i < 2; i++) {
    const px = flip ? x + width - 14 - i * 26 : x + 14 + i * 26;
    ctx.beginPath();
    ctx.arc(px, y + 40, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < roundsWon ? GOLD_BRIGHT : 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Special meter.
  const meterWidth = width * 0.62;
  const meterX = flip ? x + width - meterWidth : x;
  const meterY = y + 54;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(meterX - 2, meterY - 2, meterWidth + 4, 12);
  ctx.fillStyle = '#241105';
  ctx.fillRect(meterX, meterY, meterWidth, 8);
  const meterRatio = meter / SPECIAL_METER_MAX;
  ctx.fillStyle = meterRatio >= 1 ? GOLD_BRIGHT : '#b98a2e';
  ctx.fillRect(meterX, meterY, meterWidth * meterRatio, 8);
  if (meterRatio >= 1) {
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = flip ? 'right' : 'left';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2a1503';
    ctx.strokeText('SPECIAL SIAP!', flip ? meterX + meterWidth : meterX, meterY + 24);
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.fillText('SPECIAL SIAP!', flip ? meterX + meterWidth : meterX, meterY + 24);
  }
}

function drawHUD(ctx, world) {
  const barWidth = 460;
  healthBar(ctx, 90, 84, barWidth, world.player.health, false, world.player.def.name, world.player.meter, world.player.roundsWon);
  healthBar(ctx, CANVAS_WIDTH - 90 - barWidth, 84, barWidth, world.opponent.health, true, world.opponent.def.name, world.opponent.meter, world.opponent.roundsWon);
  // Timer.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, 108, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  goldText(ctx, String(timerSeconds(world)), CANVAS_WIDTH / 2, 110, 40, 'bold 40px Georgia, serif');
  // Round label.
  goldText(ctx, `RONDE ${world.round}`, CANVAS_WIDTH / 2, 168, 15, 'bold 15px Georgia, serif');
}

function drawTitleScreen(ctx, world, time) {
  ctx.fillStyle = 'rgba(20, 8, 2, 0.38)';
  ctx.fillRect(90, 70, CANVAS_WIDTH - 180, 560);
  const bob = Math.sin(time / 500) * 6;
  goldText(ctx, 'WAYANG', CANVAS_WIDTH / 2, 218 + bob, 92, 'bold 92px Georgia, serif');
  goldText(ctx, 'CLASH', CANVAS_WIDTH / 2, 306 + bob, 92, 'bold 92px Georgia, serif');
  ctx.font = 'italic 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.fillText('Arjuna melawan Rahwana di atas layar kelir', CANVAS_WIDTH / 2, 366);
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#e8d9a8';
  ctx.fillText('A / D bergerak    W lompat    S bertahan', CANVAS_WIDTH / 2, 430);
  ctx.fillText('J pukul    K tendang    L jurus spesial (meter penuh)', CANVAS_WIDTH / 2, 462);
  const pulse = 0.6 + Math.sin(time / 300) * 0.4;
  ctx.globalAlpha = pulse;
  goldText(ctx, 'TEKAN ENTER UNTUK BERTANDING', CANVAS_WIDTH / 2, 540, 28, 'bold 28px Georgia, serif');
  ctx.globalAlpha = 1;
}

function drawIntroOverlay(ctx, world) {
  if (world.phase !== 'intro') return;
  if (world.phaseFrame < 70) {
    goldText(ctx, `RONDE ${world.round}`, CANVAS_WIDTH / 2, 330, 84, 'bold 84px Georgia, serif');
  } else {
    goldText(ctx, 'FIGHT!', CANVAS_WIDTH / 2, 330, 96, 'bold 96px Georgia, serif');
  }
}

function drawRoundEndOverlay(ctx, world) {
  if (world.phase !== 'roundEnd') return;
  if (world.phaseFrame > 90) return;
  const text = world.roundWinner ? 'K.O.!' : 'WAKTU HABIS!';
  const scale = 1 + Math.max(0, 20 - world.phaseFrame) * 0.03;
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, 330);
  ctx.scale(scale, scale);
  goldText(ctx, text, 0, 0, 96, 'bold 96px Georgia, serif');
  ctx.restore();
}

function drawMatchEndOverlay(ctx, world, time) {
  if (world.phase !== 'matchEnd' || !world.winner) return;
  ctx.fillStyle = 'rgba(20, 8, 2, 0.45)';
  ctx.fillRect(90, 70, CANVAS_WIDTH - 180, 560);
  goldText(ctx, `${world.winner.def.name} MENANG!`, CANVAS_WIDTH / 2, 300, 72, 'bold 72px Georgia, serif');
  ctx.font = 'italic 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2a1503';
  ctx.strokeText(world.winner.def.flavor, CANVAS_WIDTH / 2, 360);
  ctx.fillStyle = CREAM;
  ctx.fillText(world.winner.def.flavor, CANVAS_WIDTH / 2, 360);
  ctx.font = '22px Georgia, serif';
  ctx.lineWidth = 4;
  ctx.strokeText(`${world.player.roundsWon} — ${world.opponent.roundsWon} ronde`, CANVAS_WIDTH / 2, 410);
  ctx.fillStyle = '#e8d9a8';
  ctx.fillText(`${world.player.roundsWon} — ${world.opponent.roundsWon} ronde`, CANVAS_WIDTH / 2, 410);
  const pulse = 0.6 + Math.sin(time / 300) * 0.4;
  ctx.globalAlpha = pulse;
  goldText(ctx, 'TEKAN R UNTUK BERTANDING LAGI', CANVAS_WIDTH / 2, 490, 26, 'bold 26px Georgia, serif');
  ctx.globalAlpha = 1;
}

export function drawScene(ctx, world, time) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  if (world.shake > 0.5) {
    ctx.translate((world.rng.next() - 0.5) * world.shake, (world.rng.next() - 0.5) * world.shake);
  }
  drawStage(ctx, time);
  drawFighter(ctx, world.opponent, time);
  drawFighter(ctx, world.player, time);
  for (const proj of world.projectiles) drawProjectile(ctx, proj, time);
  drawParticles(ctx, world);
  drawFloats(ctx, world);
  ctx.restore();
  if (world.phase !== 'title') drawHUD(ctx, world);
  drawIntroOverlay(ctx, world);
  drawRoundEndOverlay(ctx, world);
  drawMatchEndOverlay(ctx, world, time);
  if (world.phase === 'title') drawTitleScreen(ctx, world, time);
}
