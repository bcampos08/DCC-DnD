import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { Character, FogOp, Scene, Token } from '../types';
import { blocked, inPolys, visPoly, wallSegs, type Seg } from './los';

// Light a creature can carry: bright radius, and dim light out to `dim` feet (PHB p.152-153).
export const LIGHTS = [
  { id: 'none', label: 'None', bright: 0, dim: 0 },
  { id: 'candle', label: 'Candle (5 ft bright, 10 ft dim)', bright: 5, dim: 10 },
  { id: 'torch', label: 'Torch (20 ft bright, 40 ft dim)', bright: 20, dim: 40 },
  { id: 'light', label: 'Light cantrip (20 / 40 ft)', bright: 20, dim: 40 },
  { id: 'lamp', label: 'Lamp (15 / 45 ft)', bright: 15, dim: 45 },
  { id: 'hooded', label: 'Hooded lantern (30 / 60 ft)', bright: 30, dim: 60 },
  { id: 'bullseye', label: 'Bullseye lantern (60 / 120 ft, as a circle)', bright: 60, dim: 120 },
  { id: 'daylight', label: 'Daylight spell (60 / 120 ft)', bright: 60, dim: 120 },
];

// Bright and dim radius (feet) of the light a token carries. Older saves stored one number: the
// total reach, which was bright for the first half and dim for the rest.
export function lightOf(t: Pick<Token, 'light' | 'lightDim'>): { bright: number; dim: number } {
  const b = t.light ?? 0;
  if (t.lightDim == null) return b ? { bright: b / 2, dim: b } : { bright: 0, dim: 0 };
  return { bright: b, dim: Math.max(b, t.lightDim) };
}

export function darkvisionOf(c?: Character) {
  if (!c) return 0;
  if (c.darkvision) return c.darkvision;
  const s = c.sheet?.senses.find(x => /darkvision/i.test(x));
  return s ? parseInt(s.replace(/\D+/g, ''), 10) || 0 : 0;
}

// Dark scenes keep explored areas dimmed and only show what players can see right now.
export const tracksVision = (scene: Scene) => scene.fog.enabled && scene.fog.autoReveal !== false && scene.fog.light === 'dark';

export interface Viewer { x: number; y: number; dv: number; poly: number[]; dvPoly: number[] }
export interface LightSrc { x: number; y: number; bright: number; dim: number; poly: number[] }
// What the players can see right now. Polygons already stop at walls.
export interface Vision { viewers: Viewer[]; lights: LightSrc[]; lit: boolean; segs: Seg[] }

const ftToPx = (scene: Scene, ft: number) => (ft / scene.grid.feet) * scene.grid.size;
const ownSquare = (scene: Scene, t: Token) => scene.grid.size * Math.max(t.size, 1) * 0.5 + scene.grid.size * 0.15;
const mapReach = (scene: Scene) => {
  const W = scene.map?.width ?? 30 * scene.grid.size, H = scene.map?.height ?? 20 * scene.grid.size;
  return Math.hypot(W, H) + scene.grid.size * 4;
};

// Player tokens that see for the party.
const viewersOf = (scene: Scene) => scene.tokens.filter(t => t.kind === 'pc' && !t.hidden);

let memo: { key: unknown[]; v: Vision } | null = null;
export function computeVision(scene: Scene, chars: Character[]): Vision {
  const key = [scene.tokens, scene.walls, scene.fog.light, scene.fog.sightFeet, scene.grid, scene.map, chars];
  if (memo && memo.key.length === key.length && memo.key.every((k, i) => k === key[i])) return memo.v;
  const v = buildVision(scene, chars);
  memo = { key, v };
  return v;
}

