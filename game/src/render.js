// Canvas 2D vector art: a farmyard at golden hour, the turkey running for its
// life, the farmer in pursuit. One logical playfield (1280x720) scaled to the
// window; every picture is drawn from the world state, nothing is an image.

import { ESCAPE_DISTANCE, FIELD, LIVES, PALETTE, FONT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  }

  function drawBackground(state) {
    const { scroll } = state;
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // Sun.
    ctx.fillStyle = PALETTE.sunCore;
    ellipse(ctx, 1120, 110, 52, 52);
    ctx.fillStyle = PALETTE.sun;
    ctx.globalAlpha = 0.45;
    ellipse(ctx, 1120, 110, 78, 78);
    ctx.globalAlpha = 1;
    // Clouds drift slowly with the scroll.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 420 - scroll * 0.12) % 1500 + 1500) % 1500 - 110;
      const cy = 70 + i * 42;
      ellipse(ctx, cx, cy, 62, 20);
      ellipse(ctx, cx + 44, cy + 8, 44, 16);
      ellipse(ctx, cx - 46, cy + 8, 40, 14);
    }
    // Hills, two layers.
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 40) {
      const hx = x - ((scroll * 0.25) % 480);
      ctx.lineTo(hx, FIELD.groundY - 90 - Math.sin((x + scroll * 0.25) / 260) * 46);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 40) {
      ctx.lineTo(x, FIELD.groundY - 34 - Math.sin((x + scroll * 0.45) / 190 + 2) * 22);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();
    // The barn and the windmill roll by in the midground.
    const barnX = ((260 - scroll * 0.5) % 2400 + 2400) % 2400 - 300;
    drawBarn(barnX, FIELD.groundY - 150);
    const millX = ((1500 - scroll * 0.5) % 2400 + 2400) % 2400 - 300;
    drawWindmill(millX, FIELD.groundY - 170, state.time);
    // Trees in the midground.
    for (let i = 0; i < 3; i += 1) {
      const tx = ((i * 760 + 420 - scroll * 0.5) % 2400 + 2400) % 2400 - 300;
      drawTree(tx, FIELD.groundY - 8);
    }
    // Ground.
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 16);
    ctx.fillStyle = PALETTE.grassDark;
    for (let x = 0; x < FIELD.width; x += 46) {
      const gx = x - (scroll % 46);
      ctx.fillRect(gx, FIELD.groundY + 2, 4, 10);
      ctx.fillRect(gx + 12, FIELD.groundY + 6, 3, 8);
    }
    // Fence posts rush past on the ground.
    ctx.fillStyle = PALETTE.fence;
    for (let x = 0; x < FIELD.width + 90; x += 90) {
      const fx = x - (scroll % 90);
      ctx.fillRect(fx, FIELD.groundY - 52, 8, 52);
      ctx.fillRect(fx - 8, FIELD.groundY - 40, 104, 6);
      ctx.fillRect(fx - 8, FIELD.groundY - 22, 104, 6);
    }
  }

  function drawBarn(x, y) {
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(x, y, 190, 150);
    ctx.fillStyle = PALETTE.barnRoof;
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x + 95, y - 62);
    ctx.lineTo(x + 202, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.barnTrim;
    ctx.fillRect(x + 74, y + 58, 42, 92);
    ctx.strokeStyle = PALETTE.barnTrim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 74, y + 58);
    ctx.lineTo(x + 116, y + 150);
    ctx.moveTo(x + 116, y + 58);
    ctx.lineTo(x + 74, y + 150);
    ctx.stroke();
    ctx.fillStyle = PALETTE.barnTrim;
    ctx.fillRect(x + 20, y + 24, 34, 34);
    ctx.fillRect(x + 136, y + 24, 34, 34);
  }

  function drawWindmill(x, y, time) {
    ctx.strokeStyle = PALETTE.fence;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y + 170);
    ctx.lineTo(x + 14, y + 30);
    ctx.moveTo(x + 28, y + 170);
    ctx.lineTo(x + 14, y + 30);
    ctx.stroke();
    const angle = time * 0.9;
    ctx.save();
    ctx.translate(x + 14, y + 22);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.barnTrim;
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, -14);
      ctx.lineTo(52, -6);
      ctx.lineTo(52, 4);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTree(x, groundY) {
    ctx.fillStyle = PALETTE.treeTrunk;
    ctx.fillRect(x - 7, groundY - 66, 14, 66);
    ctx.fillStyle = PALETTE.tree;
    ellipse(ctx, x, groundY - 96, 44, 40);
    ellipse(ctx, x - 30, groundY - 72, 28, 24);
    ellipse(ctx, x + 30, groundY - 72, 28, 24);
  }

  function drawTurkey(t, blink) {
    if (blink && Math.floor(t.invulnerable * 12) % 2 === 0 && t.invulnerable > 0) return;
    const x = t.x;
    const height = t.sliding ? 40 : 76;
    // The body follows the jump: t.y is the top of the body while airborne.
    // When sliding the turkey crouches to the ground.
    const y = t.sliding ? FIELD.groundY - height : t.y;
    const legSwing = t.grounded ? Math.sin(t.runPhase) * 14 : 8;
    ctx.save();
    ctx.translate(x + 32, y + height);
    // Tail fan, behind the body.
    for (let i = 0; i < 5; i += 1) {
      const angle = -0.9 + i * 0.45;
      ctx.save();
      ctx.translate(-26, -34);
      ctx.rotate(angle - 0.4);
      ctx.fillStyle = PALETTE.turkeyTail[i];
      ctx.beginPath();
      ctx.ellipse(0, -26, 9, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Legs.
    ctx.strokeStyle = PALETTE.turkeyLeg;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-6 + legSwing, 0);
    ctx.moveTo(8, -8);
    ctx.lineTo(8 - legSwing, 0);
    ctx.stroke();
    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ellipse(ctx, 0, -34, 30, 26);
    ctx.fillStyle = PALETTE.turkeyBelly;
    ellipse(ctx, 6, -28, 18, 15);
    // Wing.
    ctx.fillStyle = '#6e4522';
    ctx.save();
    ctx.translate(-4, -36);
    ctx.rotate(t.grounded ? Math.sin(t.runPhase) * 0.25 : -0.9);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Head, beak, wattle, eye.
    ctx.fillStyle = PALETTE.turkeyHead;
    ellipse(ctx, 26, -58, 13, 12);
    ctx.fillStyle = PALETTE.turkeyBeak;
    ctx.beginPath();
    ctx.moveTo(36, -62);
    ctx.lineTo(50, -57);
    ctx.lineTo(36, -53);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyWattle;
    ellipse(ctx, 32, -46, 4, 8);
    ctx.fillStyle = '#1c1c1c';
    ellipse(ctx, 30, -61, 2.6, 2.6);
    ctx.restore();
  }

  function drawFarmer(state) {
    const gap = state.farmerGap;
    const x = state.turkey.x - gap;
    if (x < -140 || x > FIELD.width + 40) return;
    const runPhase = state.turkey.runPhase * 1.05;
    const y = FIELD.groundY;
    const dazed = state.farmerStun > 0;
    ctx.save();
    ctx.translate(x + 30, y);
    const legSwing = Math.sin(runPhase) * 16;
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -52);
    ctx.lineTo(-8 + legSwing, 0);
    ctx.moveTo(8, -52);
    ctx.lineTo(8 - legSwing, 0);
    ctx.stroke();
    // Overalls and shirt.
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(-18, -96, 36, 48);
    ctx.fillStyle = PALETTE.farmerShirt;
    ctx.fillRect(-20, -118, 40, 26);
    // Arms pumping, one holding the pitchfork.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-14, -110);
    ctx.lineTo(-30, -88 + Math.sin(runPhase) * 8);
    ctx.moveTo(14, -110);
    ctx.lineTo(30, -92 - Math.sin(runPhase) * 8);
    ctx.stroke();
    ctx.strokeStyle = '#8a8f98';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, -140);
    ctx.lineTo(30, -40);
    ctx.moveTo(22, -140);
    ctx.lineTo(38, -140);
    ctx.moveTo(22, -128);
    ctx.lineTo(38, -128);
    ctx.stroke();
    // Head, hat, beard, angry brows.
    ctx.fillStyle = PALETTE.farmerSkin;
    ellipse(ctx, 0, -132, 15, 15);
    ctx.fillStyle = PALETTE.farmerBeard;
    ellipse(ctx, 2, -120, 12, 8);
    ctx.fillStyle = PALETTE.farmerHat;
    ctx.fillRect(-18, -150, 36, 8);
    ctx.fillRect(-12, -166, 24, 18);
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -138);
    ctx.lineTo(-2, -134);
    ctx.moveTo(8, -138);
    ctx.lineTo(2, -134);
    ctx.stroke();
    if (dazed) {
      ctx.fillStyle = '#ffd94d';
      for (let i = 0; i < 3; i += 1) {
        const a = state.time * 3 + (i * Math.PI * 2) / 3;
        ellipse(ctx, Math.cos(a) * 22, -150 + Math.sin(a) * 8, 4, 4);
      }
    }
    ctx.restore();
  }

  function drawOven(ob) {
    ctx.fillStyle = PALETTE.oven;
    roundRect(ctx, ob.x, ob.y, ob.width, ob.height, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.ovenDoor;
    roundRect(ctx, ob.x + 14, ob.y + 44, ob.width - 28, 52, 6);
    ctx.fill();
    // Fire glow in the door window.
    ctx.fillStyle = PALETTE.ovenFire;
    roundRect(ctx, ob.x + 24, ob.y + 56, ob.width - 48, 28, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.ovenGlow;
    ellipse(ctx, ob.x + ob.width / 2, ob.y + 70, 14, 8);
    // Chimney with smoke.
    ctx.fillStyle = PALETTE.oven;
    ctx.fillRect(ob.x + ob.width - 26, ob.y - 34, 18, 36);
    ctx.fillStyle = 'rgba(220,220,220,0.55)';
    ellipse(ctx, ob.x + ob.width - 17, ob.y - 52, 10, 8);
    ellipse(ctx, ob.x + ob.width - 8, ob.y - 68, 13, 9);
    // Danger sign.
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(ob.x + ob.width / 2, ob.y + 10);
    ctx.lineTo(ob.x + ob.width / 2 + 12, ob.y + 32);
    ctx.lineTo(ob.x + ob.width / 2 - 12, ob.y + 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('!', ob.x + ob.width / 2, ob.y + 29);
  }

  function drawObstacle(ob) {
    if (ob.kind === 'oven') { drawOven(ob); return; }
    if (ob.kind === 'line') {
      // A washing line at head height: the turkey must slide under the sheet.
      ctx.strokeStyle = PALETTE.fence;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(ob.x - 8, FIELD.groundY);
      ctx.lineTo(ob.x - 8, ob.y - 6);
      ctx.moveTo(ob.x + ob.width + 8, FIELD.groundY);
      ctx.lineTo(ob.x + ob.width + 8, ob.y - 6);
      ctx.stroke();
      ctx.strokeStyle = '#5a4632';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ob.x - 8, ob.y - 6);
      ctx.lineTo(ob.x + ob.width + 8, ob.y - 6);
      ctx.stroke();
      ctx.fillStyle = '#f3e6c8';
      ctx.fillRect(ob.x + 2, ob.y - 4, ob.width - 4, 34);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(ob.x + 2, ob.y - 4, ob.width - 4, 8);
      return;
    }
    if (ob.kind === 'bale') {
      ctx.fillStyle = PALETTE.hay;
      ellipse(ctx, ob.x + ob.width / 2, ob.y + ob.height / 2, ob.width / 2, ob.height / 2);
      ctx.strokeStyle = PALETTE.hayDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.width / 2, ob.y + ob.height / 2, ob.width / 2 - 8, ob.height / 2 - 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ob.x + 10, ob.y + 8);
      ctx.lineTo(ob.x + ob.width - 10, ob.y + ob.height - 8);
      ctx.moveTo(ob.x + ob.width - 10, ob.y + 8);
      ctx.lineTo(ob.x + 10, ob.y + ob.height - 8);
      ctx.stroke();
      return;
    }
    if (ob.kind === 'fence') {
      ctx.fillStyle = PALETTE.fence;
      ctx.fillRect(ob.x, ob.y, 8, ob.height);
      ctx.fillRect(ob.x + ob.width - 8, ob.y, 8, ob.height);
      ctx.fillRect(ob.x - 6, ob.y + 10, ob.width + 12, 8);
      ctx.fillRect(ob.x - 6, ob.y + 42, ob.width + 12, 8);
      ctx.fillRect(ob.x - 6, ob.y + 70, ob.width + 12, 8);
      return;
    }
    if (ob.kind === 'mud') {
      ctx.fillStyle = PALETTE.mud;
      ellipse(ctx, ob.x + ob.width / 2, ob.y + ob.height / 2, ob.width / 2, ob.height / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ellipse(ctx, ob.x + 30, ob.y + 5, 22, 4);
      ellipse(ctx, ob.x + 90, ob.y + 8, 16, 3);
      return;
    }
    if (ob.kind === 'scarecrow') {
      ctx.strokeStyle = PALETTE.treeTrunk;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ob.x + ob.width / 2, ob.y + ob.height);
      ctx.lineTo(ob.x + ob.width / 2, ob.y + 20);
      ctx.moveTo(ob.x + 2, ob.y + 44);
      ctx.lineTo(ob.x + ob.width - 2, ob.y + 44);
      ctx.stroke();
      ctx.fillStyle = PALETTE.farmerShirt;
      ctx.beginPath();
      ctx.moveTo(ob.x + 2, ob.y + 44);
      ctx.lineTo(ob.x + ob.width / 2, ob.y + 18);
      ctx.lineTo(ob.x + ob.width - 2, ob.y + 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.hay;
      ellipse(ctx, ob.x + ob.width / 2, ob.y + 12, 13, 12);
      ctx.fillStyle = PALETTE.farmerHat;
      ctx.beginPath();
      ctx.moveTo(ob.x + ob.width / 2 - 20, ob.y + 6);
      ctx.lineTo(ob.x + ob.width / 2 + 20, ob.y + 6);
      ctx.lineTo(ob.x + ob.width / 2, ob.y - 12);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawKnife(knife, time) {
    if (knife.warning > 0) {
      // Telegraph: a shadow and a glint where the knife will land. The mark
      // scrolls with the world, so it always points at the landing spot.
      const pulse = 0.5 + 0.5 * Math.sin(time * 14);
      ctx.fillStyle = PALETTE.knifeShadow;
      ellipse(ctx, knife.x + 15, FIELD.groundY - 4, 30, 8);
      ctx.fillStyle = `rgba(255, 80, 60, ${0.35 + pulse * 0.4})`;
      ctx.font = 'bold 26px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('!', knife.x + 15, FIELD.groundY - 52);
      return;
    }
    ctx.save();
    ctx.translate(knife.x + 15, knife.y + 48);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(-13, -44);
    ctx.lineTo(13, -44);
    ctx.lineTo(13, 22);
    ctx.lineTo(0, 48);
    ctx.lineTo(-13, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.knifeEdge;
    ctx.fillRect(-13, -44, 4, 66);
    ctx.fillStyle = PALETTE.knifeHandle;
    roundRect(ctx, -9, -48 - 22, 18, 24, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(p) {
    const bobY = Math.sin(p.bob) * 4;
    if (p.kind === 'corn' || p.kind === 'golden') {
      ctx.save();
      ctx.translate(p.x + 15, p.y + 15 + bobY);
      ctx.rotate(-0.5);
      ctx.fillStyle = p.kind === 'golden' ? PALETTE.goldenCorn : PALETTE.corn;
      ellipse(ctx, 0, 0, 10, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = -1; i <= 1; i += 1) ctx.fillRect(i * 6 - 1, -12, 2, 24);
      ctx.fillStyle = PALETTE.cornHusk;
      ctx.beginPath();
      ctx.moveTo(-8, 10);
      ctx.lineTo(-14, 26);
      ctx.lineTo(-2, 16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, 10);
      ctx.lineTo(14, 26);
      ctx.lineTo(2, 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    if (p.kind === 'chili') {
      ctx.save();
      ctx.translate(p.x + 17, p.y + 20 + bobY);
      ctx.fillStyle = PALETTE.chili;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(14, 2, 6, 16);
      ctx.quadraticCurveTo(-6, 18, -8, 2);
      ctx.quadraticCurveTo(-6, -10, 0, -16);
      ctx.fill();
      ctx.strokeStyle = PALETTE.chiliStem;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(4, -24, 10, -22);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (p.kind === 'haystack') {
      ctx.fillStyle = PALETTE.hayDark;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, FIELD.groundY);
      ctx.quadraticCurveTo(p.x + p.width / 2, p.y - 14, p.x + p.width + 4, FIELD.groundY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.hay;
      ctx.beginPath();
      ctx.moveTo(p.x + 6, FIELD.groundY);
      ctx.quadraticCurveTo(p.x + p.width / 2, p.y + 4, p.x + p.width - 6, FIELD.groundY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.hayDark;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(p.x + 12 + i * 16, FIELD.groundY - 8);
        ctx.lineTo(p.x + 18 + i * 16, p.y + 22);
        ctx.stroke();
      }
    }
  }

  function drawHud(state, screen) {
    const distance = Math.floor(state.distance);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillText(`SCORE ${Math.floor(state.score)}`, 24, 48);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '20px ' + FONT;
    ctx.fillText(`BEST ${Math.max(0, state.best || 0)}`, 24, 76);
    // Distance and escape progress, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 30px ' + FONT;
    ctx.fillText(`${distance} m  /  ${ESCAPE_DISTANCE} m to the forest`, FIELD.width / 2, 46);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, FIELD.width / 2 - 190, 58, 380, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#7ed957';
    roundRect(ctx, FIELD.width / 2 - 190, 58, 380 * Math.min(1, state.distance / ESCAPE_DISTANCE), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#3f7d33';
    const treeX = FIELD.width / 2 + 208;
    ctx.beginPath();
    ctx.moveTo(treeX, 52);
    ctx.lineTo(treeX + 10, 70);
    ctx.lineTo(treeX - 10, 70);
    ctx.closePath();
    ctx.fill();
    // Lives, top right.
    for (let i = 0; i < LIVES; i += 1) {
      const hx = FIELD.width - 36 - i * 44;
      const hy = 34;
      ctx.fillStyle = i < state.lives ? PALETTE.heart : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 10);
      ctx.bezierCurveTo(hx - 14, hy - 4, hx - 8, hy - 16, hx, hy - 6);
      ctx.bezierCurveTo(hx + 8, hy - 16, hx + 14, hy - 4, hx, hy + 10);
      ctx.fill();
    }
    // Stamina bar, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('STAMINA', 24, FIELD.height - 52);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, 24, FIELD.height - 44, 220, 14, 7);
    ctx.fill();
    ctx.fillStyle = state.stamina < 25 ? PALETTE.staminaLow : PALETTE.stamina;
    roundRect(ctx, 24, FIELD.height - 44, 220 * (state.stamina / 100), 14, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText('SHIFT to sprint  •  SPACE to jump  •  ↓ to slide', 24, FIELD.height - 16);
    // Farmer gap meter, bottom right.
    const gapRatio = Math.min(1, state.farmerGap / 360);
    ctx.textAlign = 'right';
    ctx.fillStyle = state.farmerGap < 120 ? PALETTE.danger : PALETTE.text;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText(state.farmerGap < 120 ? 'THE FARMER IS CLOSE!' : 'FARMER', FIELD.width - 24, FIELD.height - 52);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, FIELD.width - 244, FIELD.height - 44, 220, 14, 7);
    ctx.fill();
    ctx.fillStyle = gapRatio > 0.5 ? '#7ed957' : gapRatio > 0.25 ? '#ff9f1c' : PALETTE.danger;
    roundRect(ctx, FIELD.width - 244, FIELD.height - 44, 220 * gapRatio, 14, 7);
    ctx.fill();
    if (state.boostTimer > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b5e';
      ctx.font = 'bold 26px ' + FONT;
      ctx.fillText(`SPEED BOOST ${state.boostTimer.toFixed(1)}s`, FIELD.width / 2, FIELD.height - 24);
    }
    if (screen === SCREEN_PLAY && state.turkey.invulnerable > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 20px ' + FONT;
      ctx.fillText('SHAKEN — RUN!', FIELD.width / 2, 110);
    }
  }

  function drawPanel(title, lines, accent) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, FIELD.width / 2 - 360, 150, 720, 380, 18);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || PALETTE.text;
    ctx.font = 'bold 64px ' + FONT;
    ctx.fillText(title, FIELD.width / 2, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '26px ' + FONT;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, 300 + i * 40);
    });
  }

  function draw(state, screen, best) {
    fit();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawBackground(state);
    const view = { ...state, best };
    for (const ob of state.obstacles) drawObstacle(ob);
    for (const p of state.pickups) drawPickup(p);
    for (const knife of state.knives) drawKnife(knife, state.time);
    // Feathers and popups.
    for (const f of state.feathers) {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = Math.max(0, f.ttl);
      ellipse(ctx, f.x, f.y, f.size, f.size * 0.6);
    }
    ctx.globalAlpha = 1;
    drawFarmer(state);
    drawTurkey(state.turkey, screen === SCREEN_PLAY);
    for (const popup of state.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, popup.ttl));
      ctx.fillStyle = popup.color;
      ctx.font = 'bold 24px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(20, 24, 32, 0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 96px ' + FONT;
      ctx.fillText('GOBBLE DASH', FIELD.width / 2, 200);
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 34px ' + FONT;
      ctx.fillText('Run, turkey, run! Thanksgiving is coming.', FIELD.width / 2, 252);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '24px ' + FONT;
      ctx.fillText('SPACE / CLICK — jump      ↓ — slide      SHIFT — sprint', FIELD.width / 2, 320);
      ctx.fillText('← → or mouse — dodge      Dodge the oven and the falling knives.', FIELD.width / 2, 356);
      ctx.fillText('Grab corn for points. Hide in the haystack. Reach the forest at 600 m!', FIELD.width / 2, 392);
      if (best > 0) {
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '22px ' + FONT;
        ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 440);
      }
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 28px ' + FONT;
      ctx.fillText('Press SPACE or CLICK to start', FIELD.width / 2, 500);
      drawHud(view, screen);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawHud(view, screen);
      drawPanel('PAUSED', ['Take a breath, turkey.', 'Press P or SPACE to keep running.'], '#ffd94d');
      return;
    }
    if (screen === SCREEN_OVER) {
      drawHud(view, screen);
      if (state.outcome === 'escaped') {
        drawPanel('ESCAPED!', [
          `You made it to the forest — ${Math.floor(state.distance)} m!`,
          `Score ${Math.floor(state.score)}   •   Best ${Math.max(best, Math.floor(state.score))}`,
          `Corn ${state.cornCollected}   •   Near misses ${state.nearMisses}`,
          'Press SPACE or CLICK to run again.',
        ], '#7ed957');
      } else {
        drawPanel('CAUGHT!', [
          'The farmer got you. Dinner is served…',
          `Score ${Math.floor(state.score)}   •   Best ${Math.max(best, Math.floor(state.score))}`,
          `Distance ${Math.floor(state.distance)} m of ${ESCAPE_DISTANCE} m`,
          'Press SPACE or CLICK to run again.',
        ], PALETTE.danger);
      }
      return;
    }
    drawHud(view, screen);
  }

  return { draw };
}
