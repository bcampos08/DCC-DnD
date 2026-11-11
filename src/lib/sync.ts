import { isDefeatedIn } from './defeat';
import type { FxEvent } from './fx/core';
import { computeVision, seeLevel, tracksVision, type Vision } from './vision';
import type { Camera, Campaign, Character, Encounter, LootItem, RollResult, Scene } from '../types';

// The table window runs on the same computer (dragged onto the TV), so the DM window
// streams a players-safe copy of the state over a BroadcastChannel.

// dmOnly: measuring while moving hidden tokens, so players must not see it.
export interface Measure { ax: number; ay: number; bx: number; by: number; feet: number; dmOnly?: boolean }
export interface Ping { x: number; y: number; at: number }
export interface Reveal { kind: 'roll'; roll: RollResult; at: number; anim?: boolean } // anim: dice tumble on the table first
export interface LootReveal { kind: 'loot'; title: string; items: LootItem[]; at: number }
export interface TableState {
  scene: Scene | null;
  chars: Pick<Character, 'id' | 'name' | 'portrait' | 'image' | 'color' | 'conditions' | 'concentrating' | 'hp' | 'maxHp' | 'tempHp' | 'ac' | 'deathSaves'>[];
  encounter: Encounter;
  showMonsterNames: boolean;
  camera: { cx: number; cy: number; viewW: number } | null;
  cameraNonce: number;
  vision: Vision | null; // dark scenes: what players can see right now
}
export type Msg =
  | { type: 'hello' }
  | { type: 'state'; state: TableState }
  | { type: 'measure'; m: Measure | null }
  | { type: 'ping'; p: Ping }
  | { type: 'popup'; p: Reveal | LootReveal }
  | { type: 'fx'; fx: FxEvent }
  | { type: 'bye' };

export const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dcc-table') : null;
export const send = (m: Msg) => channel?.postMessage(m);

// Players see HP as a percentage bar only, and never see hidden tokens or DM-only drawings.
export function tableState(c: Campaign, cameraNonce: number, camera: TableState['camera']): TableState {
  const sc = c.scenes.find(s => s.id === c.tableSceneId) ?? null;
  let scene: Scene | null = null;
  const vision = sc && tracksVision(sc) ? computeVision(sc, c.characters) : null;
  if (sc) {
    const tokens: Scene['tokens'] = [];
    for (const { note: _note, fxPick: _fxPick, ...t } of sc.tokens) {
      if (t.hidden) continue;
      if (t.kind === 'pc') { tokens.push(t); continue; }
      // In dark scenes, enemies nobody can see aren't sent; ones in dim light go as a plain black shape.
      const lv = vision ? seeLevel(sc, vision, t.x, t.y) : 2;
      if (lv === 0) continue;
      if (lv === 1) { tokens.push({ id: t.id, kind: t.kind, x: t.x, y: t.y, size: t.size, name: '', color: '#000', hidden: false, hp: 0, maxHp: 0, tempHp: 0, ac: 0, conditions: [], silhouette: true }); continue; }
      tokens.push({ ...t, hp: t.maxHp ? Math.ceil((t.hp / t.maxHp) * 100) : 0, maxHp: t.maxHp ? 100 : 0, tempHp: 0, ac: 0 });
    }
    scene = {
      ...sc,
      tokens,
      walls: undefined, // the table doesn't need them; vision already stops at walls
      drawings: sc.drawings.filter(d => !d.dmOnly),
    };
  }
  // Shapes seen only in dim light don't count as seen for the turn order.
  const visible = new Set(scene?.tokens.filter(t => !t.silhouette).map(t => t.id));
  const seen = new Set(c.encounter.seenTokens ?? []);
  const entries = c.encounter.entries.filter(e => (e.charId || e.tokenIds.some(id => visible.has(id) || seen.has(id))) && !isDefeatedIn(e, c));
  return {
    scene,
    chars: c.characters.map(({ id, name, portrait, image, color, conditions, concentrating, hp, maxHp, tempHp, ac, deathSaves }) => ({ id, name, portrait, image, color, conditions, concentrating, hp, maxHp, tempHp, ac, deathSaves })),
    encounter: { ...c.encounter, entries, turn: c.encounter.entries[c.encounter.turn] ? entries.indexOf(c.encounter.entries[c.encounter.turn]) : -1 },
    showMonsterNames: c.settings.showMonsterNames,
    camera, cameraNonce, vision,
  };
}
export type { Camera };
