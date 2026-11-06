export type Rarity = 'M' | 'C' | 'U' | 'R' | 'V' | 'L' | 'A';
export interface LootEntry { id: string; name: string; r: Rarity; cat: string; desc: string; value?: string; src: string; q: number; extra: string; slot: string; slotRef?: unknown }
export interface Coins { gp?: number; pp?: number; sp?: number; copper?: number }
export interface LootResult {
  box: string; tier: string; level: number; items: LootEntry[]; ctx: Record<string, unknown>; coins: Coins | null; at: number;
  // Monster box only
  monster?: 1; mtype?: string; monName?: string; roll?: number; band?: string; raw?: number; anyLevel?: 1;
}
export interface Box { id: string; name: string; blurb: string; monster?: 1 }
export interface Tier { id: string; name: string; lv: string }
export interface Band { max: number; label: string; items: string }
export interface MonsterOpts { mtype: string; roll: number; monsterId?: string }
export interface LootMonster { id: string; name: string; type: string; tier?: string; onlyOwn?: boolean }
export const RAR: Rarity[];
export const RNAME: Record<Rarity, string>;
export const CATS: Record<string, string>;
export const TIERS: Tier[];
export const BOXES: Box[];
export const BOXMAP: Record<string, Box>;
export const MAGIC_CATS: string[];
export const MTYPES: Record<string, string>;
export const BANDS: Band[];
export const MONSTER_LEVEL: Record<string, number>;
export const MAX_LEVEL: number;
export function bandFor(roll: number): Band;
export function openBox(box: string, tier: string, level: number, opts?: MonsterOpts): LootResult;
export function rerollAt(res: LootResult, idx: number): void;
export function oddsText(tier: string, level: number): string;
export function setLootState(s: unknown): void;
export function lootItems(): unknown[];
export function lootMonsters(): LootMonster[];
export function onLootMessage(fn: (msg: string) => void): void;
export function monsterOddsText(tier: string, roll: number): string;
