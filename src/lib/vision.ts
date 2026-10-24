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
  // Always at least uncover the token's own square.
  const r = Math.max(g.size * Math.max(t.size, 1) * 0.5, (feet / g.feet) * g.size + g.size / 2);
  const pts = from.x === to.x && from.y === to.y ? [to.x, to.y, to.x + 0.1, to.y] : [from.x, from.y, to.x, to.y];
  return { t: 'brush', mode: 'reveal', r, pts };
}
