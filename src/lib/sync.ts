import type { Camera, Campaign, Character, Encounter, LootItem, RollResult, Scene } from '../types';

// The table window runs on the same computer (dragged onto the TV), so the DM window
// streams a players-safe copy of the state over a BroadcastChannel.

// dmOnly: measuring while moving hidden tokens, so players must not see it.
export interface Measure { ax: number; ay: number; bx: number; by: number; feet: number; dmOnly?: boolean }
export interface Ping { x: number; y: number; at: number }
export interface Reveal { kind: 'roll'; roll: RollResult; at: number }
export interface LootReveal { kind: 'loot'; title: string; items: LootItem[]; at: number }
export interface TableState {
  scene: Scene | null;
  chars: Pick<Character, 'id' | 'name' | 'portrait' | 'color' | 'conditions' | 'concentrating' | 'hp' | 'maxHp' | 'tempHp' | 'ac'>[];
  encounter: Encounter;
  showMonsterNames: boolean;
  camera: { cx: number; cy: number; viewW: number } | null;
  cameraNonce: number;
}
export type Msg =
  | { type: 'hello' }
  | { type: 'state'; state: TableState }
  | { type: 'measure'; m: Measure | null }
  | { type: 'ping'; p: Ping }
  | { type: 'popup'; p: Reveal | LootReveal }
  | { type: 'bye' };

export const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dcc-table') : null;
export const send = (m: Msg) => channel?.postMessage(m);

// Players see HP as a percentage bar only, and never see hidden tokens or DM-only drawings.
export function tableState(c: Campaign, cameraNonce: number, camera: TableState['camera']): TableState {
  const sc = c.scenes.find(s => s.id === c.tableSceneId) ?? null;
  let scene: Scene | null = null;
  if (sc) {
    scene = {
      ...sc,
      tokens: sc.tokens.filter(t => !t.hidden).map(({ note: _note, ...t }) => (t.kind === 'pc' ? t : { ...t, hp: t.maxHp ? Math.ceil((t.hp / t.maxHp) * 100) : 0, maxHp: t.maxHp ? 100 : 0, tempHp: 0, ac: 0 })),
      drawings: sc.drawings.filter(d => !d.dmOnly),
    };
  }
  const visible = new Set(scene?.tokens.map(t => t.id));
  const entries = c.encounter.entries.filter(e => e.charId || e.tokenIds.some(id => visible.has(id)));
  return {
    scene,
    chars: c.characters.map(({ id, name, portrait, color, conditions, concentrating, hp, maxHp, tempHp, ac }) => ({ id, name, portrait, color, conditions, concentrating, hp, maxHp, tempHp, ac })),
    encounter: { ...c.encounter, entries, turn: c.encounter.entries[c.encounter.turn] ? entries.indexOf(c.encounter.entries[c.encounter.turn]) : -1 },
    showMonsterNames: c.settings.showMonsterNames,
    camera, cameraNonce,
  };
}
export type { Camera };
