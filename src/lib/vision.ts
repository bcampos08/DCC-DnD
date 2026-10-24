import type { Character, FogOp, Scene, Token } from '../types';

// Light a character can carry (PHB p.152-153: bright + dim radius, both count for seeing).
export const LIGHTS = [
  { feet: 0, label: 'None' },
  { feet: 10, label: 'Candle (10 ft)' },
  { feet: 40, label: 'Torch / Light cantrip (40 ft)' },
  { feet: 60, label: 'Hooded lantern (60 ft)' },
  { feet: 120, label: 'Bullseye lantern (120 ft)' },
];

export function darkvisionOf(c?: Character) {
  if (!c) return 0;
  if (c.darkvision) return c.darkvision;
  const s = c.sheet?.senses.find(x => /darkvision/i.test(x));
  return s ? parseInt(s.replace(/\D+/g, ''), 10) || 0 : 0;
}

// How far (in feet) a player token can see on this scene.
export function sightFeet(scene: Scene, t: Token, c?: Character) {
  const light = t.light ?? 0;
  const dark = darkvisionOf(c);
  if (scene.fog.light === 'dark') return Math.max(dark, light);
  return Math.max(scene.fog.sightFeet ?? 60, light, dark);
}

// Fog clearing along a player's move, from where they started to where they stopped.
export function revealOp(scene: Scene, t: Token, c: Character | undefined, from: { x: number; y: number }, to: { x: number; y: number }): FogOp | null {
  if (!scene.fog.enabled || scene.fog.autoReveal === false || t.kind !== 'pc' || t.hidden) return null;
  const g = scene.grid;
  const feet = sightFeet(scene, t, c);
  const r = sightRadiusPx(scene, t, c);
  void feet;
  const pts = from.x === to.x && from.y === to.y ? [to.x, to.y, to.x + 0.1, to.y] : [from.x, from.y, to.x, to.y];
  return { t: 'brush', mode: 'reveal', r, pts, auto: true };
}

// Sight radius in map pixels, measured from the token's centre. Always at least its own square.
export function sightRadiusPx(scene: Scene, t: Token, c?: Character) {
  const g = scene.grid;
  return Math.max(g.size * Math.max(t.size, 1) * 0.5, (sightFeet(scene, t, c) / g.feet) * g.size + g.size / 2);
}

// Dark scenes keep explored areas dimmed and only show what players can see right now.
export const tracksVision = (scene: Scene) => scene.fog.enabled && scene.fog.autoReveal !== false && scene.fog.light === 'dark';

export interface Circle { x: number; y: number; r: number }
export function visionCircles(scene: Scene, chars: Character[]): Circle[] {
  return scene.tokens.filter(t => t.kind === 'pc' && !t.hidden).map(t => ({ x: t.x, y: t.y, r: sightRadiusPx(scene, t, chars.find(c => c.id === t.charId)) }));
}

const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const k = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
};
function opCovers(op: FogOp, x: number, y: number) {
  if (op.t === 'all') return true;
  if (op.t === 'rect') return x >= op.x && x <= op.x + op.w && y >= op.y && y <= op.y + op.h;
  for (let i = 0; i + 3 < op.pts.length; i += 2) if (distToSeg(x, y, op.pts[i], op.pts[i + 1], op.pts[i + 2], op.pts[i + 3]) <= op.r) return true;
  return op.pts.length === 2 && Math.hypot(x - op.pts[0], y - op.pts[1]) <= op.r;
}

// Is this spot clear of full fog (revealed by hand or explored)?
export function revealedAt(scene: Scene, x: number, y: number) {
  let open = false;
  for (const op of scene.fog.ops) if (opCovers(op, x, y)) open = op.mode === 'reveal';
  return open;
}

// Could players see a creature standing here? Accounts for full fog and, in dark scenes, current sight.
export function playersCanSee(scene: Scene, circles: Circle[] | null, x: number, y: number) {
  if (!scene.fog.enabled) return true;
  if (circles) return seenNow(scene, circles, x, y);
  return revealedAt(scene, x, y);
}

// Can players see a creature standing here right now? (Inside someone's vision, or in an area the DM revealed by hand.)
export function seenNow(scene: Scene, circles: Circle[], x: number, y: number) {
  if (circles.some(c => Math.hypot(c.x - x, c.y - y) <= c.r)) return true;
  let lit = false;
  for (const op of scene.fog.ops) if (!op.auto && opCovers(op, x, y)) lit = op.mode === 'reveal';
  return lit;
}
