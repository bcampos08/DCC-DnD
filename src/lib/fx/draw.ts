import { ELEMENT_COLOR, EMITS_LIGHT, timeline, type FxEvent, type Pt, type Weapon } from './core';

// Draws one frame of an effect onto a 2D canvas in map coordinates.
// t = ms since the effect started. Light sources for dark scenes are pushed onto `lights`.

type Ctx = CanvasRenderingContext2D;
export interface Light { x: number; y: number; r: number }

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
const easeIn = (k: number) => Math.pow(clamp(k), 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpPt = (a: Pt, b: Pt, k: number) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

function glow(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string, alpha = 1) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// Where a missed attack ends up: beside and past the target.
function missPoint(fx: FxEvent, from: Pt) {
  const a = Math.atan2(fx.to.y - from.y, fx.to.x - from.x);
  const side = (fx.id.charCodeAt(0) % 2 ? 1 : -1) * fx.grid * 0.7;
  return { x: fx.to.x + Math.cos(a) * fx.grid * 1.4 - Math.sin(a) * side, y: fx.to.y + Math.sin(a) * fx.grid * 1.4 + Math.cos(a) * side };
}

function floatText(ctx: Ctx, fx: FxEvent, t0: number, t: number) {
  if (!fx.result || t < t0) return;
  const k = (t - t0) / 900;
  if (k > 1) return;
  const text = fx.result === 'crit' ? 'CRITICAL!' : fx.result === 'hit' ? 'HIT' : 'MISS';
  const size = fx.grid * (fx.result === 'crit' ? 0.75 : 0.55);
  ctx.save();
  ctx.globalAlpha = 1 - easeIn(k);
  ctx.font = `900 ${size}px Alegreya SC, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#000';
  ctx.fillStyle = fx.result === 'crit' ? '#fde047' : fx.result === 'hit' ? '#fca5a5' : '#cbd5e1';
  const y = fx.to.y - fx.grid * 0.75 - k * fx.grid * 0.6;
  ctx.strokeText(text, fx.to.x, y); ctx.fillText(text, fx.to.x, y);
  ctx.restore();
}

function impact(ctx: Ctx, fx: FxEvent, at: Pt, k: number) {
  // k: 0..1 over the impact flash
  if (k < 0 || k > 1) return;
  const [inner, outer] = ELEMENT_COLOR[fx.element];
  const crit = fx.result === 'crit';
  const R = fx.grid * (crit ? 1.7 : 1.05);
  glow(ctx, at.x, at.y, R * easeOut(k * 2), inner, outer, 1 - k);
  const r = rng(fx.id + 'imp');
  ctx.save();
  ctx.strokeStyle = fx.element === 'physical' ? '#fff' : inner;
  ctx.lineCap = 'round';
  for (let i = 0; i < (crit ? 16 : 9); i++) {
    const a = r() * Math.PI * 2, len = R * (0.4 + r() * 0.8);
    const d0 = len * easeOut(k) * 0.4, d1 = len * easeOut(k);
    ctx.globalAlpha = 1 - k; ctx.lineWidth = fx.grid * 0.04 * (1 - k) + 1;
    ctx.beginPath(); ctx.moveTo(at.x + Math.cos(a) * d0, at.y + Math.sin(a) * d0); ctx.lineTo(at.x + Math.cos(a) * d1, at.y + Math.sin(a) * d1); ctx.stroke();
  }
  if (crit) {
    ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(at.x, at.y, R * 1.4 * easeOut(k), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ---------- weapons (drawn along +x from the grip) ----------
function drawWeapon(ctx: Ctx, w: Weapon, len: number) {
  const steel = ctx.createLinearGradient(0, -len * 0.05, 0, len * 0.05);
  steel.addColorStop(0, '#f8fafc'); steel.addColorStop(0.5, '#94a3b8'); steel.addColorStop(1, '#e2e8f0');
  ctx.lineJoin = 'round';
  const grip = (l: number, wdt = len * 0.06) => { ctx.fillStyle = '#5b3a1e'; ctx.fillRect(-l, -wdt / 2, l, wdt); };
  const outline = () => { ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = Math.max(1.5, len * 0.025); ctx.stroke(); };
  if (w === 'sword' || w === 'dagger') {
    const L = w === 'dagger' ? len * 0.55 : len;
    grip(L * 0.22);
    ctx.fillStyle = '#b45309'; ctx.fillRect(-L * 0.02, -L * 0.1, L * 0.05, L * 0.2);
    ctx.beginPath(); ctx.moveTo(L * 0.03, -L * 0.04); ctx.lineTo(L * 0.9, -L * 0.03); ctx.lineTo(L, 0); ctx.lineTo(L * 0.9, L * 0.03); ctx.lineTo(L * 0.03, L * 0.04); ctx.closePath();
    ctx.fillStyle = steel; ctx.fill(); outline();
  } else if (w === 'scimitar') {
    grip(len * 0.2);
    ctx.fillStyle = '#b45309'; ctx.fillRect(-len * 0.02, -len * 0.09, len * 0.05, len * 0.18);
    ctx.beginPath(); ctx.moveTo(len * 0.03, -len * 0.045);
    ctx.quadraticCurveTo(len * 0.6, -len * 0.1, len, len * 0.12);
    ctx.quadraticCurveTo(len * 0.55, len * 0.02, len * 0.03, len * 0.045); ctx.closePath();
    ctx.fillStyle = steel; ctx.fill(); outline();
  } else if (w === 'axe') {
    ctx.fillStyle = '#7c4a22'; ctx.fillRect(-len * 0.15, -len * 0.035, len * 1.0, len * 0.07);
    ctx.beginPath(); ctx.moveTo(len * 0.7, -len * 0.04); ctx.quadraticCurveTo(len * 0.95, -len * 0.32, len * 1.0, -len * 0.3);
    ctx.quadraticCurveTo(len * 1.12, 0, len * 1.0, len * 0.3); ctx.quadraticCurveTo(len * 0.95, len * 0.32, len * 0.7, len * 0.04); ctx.closePath();
    ctx.fillStyle = steel; ctx.fill(); outline();
  } else if (w === 'club') {
    ctx.beginPath(); ctx.moveTo(-len * 0.15, -len * 0.04); ctx.lineTo(len * 0.75, -len * 0.09); ctx.lineTo(len * 0.75, len * 0.09); ctx.lineTo(-len * 0.15, len * 0.04); ctx.closePath();
    ctx.fillStyle = '#7c4a22'; ctx.fill(); outline();
    ctx.beginPath(); ctx.arc(len * 0.85, 0, len * 0.17, 0, Math.PI * 2); ctx.fillStyle = '#6b7280'; ctx.fill(); outline();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(len * 0.85 + Math.cos(a) * len * 0.15, Math.sin(a) * len * 0.15); ctx.lineTo(len * 0.85 + Math.cos(a) * len * 0.27, Math.sin(a) * len * 0.27); ctx.lineWidth = len * 0.04; ctx.strokeStyle = '#4b5563'; ctx.stroke(); }
  } else if (w === 'spear') {
    ctx.fillStyle = '#7c4a22'; ctx.fillRect(-len * 0.5, -len * 0.025, len * 1.3, len * 0.05);
    ctx.beginPath(); ctx.moveTo(len * 0.78, -len * 0.08); ctx.lineTo(len * 1.08, 0); ctx.lineTo(len * 0.78, len * 0.08); ctx.closePath();
    ctx.fillStyle = steel; ctx.fill(); outline();
  }
}

// ---------- effect drawers ----------
function melee(ctx: Ctx, fx: FxEvent, t: number, lights: Light[]) {
  const from = fx.from ?? { x: fx.to.x - fx.grid, y: fx.to.y };
  const target = fx.result === 'miss' ? { x: lerp(fx.to.x, missPoint(fx, from).x, 0.45), y: lerp(fx.to.y, missPoint(fx, from).y, 0.45) } : fx.to;
  const a = Math.atan2(target.y - from.y, target.x - from.x);
  const len = fx.grid * 1.35;
  const w = fx.weapon ?? 'sword';
  const fadeOut = 1 - clamp((t - 520) / 260);

  if (w === 'bite') {
    const k = easeOut(clamp((t - 120) / 320));
    const open = 1 - k;
    ctx.save(); ctx.translate(target.x, target.y); ctx.rotate(a); ctx.globalAlpha = fadeOut;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(0, s * (fx.grid * 0.12 + open * fx.grid * 0.35)); ctx.scale(1, s);
      ctx.beginPath(); ctx.moveTo(-fx.grid * 0.45, 0); ctx.quadraticCurveTo(0, -fx.grid * 0.35, fx.grid * 0.45, 0); ctx.closePath();
      ctx.fillStyle = '#7f1d1d'; ctx.fill();
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < 6; i++) { const x = -fx.grid * 0.38 + i * fx.grid * 0.15; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + fx.grid * 0.06, fx.grid * 0.14); ctx.lineTo(x + fx.grid * 0.12, 0); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  } else if (w === 'claw') {
    const k = easeOut(clamp((t - 150) / 280));
    ctx.save(); ctx.translate(target.x, target.y); ctx.rotate(a + Math.PI / 4); ctx.globalAlpha = fadeOut; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const y = i * fx.grid * 0.2, x0 = -fx.grid * 0.5, x1 = lerp(x0, fx.grid * 0.5, k);
      ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = fx.grid * 0.11; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y + (x1 - x0) * 0.1); ctx.stroke();
      ctx.strokeStyle = '#fecaca'; ctx.lineWidth = fx.grid * 0.04; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y + (x1 - x0) * 0.1); ctx.stroke();
    }
    ctx.restore();
  } else if (w === 'slam' || w === 'touch') {
    const k = easeIn(clamp(t / 420));
    const p = lerpPt({ x: from.x + Math.cos(a) * fx.grid * 0.4, y: from.y + Math.sin(a) * fx.grid * 0.4 }, target, k);
    if (t < 460) {
      const [inner, outer] = ELEMENT_COLOR[w === 'touch' ? fx.element : 'physical'];
      if (w === 'touch') { glow(ctx, p.x, p.y, fx.grid * 0.45, inner, outer); if (EMITS_LIGHT.includes(fx.element)) lights.push({ x: p.x, y: p.y, r: fx.grid * 2 }); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, fx.grid * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#a16207'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); }
    }
    if (t > 420) {
      const kk = clamp((t - 420) / 400);
      ctx.globalAlpha = 1 - kk; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(target.x, target.y, fx.grid * (0.3 + kk * 0.6), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  } else {
    // Weapon: moves in from the attacker's side, then swings (or thrusts) through the target.
    const thrust = w === 'spear' || w === 'dagger';
    const approach = easeOut(clamp(t / 220));
    const swing = easeIn(clamp((t - 220) / 220));
    const pivot = lerpPt(
      { x: from.x + Math.cos(a) * fx.grid * 0.3, y: from.y + Math.sin(a) * fx.grid * 0.3 },
      { x: target.x - Math.cos(a) * len * (thrust ? 0.95 : 0.65), y: target.y - Math.sin(a) * len * (thrust ? 0.95 : 0.65) },
      approach,
    );
    const side = fx.id.charCodeAt(1) % 2 ? 1 : -1;
    const ang = thrust ? a : a + side * lerp(-1.9, 1.0, swing);
    const reach = thrust ? lerp(-len * 0.25, len * 0.35, swing) : 0;
    ctx.save();
    ctx.globalAlpha = fadeOut;
    if (!thrust && t > 220) {
      // swoosh trail behind the blade tip
      ctx.beginPath();
      const a0 = a + side * -1.9, a1 = ang;
      ctx.moveTo(pivot.x, pivot.y);
      ctx.arc(pivot.x, pivot.y, len * 1.02, Math.min(a0, a1), Math.max(a0, a1));
      ctx.closePath();
      const tr = ctx.createRadialGradient(pivot.x, pivot.y, len * 0.5, pivot.x, pivot.y, len * 1.05);
      tr.addColorStop(0, 'rgba(255,255,255,0)'); tr.addColorStop(1, `rgba(255,255,255,${0.45 * (1 - clamp((t - 440) / 300))})`);
      ctx.fillStyle = tr; ctx.fill();
    }
    ctx.translate(pivot.x + Math.cos(a) * reach, pivot.y + Math.sin(a) * reach);
    ctx.rotate(ang);
    drawWeapon(ctx, w, len);
    ctx.restore();
  }
  if (fx.result !== 'miss') impact(ctx, fx, fx.to, (t - 430) / 420);
  floatText(ctx, fx, 430, t);
}

function missile(ctx: Ctx, fx: FxEvent, t: number, lights: Light[]) {
  const from = fx.from!;
  const { travel } = timeline(fx);
  const end = fx.result === 'miss' ? missPoint(fx, from) : fx.to;
  const a = Math.atan2(end.y - from.y, end.x - from.x);
  const k = clamp(t / travel);
  const m = fx.missile ?? 'arrow';
  const [inner, outer] = ELEMENT_COLOR[fx.element];
  const light = EMITS_LIGHT.includes(fx.element);
  const g = fx.grid;

  if (m === 'lightning' || m === 'ray') {
    // Beams reach out from the caster, hold briefly, then fade.
    const reachK = easeOut(k);
    const tip = lerpPt(from, end, reachK);
    const fade = 1 - clamp((t - travel - 250) / 400);
    if (fade <= 0) { if (fx.result !== 'miss') impact(ctx, fx, fx.to, (t - travel) / 450); floatText(ctx, fx, travel, t); return; }
    ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (m === 'lightning') {
      const r = rng(fx.id + Math.floor(t / 50));
      const pts: Pt[] = [from];
      const n = 9;
      for (let i = 1; i < n; i++) { const p = lerpPt(from, tip, i / n); const off = (r() - 0.5) * g * 0.6; pts.push({ x: p.x - Math.sin(a) * off, y: p.y + Math.cos(a) * off }); }
      pts.push(tip);
      for (const [wd, col] of [[g * 0.28, 'rgba(96,165,250,.35)'], [g * 0.1, '#bfdbfe'], [g * 0.04, '#ffffff']] as const) {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      for (let i = 0; i <= 4; i++) { const p = lerpPt(from, tip, i / 4); lights.push({ x: p.x, y: p.y, r: g * 2.5 * fade }); }
    } else {
      const w = g * (0.18 + 0.05 * Math.sin(t / 30));
      for (const [wd, col] of [[w * 2.2, outer], [w, inner]] as const) { ctx.globalAlpha = fade * (wd > w ? 0.45 : 1); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); }
      if (light) for (let i = 0; i <= 3; i++) { const p = lerpPt(from, tip, i / 3); lights.push({ x: p.x, y: p.y, r: g * 1.6 * fade }); }
    }
    ctx.restore();
    if (fx.result !== 'miss') impact(ctx, fx, fx.to, (t - travel) / 450);
    floatText(ctx, fx, travel, t);
    return;
  }

  if (m === 'darts') {
    // Three glowing darts that curve in from different sides.
    for (let i = 0; i < 3; i++) {
      const kk = clamp((t - i * 70) / travel);
      if (kk <= 0 || kk >= 1) continue;
      const bend = (i - 1) * g * 1.2;
      const mid = { x: (from.x + end.x) / 2 - Math.sin(a) * bend, y: (from.y + end.y) / 2 + Math.cos(a) * bend };
      const p = { x: (1 - kk) ** 2 * from.x + 2 * (1 - kk) * kk * mid.x + kk ** 2 * end.x, y: (1 - kk) ** 2 * from.y + 2 * (1 - kk) * kk * mid.y + kk ** 2 * end.y };
      glow(ctx, p.x, p.y, g * 0.5, inner, outer);
      lights.push({ x: p.x, y: p.y, r: g * 1.2 });
    }
  } else if (k < 1) {
    const p = lerpPt(from, end, k);
    // Arcing path for slow, heavy things.
    const lift = m === 'boulder' || m === 'thrown' || m === 'stone' ? Math.sin(k * Math.PI) * g * (m === 'boulder' ? 1.2 : 0.4) : 0;
    const px = p.x, py = p.y - lift;
    ctx.save();
    if (m === 'orb') {
      const r = rng(fx.id);
      for (let i = 0; i < 10; i++) { // trail
        const back = (i + 1) * g * 0.12, jitter = (r() - 0.5) * g * 0.25;
        glow(ctx, px - Math.cos(a) * back - Math.sin(a) * jitter, py - Math.sin(a) * back + Math.cos(a) * jitter, g * (0.25 - i * 0.018), inner, outer, 0.6 - i * 0.05);
      }
      glow(ctx, px, py, g * 0.7, inner, outer);
      if (light) lights.push({ x: px, y: py, r: g * 2 });
    } else {
      ctx.translate(px, py);
      ctx.rotate(m === 'thrown' ? t / 40 : m === 'boulder' ? t / 150 : a);
      if (m === 'arrow' || m === 'bolt') {
        const L = g * (m === 'bolt' ? 0.8 : 1.05), h = g * 0.09;
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1, g * 0.025);
        for (const o of [-h, 0, h]) { ctx.beginPath(); ctx.moveTo(-L * 0.6, o); ctx.lineTo(-L * 1.8, o); ctx.stroke(); }
        ctx.strokeStyle = '#000'; ctx.lineWidth = g * (m === 'bolt' ? 0.1 : 0.075); ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.lineTo(L * 0.4, 0); ctx.stroke();
        ctx.strokeStyle = '#b07a43'; ctx.lineWidth = g * (m === 'bolt' ? 0.07 : 0.05); ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.lineTo(L * 0.4, 0); ctx.stroke();
        ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L * 0.6, 0); ctx.lineTo(L * 0.36, -h * 1.3); ctx.lineTo(L * 0.36, h * 1.3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.lineTo(-L * 0.64, -h * 1.5); ctx.lineTo(-L * 0.36, 0); ctx.lineTo(-L * 0.64, h * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (m === 'stone') {
        ctx.fillStyle = '#9ca3af'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, g * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (m === 'boulder') {
        ctx.fillStyle = '#78716c'; ctx.strokeStyle = '#292524'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2, rr = g * 0.4 * (0.85 + ((i * 37) % 10) / 40); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        drawWeapon(ctx, 'dagger', g * 1.3);
      }
    }
    ctx.restore();
  }
  if (fx.result !== 'miss') {
    impact(ctx, fx, fx.to, (t - travel) / 450);
    if (m === 'boulder' && t > travel) { const kk = clamp((t - travel) / 500); ctx.globalAlpha = 1 - kk; ctx.fillStyle = '#a8a29e'; const r = rng(fx.id + 'dust'); for (let i = 0; i < 12; i++) { const an = r() * Math.PI * 2, d = g * 0.9 * easeOut(kk) * (0.5 + r()); ctx.beginPath(); ctx.arc(fx.to.x + Math.cos(an) * d, fx.to.y + Math.sin(an) * d, g * 0.12 * (1 - kk), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
    if (light && t > travel) lights.push({ x: fx.to.x, y: fx.to.y, r: g * 2.2 * (1 - clamp((t - travel) / 500)) });
  }
  floatText(ctx, fx, travel, t);
}

function burst(ctx: Ctx, fx: FxEvent, t: number, lights: Light[]) {
  const { travel } = timeline(fx);
  const g = fx.grid, R = fx.radius ?? g * 4;
  const [inner, outer] = ELEMENT_COLOR[fx.element];
  const light = EMITS_LIGHT.includes(fx.element);
  if (fx.from && t < travel) {
    const p = lerpPt(fx.from, fx.to, easeIn(t / travel));
    glow(ctx, p.x, p.y, g * 0.45, inner, outer);
    if (light) lights.push({ x: p.x, y: p.y, r: g * 2 });
    return;
  }
  const tt = t - travel;
  const grow = easeOut(tt / 320), fade = 1 - clamp((tt - 300) / 1100);
  const r = rng(fx.id);
  ctx.save();
  if (fx.element === 'thunder') {
    for (let i = 0; i < 3; i++) { const kk = clamp((tt - i * 120) / 700); ctx.globalAlpha = (1 - kk) * 0.9; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = g * 0.12 * (1 - kk) + 1; ctx.beginPath(); ctx.arc(fx.to.x, fx.to.y, R * easeOut(kk), 0, Math.PI * 2); ctx.stroke(); }
  } else {
    glow(ctx, fx.to.x, fx.to.y, R * 1.1 * grow, inner, outer, fade);
    // smoke / mist
    ctx.globalAlpha = fade * 0.3;
    for (let i = 0; i < 14; i++) {
      const an = r() * Math.PI * 2, d = R * (0.3 + r() * 0.6) * grow;
      const col = fx.element === 'fire' ? 'rgba(60,40,30,1)' : fx.element === 'cold' ? 'rgba(220,240,255,1)' : fx.element === 'poison' || fx.element === 'acid' ? 'rgba(80,140,40,1)' : fx.element === 'necrotic' ? 'rgba(40,10,50,1)' : 'rgba(200,200,220,1)';
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx.to.x + Math.cos(an) * d, fx.to.y + Math.sin(an) * d, R * 0.25 * (0.6 + r() * 0.6) * (0.6 + grow * 0.4), 0, Math.PI * 2); ctx.fill();
    }
    // sparks
    ctx.globalAlpha = fade;
    for (let i = 0; i < 40; i++) {
      const an = r() * Math.PI * 2, d = R * (0.4 + r() * 0.9) * easeOut(tt / 600);
      ctx.fillStyle = i % 3 ? outer : inner;
      ctx.beginPath(); ctx.arc(fx.to.x + Math.cos(an) * d, fx.to.y + Math.sin(an) * d, g * 0.05 * (1.5 - grow * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = (1 - clamp(tt / 500)) * 0.8; ctx.strokeStyle = inner; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(fx.to.x, fx.to.y, R * easeOut(tt / 500), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  if (light) lights.push({ x: fx.to.x, y: fx.to.y, r: (R + g * 2) * fade });
}

function cone(ctx: Ctx, fx: FxEvent, t: number, lights: Light[]) {
  const g = fx.grid, L = fx.length ?? g * 3, a = fx.angle ?? 0;
  const [inner, outer] = ELEMENT_COLOR[fx.element];
  const r = rng(fx.id);
  const fade = 1 - clamp((t - 700) / 600);
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const born = r() * 650, life = 500 + r() * 300, age = t - born;
    if (age < 0 || age > life) continue;
    const k = age / life, spread = (r() - 0.5) * 2 * Math.atan(0.5), d = L * easeOut(k) * (0.6 + r() * 0.45);
    const x = fx.to.x + Math.cos(a + spread) * d, y = fx.to.y + Math.sin(a + spread) * d;
    glow(ctx, x, y, g * (0.25 + k * 0.5), inner, outer, (1 - k) * fade);
  }
  ctx.restore();
  if (EMITS_LIGHT.includes(fx.element)) for (let i = 1; i <= 3; i++) lights.push({ x: fx.to.x + Math.cos(a) * L * i / 3.5, y: fx.to.y + Math.sin(a) * L * i / 3.5, r: g * 2.2 * fade });
}

function line(ctx: Ctx, fx: FxEvent, t: number, lights: Light[]) {
  const g = fx.grid, L = fx.length ?? g * 6, a = fx.angle ?? 0;
  const end = { x: fx.to.x + Math.cos(a) * L, y: fx.to.y + Math.sin(a) * L };
  if (fx.element === 'lightning') {
    missile(ctx, { ...fx, kind: 'missile', missile: 'lightning', from: fx.to, to: end, result: undefined }, t + 1, lights);
    return;
  }
  const [inner, outer] = ELEMENT_COLOR[fx.element];
  const reach = easeOut(t / 250), fade = 1 - clamp((t - 450) / 600);
  const tip = lerpPt(fx.to, end, reach);
  ctx.save(); ctx.lineCap = 'round';
  ctx.globalAlpha = fade * 0.5; ctx.strokeStyle = outer; ctx.lineWidth = g * 0.9; ctx.beginPath(); ctx.moveTo(fx.to.x, fx.to.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  ctx.globalAlpha = fade; ctx.strokeStyle = inner; ctx.lineWidth = g * 0.3; ctx.beginPath(); ctx.moveTo(fx.to.x, fx.to.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  ctx.restore();
  if (EMITS_LIGHT.includes(fx.element)) for (let i = 0; i <= 4; i++) { const p = lerpPt(fx.to, tip, i / 4); lights.push({ x: p.x, y: p.y, r: g * 1.8 * fade }); }
}

function heal(ctx: Ctx, fx: FxEvent, t: number) {
  const g = fx.grid, k = t / 1400;
  glow(ctx, fx.to.x, fx.to.y, g * 0.9, 'rgba(220,252,231,.9)', 'rgba(74,222,128,.6)', Math.sin(Math.PI * clamp(k)));
  const r = rng(fx.id);
  ctx.save(); ctx.textAlign = 'center';
  for (let i = 0; i < 14; i++) {
    const born = r() * 700, age = t - born;
    if (age < 0 || age > 900) continue;
    const kk = age / 900, x = fx.to.x + (r() - 0.5) * g * 1.1, y = fx.to.y + g * 0.4 - kk * g * 1.4;
    ctx.globalAlpha = Math.sin(Math.PI * kk);
    if (i % 3 === 0) { ctx.fillStyle = '#86efac'; ctx.font = `900 ${g * 0.3}px sans-serif`; ctx.fillText('+', x, y); }
    else { ctx.fillStyle = i % 2 ? '#fde68a' : '#bbf7d0'; ctx.beginPath(); ctx.arc(x, y, g * 0.045, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function poof(ctx: Ctx, fx: FxEvent, t: number) {
  const g = fx.grid, k = clamp(t / 900);
  const r = rng(fx.id);
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const an = r() * Math.PI * 2, d = g * 0.55 * easeOut(k) * (0.4 + r());
    ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = i % 2 ? '#9ca3af' : '#d1d5db';
    ctx.beginPath(); ctx.arc(fx.to.x + Math.cos(an) * d, fx.to.y + Math.sin(an) * d - k * g * 0.3, g * (0.18 + 0.2 * easeOut(k)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawFx(ctx: Ctx, fx: FxEvent, t: number, lights: Light[]) {
  ctx.save();
  switch (fx.kind) {
    case 'melee': melee(ctx, fx, t, lights); break;
    case 'missile': missile(ctx, fx, t, lights); break;
    case 'burst': burst(ctx, fx, t, lights); break;
    case 'cone': cone(ctx, fx, t, lights); break;
    case 'line': line(ctx, fx, t, lights); break;
    case 'heal': heal(ctx, fx, t); break;
    case 'poof': poof(ctx, fx, t); break;
  }
  ctx.restore();
}