function buildVision(scene: Scene, chars: Character[]): Vision {
  const segs = wallSegs(scene);
  const dark = scene.fog.light === 'dark';
  const lights: LightSrc[] = [];
  if (dark) {
    for (const t of scene.tokens) {
      if (t.hidden) continue;
      const l = lightOf(t);
      if (l.dim <= 0) continue;
      const dim = ftToPx(scene, l.dim) + scene.grid.size / 2, bright = l.bright ? ftToPx(scene, l.bright) + scene.grid.size / 2 : 0;
      lights.push({ x: t.x, y: t.y, bright, dim, poly: visPoly(t.x, t.y, dim, segs) });
    }
  }
  const viewers: Viewer[] = viewersOf(scene).map(t => {
    const c = chars.find(c => c.id === t.charId);
    if (!dark) {
      // Lit scenes: everyone sees out to the scene's sight distance (or further with their own light).
      const r = Math.max(ftToPx(scene, scene.fog.sightFeet ?? 60) + scene.grid.size / 2, ftToPx(scene, lightOf(t).dim), ftToPx(scene, darkvisionOf(c)), ownSquare(scene, t));
      const poly = visPoly(t.x, t.y, r, segs);
      return { x: t.x, y: t.y, dv: r, poly, dvPoly: poly };
    }
    const dvFt = darkvisionOf(c);
    const dv = Math.max(dvFt ? ftToPx(scene, dvFt) + scene.grid.size / 2 : 0, ownSquare(scene, t));
    return { x: t.x, y: t.y, dv, poly: visPoly(t.x, t.y, mapReach(scene), segs, 96), dvPoly: visPoly(t.x, t.y, dv, segs) };
  });
  return { viewers, lights, lit: !dark, segs };
}

// How well players see a spot right now: 0 not at all, 1 dim (shapes only), 2 clearly.
export function seeLevel(scene: Scene, v: Vision, x: number, y: number): 0 | 1 | 2 {
  // Areas the DM revealed by hand count as lit.
  let lit = false;
  for (const op of scene.fog.ops) if (!op.auto && opCovers(op, x, y)) lit = op.mode === 'reveal';
  if (lit) return 2;
  let best: 0 | 1 | 2 = 0;
  let light: 0 | 1 | 2 | -1 = -1; // worked out once, when first needed
  for (const vw of v.viewers) {
    const d = Math.hypot(vw.x - x, vw.y - y);
    if (v.lit) { if (d > vw.dv) continue; } // lit scenes: sight range
    if (blocked(vw.x, vw.y, x, y, v.segs)) continue;
    if (light < 0) {
      light = 0;
      for (const l of v.lights) {
        const dl = Math.hypot(l.x - x, l.y - y);
        if (dl > l.dim || blocked(l.x, l.y, x, y, v.segs)) continue;
        light = Math.max(light, dl <= l.bright ? 2 : 1) as 0 | 1 | 2;
        if (light === 2) break;
      }
    }
    let lv: 0 | 1 | 2 = v.lit ? 2 : (light as 0 | 1 | 2);
    // Darkvision: darkness counts as dim light, dim light as bright.
    if (!v.lit && d <= vw.dv) lv = lv >= 1 ? 2 : 1;
    if (lv > best) best = lv;
    if (best === 2) break;
  }
  return best;
}

// Paints what players can see right now (white on a mask, or destination-out on fog).
export function paintVision(c: CanvasRenderingContext2D, v: Vision) {
  const path = (pts: number[]) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
  for (const vw of v.viewers) {
    if (vw.dvPoly.length) { path(vw.dvPoly); c.fill(); }
    if (!v.lights.length) continue;
    c.save();
    path(vw.poly); c.clip();
    for (const l of v.lights) { path(l.poly); c.fill(); }
    c.restore();
  }
}

// ---------- remembering explored areas ----------
const toRing = (pts: number[]): [number, number][] => {
  const r: [number, number][] = [];
  for (let i = 0; i < pts.length; i += 2) r.push([Math.round(pts[i] * 10) / 10, Math.round(pts[i + 1] * 10) / 10]);
  if (r.length) r.push(r[0]);
  return r;
};
const ringOk = (r: [number, number][]) => r.length >= 4;

// The area players can see (dim or better) as polygons.
function seenRegion(v: Vision): Polygon[] {
  const parts: Polygon[] = [];
  for (const vw of v.viewers) {
    const dv = toRing(vw.dvPoly);
    if (ringOk(dv)) parts.push([dv]);
    if (!v.lights.length) continue;
    const view = toRing(vw.poly);
    if (!ringOk(view)) continue;
    for (const l of v.lights) {
      const lr = toRing(l.poly);
      if (!ringOk(lr)) continue;
      try { for (const p of polygonClipping.intersection([view], [lr])) parts.push(p); } catch { /* skip odd shapes */ }
    }
  }
  return parts;
}

