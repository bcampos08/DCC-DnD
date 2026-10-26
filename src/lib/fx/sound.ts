import { timeline, type Element, type FxEvent } from './core';

// Sound effects made on the fly with the Web Audio API (no audio files).
// They play from the DM window, timed to match the animation on the table screen.

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function audio(volume: number) {
  if (!ac) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    const comp = ac.createDynamicsCompressor();
    master.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  master!.gain.value = volume;
  return ac;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noise(t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1, attack = 0.01) {
  const c = ac!, src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf; src.loop = true;
  flt.type = filter; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, peak, attack, dur);
  src.connect(flt); flt.connect(g); g.connect(master!);
  src.start(t, Math.random()); src.stop(t + attack + dur + 0.05);
}

function tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, attack = 0.005) {
  const c = ac!, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, peak, attack, dur);
  o.connect(g); g.connect(master!);
  o.start(t); o.stop(t + attack + dur + 0.05);
}

// ----- building blocks -----
const whoosh = (t: number, dur = 0.25, peak = 0.5, lo = 500, hi = 2600) => noise(t, dur, peak, 'bandpass', lo, hi, 1.4, dur * 0.4);
const thump = (t: number, peak = 0.9, f = 140) => { tone(t, 'sine', f, 40, 0.25, peak); noise(t, 0.08, peak * 0.4, 'lowpass', 900, 200); };
const clang = (t: number, peak = 0.25) => { for (const f of [820, 1370, 2130, 3010]) tone(t, 'triangle', f, f * 0.98, 0.5, peak / 2); noise(t, 0.05, peak, 'highpass', 3000); };
const thunk = (t: number, peak = 0.6) => { tone(t, 'sine', 260, 90, 0.09, peak); noise(t, 0.04, peak * 0.6, 'bandpass', 1800, 900, 2); };
const twang = (t: number) => { tone(t, 'triangle', 196, 180, 0.3, 0.35); tone(t, 'sine', 392, 380, 0.15, 0.15); };
const crunch = (t: number) => { noise(t, 0.12, 0.8, 'lowpass', 2500, 400); thump(t, 0.5, 110); };
const crackle = (t: number, dur: number, peak = 0.35) => { for (let i = 0; i < dur * 40; i++) noise(t + Math.random() * dur, 0.02, peak * (0.4 + Math.random() * 0.6), 'highpass', 2500 + Math.random() * 3000); };
const boom = (t: number, peak = 1, dur = 1.2) => { noise(t, dur, peak, 'lowpass', 1200, 60, 0.7, 0.01); tone(t, 'sine', 90, 30, dur * 0.8, peak); };
const zap = (t: number, peak = 0.3) => { tone(t, 'sawtooth', 1800, 180, 0.25, peak); crackle(t, 0.2, peak); };
const shimmer = (t: number, dur = 0.6, peak = 0.12) => { for (let i = 0; i < 7; i++) tone(t + i * dur / 9, 'sine', 1500 + Math.random() * 1600, 2400 + Math.random() * 1200, 0.35, peak); noise(t, dur, peak, 'highpass', 6000, 9000); };
const chime = (t: number, peak = 0.22) => [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.09, 'sine', f, f, 0.8, peak));
const sizzle = (t: number, dur = 0.7, peak = 0.25) => noise(t, dur, peak, 'highpass', 4000, 7000, 0.7, 0.05);
const roar = (t: number, dur = 0.9, peak = 0.6) => { noise(t, dur, peak, 'lowpass', 900, 300, 0.8, 0.12); crackle(t, dur, 0.15); };
const puff = (t: number) => noise(t, 0.4, 0.4, 'lowpass', 700, 150, 0.7, 0.03);

function elementImpact(t: number, e: Element, big = false) {
  const p = big ? 1 : 0.6;
  switch (e) {
    case 'fire': boom(t, p * 0.7, big ? 1.2 : 0.5); crackle(t, big ? 0.9 : 0.4, 0.2); break;
    case 'cold': shimmer(t, 0.5, 0.15); noise(t, 0.15, 0.5 * p, 'highpass', 2500, 1200); break;
    case 'lightning': crackle(t, 0.4, 0.5); boom(t, p * 0.6, 0.6); break;
    case 'acid': case 'poison': sizzle(t, 0.8, 0.3 * p); break;
    case 'necrotic': tone(t, 'sawtooth', 110, 55, 0.6, 0.25 * p); noise(t, 0.5, 0.3 * p, 'lowpass', 500, 100); break;
    case 'radiant': chime(t, 0.15); boom(t, p * 0.3, 0.4); break;
    case 'force': zap(t, 0.2); thump(t, 0.6 * p, 180); break;
    case 'thunder': boom(t, p, 1.4); break;
    case 'psychic': shimmer(t, 0.8, 0.12); tone(t, 'sine', 300, 900, 0.5, 0.15); break;
    default: thump(t, 0.7 * p);
  }
}

