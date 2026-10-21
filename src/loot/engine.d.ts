export type Rarity = 'M' | 'C' | 'U' | 'R' | 'V' | 'L' | 'A';
export interface LootEntry { id: string; name: string; r: Rarity; cat: string; desc: string; value?: string; src: string; q: number; extra: string; slot: string; slotRef?: unknown }
export interface Coins { gp?: number; pp?: number; sp?: number; copper?: number }
export interface LootResult { box: string; tier: string; level: number; items: LootEntry[]; ctx: Record<string, unknown>; coins: Coins | null; at: number }
export interface Box { id: string; name: string; blurb: string }
export interface Tier { id: string; name: string; lv: string }
export const RAR: Rarity[];
export const RNAME: Record<Rarity, string>;
export const CATS: Record<string, string>;
export const TIERS: Tier[];
export const BOXES: Box[];
export const BOXMAP: Record<string, Box>;
export const MAGIC_CATS: string[];
export const MAX_LEVEL: number;
export function openBox(box: string, tier: string, level: number): LootResult;
export function rerollAt(res: LootResult, idx: number): void;
export function oddsText(tier: string, level: number): string;
export function setLootState(s: unknown): void;
export function lootItems(): unknown[];