// Fog cleared by what players can see now, plus along the paths of tokens that just moved.
// paths: token id -> points it passed through (map px), sampled about a square apart.
export function exploreOp(scene: Scene, chars: Character[], paths: Map<string, { x: number; y: number }[]> = new Map()): FogOp | null {
  if (!scene.fog.enabled || scene.fog.autoReveal === false || !viewersOf(scene).length) return null;
  const parts: Polygon[] = [...seenRegion(buildVision(scene, chars))];
  for (const [id, pts] of paths) for (const pt of pts) {
    const moved = { ...scene, tokens: scene.tokens.map(t => (t.id === id ? { ...t, x: pt.x, y: pt.y } : t)) };
    parts.push(...seenRegion(buildVision(moved, chars)));
  }
  if (!parts.length) return null;
  let merged: MultiPolygon;
  try { merged = polygonClipping.union(parts[0], ...parts.slice(1)); } catch { merged = parts; }
  const polys = merged.map(poly => poly.map(ring => ring.slice(0, -1).flat()));
  return { t: 'poly', mode: 'reveal', polys, auto: true };
}

// Points along a move, about one square apart (not including the end, which exploreOp covers).
export function pathSamples(scene: Scene, from: { x: number; y: number }, to: { x: number; y: number }) {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.min(24, Math.floor(d / scene.grid.size));
  return Array.from({ length: n }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / Math.max(1, n), y: from.y + ((to.y - from.y) * i) / Math.max(1, n) }));
}

// ---------- fog lookups ----------
const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const k = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
};
function opCovers(op: FogOp, x: number, y: number) {
  if (op.t === 'all') return true;
  if (op.t === 'rect') return x >= op.x && x <= op.x + op.w && y >= op.y && y <= op.y + op.h;
  if (op.t === 'poly') return inPolys(op.polys, x, y);
  for (let i = 0; i + 3 < op.pts.length; i += 2) if (distToSeg(x, y, op.pts[i], op.pts[i + 1], op.pts[i + 2], op.pts[i + 3]) <= op.r) return true;
  return op.pts.length === 2 && Math.hypot(x - op.pts[0], y - op.pts[1]) <= op.r;
}

// Is this spot clear of full fog (revealed by hand or explored)?
export function revealedAt(scene: Scene, x: number, y: number) {
  let open = false;
  for (const op of scene.fog.ops) if (opCovers(op, x, y)) open = op.mode === 'reveal';
  return open;
}

// Could players see a creature standing here (even just as a shape)?
export function playersCanSee(scene: Scene, vision: Vision | null, x: number, y: number) {
  if (!scene.fog.enabled) return true;
  if (vision && !vision.lit) return seeLevel(scene, vision, x, y) > 0;
  return revealedAt(scene, x, y);
}

// Draws a fog op's shape with the current composite mode and fill/stroke colour.
export function paintFogOp(c: CanvasRenderingContext2D, op: FogOp) {
  if (op.t === 'all') c.fillRect(-1e5, -1e5, 2e5, 2e5);
  else if (op.t === 'rect') c.fillRect(op.x, op.y, op.w, op.h);
  else if (op.t === 'poly') {
    c.beginPath();
    for (const poly of op.polys) for (const ring of poly) {
      if (ring.length < 6) continue;
      c.moveTo(ring[0], ring[1]);
      for (let i = 2; i < ring.length; i += 2) c.lineTo(ring[i], ring[i + 1]);
      c.closePath();
    }
    c.fill('evenodd');
  } else {
    c.lineWidth = op.r * 2; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(op.pts[0], op.pts[1]);
    for (let i = 2; i < op.pts.length; i += 2) c.lineTo(op.pts[i], op.pts[i + 1]);
    c.stroke();
  }
}

// Paints the parts of current sight that are in bright light (inside a light's bright radius,
// or in dim light within someone's darkvision).
export function paintBright(c: CanvasRenderingContext2D, v: Vision) {
  if (v.lit || !v.lights.length) return;
  const path = (pts: number[]) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
  for (const vw of v.viewers) {
    c.save(); path(vw.poly); c.clip();
    for (const l of v.lights) {
      if (l.bright > 0) { c.save(); path(l.poly); c.clip(); c.beginPath(); c.arc(l.x, l.y, l.bright, 0, Math.PI * 2); c.fill(); c.restore(); }
    }
    c.restore();
    if (vw.dvPoly.length) { c.save(); path(vw.dvPoly); c.clip(); for (const l of v.lights) { path(l.poly); c.fill(); } c.restore(); }
  }
}
