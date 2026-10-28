import { useEffect, useState } from 'react';
import { lootItems } from '../loot/engine';

// SRD 5.1 text (rules, conditions, spells, items) built by scripts/build-srd.mjs.
// System Reference Document 5.1 by Wizards of the Coast LLC, licensed under CC BY 4.0.
export interface SrdEntry { n: string; d: string; h?: string; s?: string; r?: string; cat?: string; l?: number; sc?: string; c?: string[]; conc?: boolean; rit?: boolean }
export interface Srd { rules: SrdEntry[]; conditions: SrdEntry[]; spells: SrdEntry[]; items: SrdEntry[]; gear: SrdEntry[]; props: SrdEntry[]; damage: SrdEntry[]; skills: SrdEntry[] }

let cache: Srd | null = null;
let pending: Promise<Srd> | null = null;
export function loadSrdText(): Promise<Srd> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch('/data/srd.json').then(r => r.json()).then((d: Srd) => (cache = d)).catch(e => { pending = null; throw e; });
  return pending;
}
export function useSrdText() {
  const [d, setD] = useState<Srd | null>(cache);
  useEffect(() => { if (!d) loadSrdText().then(setD).catch(() => {}); }, [d]);
  return d;
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9+]/g, '');
let index: { items: Map<string, SrdEntry>; gear: Map<string, SrdEntry>; spells: Map<string, SrdEntry> } | null = null;
const idx = (d: Srd) => (index ??= {
  items: new Map(d.items.map(x => [norm(x.n), x])),
  gear: new Map(d.gear.map(x => [norm(x.n), x])),
  spells: new Map(d.spells.map(x => [norm(x.n), x])),
});

// Loot Box names that differ from the SRD's.
const ALIAS: Record<string, string> = {
  "Keoghtom's Ointment": 'Restorative Ointment', "Daern's Instant Fortress": 'Instant Fortress', 'Stone of Good Luck': 'Stone of Good Luck (Luckstone)',
  'Iron Bands of Bilarro': 'Iron Bands of Binding', "Nolzur's Marvelous Pigments": 'Marvelous Pigments', 'Apparatus of Kwalish': 'Apparatus of the Crab',
  'Glamoured Studded Leather': 'Glamoured Studded Leather Armor', "Heward's Handy Haversack": 'Handy Haversack',
};
const MAGIC_PLUS: Record<string, string> = { mwpn: 'Weapon', marmor: 'Armor', mammo: 'Ammunition' };

export interface ItemText { item?: SrdEntry; spell?: SrdEntry }

// Finds the SRD text for a loot item. `ref` is the Loot Box item id, which keeps the original
// name (e.g. "Weapon, +1") when the shown name has a weapon or variant filled in.
export function srdItemText(d: Srd, name: string, ref?: string, cat?: string): ItemText {
  const ix = idx(d);
  const scroll = /^Spell Scroll: (.+)$/.exec(name);
  if (scroll) return { item: ix.items.get(norm('Spell Scroll')), spell: ix.spells.get(norm(scroll[1])) };
  const base = ref ? (lootItems() as { id: string; name: string }[]).find(i => i.id === ref)?.name : undefined;
  // The shown name is tried first (it has the variant filled in), then the Loot Box's own name.
  const names: string[] = [];
  for (const n of base && base !== name ? [name, base] : [name]) {
    names.push(n);
    if (ALIAS[n]) names.push(ALIAS[n]);
    const p = /^(.*?) \(([^)]+)\)$/.exec(n);
    if (p) {
      const v = p[2].includes(':') ? p[2].split(':').pop()!.trim() : p[2];
      const res = /^(Potion|Ring) of Resistance$/.exec(p[1]);
      names.push(res ? `${res[1]} of ${v} Resistance` : `${v} ${p[1]}`, p[1]);
      if (ALIAS[p[1]]) names.push(ALIAS[p[1]]);
    }
    const fig = /^(Figurine of Wondrous Power|Instrument of the Bards): (.+)$/.exec(n);
    if (fig) names.push(`${fig[2]} ${fig[1]}`, fig[1]);
    const plus = /, \+(\d)$/.exec(n);
    if (plus && cat && MAGIC_PLUS[cat]) names.push(`${MAGIC_PLUS[cat]}, +${plus[1]}`);
    if (/^Spell Scroll \(/.test(n)) names.push('Spell Scroll');
    names.push(n.replace(/^\w+'s /, ''));
  }
  for (const n of names) { const hit = ix.items.get(norm(n)); if (hit) return { item: hit }; }
  for (const n of names) {
    const k = norm(n);
    const hit = ix.gear.get(k) ?? ix.gear.get(k.replace(/s$/, '')) ?? ix.gear.get(k.replace(/es$/, ''));
    if (hit) return { item: hit };
  }
  return {};
}
