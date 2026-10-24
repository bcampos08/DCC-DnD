import type { Campaign, InitEntry, Token } from '../types';

// A monster is out of the fight at 0 HP; a player only after three failed death saves.
export function isDefeatedIn(e: InitEntry, c: Pick<Campaign, 'characters' | 'scenes'>) {
  if (e.charId) {
    const ch = c.characters.find(x => x.id === e.charId);
    return !!ch && ch.maxHp > 0 && ch.hp <= 0 && (ch.deathSaves?.fail ?? 0) >= 3;
  }
  if (!e.tokenIds.length) return false;
  const all = c.scenes.flatMap(s => s.tokens);
  const toks = e.tokenIds.map(id => all.find(t => t.id === id)).filter(Boolean) as Token[];
  if (!toks.length) return false;
  return toks.every(t => !t.charId && t.maxHp > 0 && t.hp <= 0);
}