export function playFxSound(fx: FxEvent, volume: number) {
  const c = audio(volume);
  if (!c) return;
  const start = c.currentTime + Math.max(0, (fx.at - Date.now()) / 1000);
  const tl = timeline(fx);
  const at = (ms: number) => start + ms / 1000;
  const hit = fx.result !== 'miss';
  const crit = fx.result === 'crit';

  switch (fx.kind) {
    case 'melee': {
      const w = fx.weapon ?? 'sword';
      if (w === 'bite') { if (hit) crunch(at(tl.impact)); else whoosh(at(200), 0.2, 0.3); break; }
      if (w === 'claw') { whoosh(at(150), 0.22, 0.5, 1500, 5000); if (hit) noise(at(tl.impact - 40), 0.15, 0.5, 'bandpass', 3000, 1500, 1.5); break; }
      if (w === 'touch') { if (hit) elementImpact(at(tl.impact), fx.element); else whoosh(at(250)); break; }
      whoosh(at(200), w === 'club' || w === 'slam' ? 0.3 : 0.22, 0.55, w === 'club' || w === 'slam' ? 300 : 700, w === 'club' || w === 'slam' ? 1400 : 3200);
      if (hit) {
        if (w === 'club' || w === 'slam') thump(at(tl.impact), 1, 120);
        else { thump(at(tl.impact), 0.55, 160); if (w !== 'spear') clang(at(tl.impact), 0.18); }
        if (fx.element !== 'physical') elementImpact(at(tl.impact), fx.element);
      }
      break;
    }
    case 'missile': {
      const m = fx.missile ?? 'arrow';
      if (m === 'arrow' || m === 'bolt') { twang(at(0)); whoosh(at(20), Math.min(0.5, tl.travel / 1000), 0.25, 1800, 4000); }
      else if (m === 'stone') whoosh(at(0), 0.2, 0.3, 1500, 3500);
      else if (m === 'thrown') for (let i = 0; i < Math.max(2, tl.travel / 120); i++) whoosh(at(i * 120), 0.1, 0.25, 800, 2400);
      else if (m === 'boulder') whoosh(at(0), tl.travel / 1000, 0.6, 150, 500);
      else if (m === 'lightning') { zap(at(0), 0.4); crackle(at(0), 0.5, 0.4); boom(at(60), 0.6, 0.9); }
      else if (m === 'ray') { tone(at(0), 'sine', 900, 1400, 0.6, 0.12); if (fx.element === 'cold') shimmer(at(0), 0.6); else zap(at(0), 0.15); }
      else if (m === 'darts') for (let i = 0; i < 3; i++) tone(at(i * 70), 'sine', 1400, 600, 0.3, 0.12);
      else { // orb
        if (fx.element === 'fire') roar(at(0), Math.max(0.3, tl.travel / 1000), 0.35);
        else if (fx.element === 'cold') shimmer(at(0), Math.max(0.3, tl.travel / 1000));
        else whoosh(at(0), Math.max(0.25, tl.travel / 1000), 0.3, 400, 1600);
      }
      if (hit) {
        const t = at(tl.impact);
        if (m === 'arrow' || m === 'bolt' || m === 'thrown') thunk(t, crit ? 0.9 : 0.6);
        else if (m === 'stone') thunk(t, 0.5);
        else if (m === 'boulder') { boom(t, 0.8, 0.7); thump(t, 1, 80); }
        if (fx.element !== 'physical' || m === 'orb' || m === 'darts') elementImpact(t, fx.element);
      } else if (m === 'arrow' || m === 'bolt' || m === 'stone') noise(at(tl.impact + 120), 0.06, 0.15, 'bandpass', 2500, 1200, 2);
      break;
    }
    case 'burst':
      if (fx.from) whoosh(at(0), Math.max(0.2, tl.travel / 1000), 0.35, 300, 1500);
      if (fx.element === 'cold') { boom(at(tl.impact), 0.5, 0.6); shimmer(at(tl.impact), 1, 0.2); }
      else if (fx.element === 'acid' || fx.element === 'poison') { boom(at(tl.impact), 0.4, 0.5); sizzle(at(tl.impact), 1.2, 0.35); }
      else elementImpact(at(tl.impact), fx.element, true);
      break;
    case 'cone':
      if (fx.element === 'fire') roar(at(0), 1, 0.7);
      else if (fx.element === 'cold') { noise(at(0), 1, 0.4, 'highpass', 1500, 4000, 0.7, 0.1); shimmer(at(0), 0.9, 0.18); }
      else if (fx.element === 'lightning') crackle(at(0), 0.9, 0.5);
      else if (fx.element === 'acid' || fx.element === 'poison') sizzle(at(0), 1, 0.4);
      else if (fx.element === 'thunder') boom(at(0), 1, 1.2);
      else roar(at(0), 0.9, 0.5);
      break;
    case 'line':
      if (fx.element === 'lightning') { zap(at(0), 0.4); crackle(at(0), 0.6, 0.5); boom(at(80), 0.8, 1.1); }
      else { whoosh(at(0), 0.6, 0.5, 300, 2500); elementImpact(at(250), fx.element); }
      break;
    case 'heal': chime(at(0)); break;
    case 'poof': puff(at(0)); break;
  }
  if (crit) { boom(at(tl.impact), 0.5, 0.5); clang(at(tl.impact + 20), 0.2); }
}

// Short test sound for the settings panel.
export function testSound(volume: number) {
  const c = audio(volume);
  if (c) chime(c.currentTime + 0.02);
}
