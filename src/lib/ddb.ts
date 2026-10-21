import type { Ability, Character } from '../types';
import { ABILITIES } from '../types';
import { modOf } from './dice';
import { parseSheet } from './ddbSheet';

// Reads a public D&D Beyond character. Values are computed from the character data the way
// D&D Beyond does for common cases; anything unusual can be corrected by hand after import.

export function ddbIdFrom(input: string) {
  const m = input.match(/characters\/(\d+)/) || input.match(/^\s*(\d{5,})\s*$/);
  return m ? m[1] : null;
}

export async function fetchDdb(id: string): Promise<any> {
  const tries = [`/api/ddb?id=${id}`, `https://character-service.dndbeyond.com/character/v5/character/${id}`];
  let lastErr = 'Could not load the character.';
  for (const url of tries) {
    try {
      const r = await fetch(url);
      if (!r.ok) {
        if (r.status === 403 || r.status === 404) lastErr = 'D&D Beyond refused. Make sure the character privacy is set to Public.';
        continue;
      }
      const j = await r.json();
      const data = j.data ?? j;
      if (data && data.name && data.stats) return data;
      if (j.success === false) lastErr = j.message || lastErr;
    } catch { /* try the next route */ }
  }
  throw new Error(lastErr);
}

const AB_BY_ID: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const AB_NAME: Record<Ability, string> = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
const SKILLS: [string, Ability][] = [
  ['Acrobatics', 'dex'], ['Animal Handling', 'wis'], ['Arcana', 'int'], ['Athletics', 'str'], ['Deception', 'cha'], ['History', 'int'],
  ['Insight', 'wis'], ['Intimidation', 'cha'], ['Investigation', 'int'], ['Medicine', 'wis'], ['Nature', 'int'], ['Perception', 'wis'],
  ['Performance', 'cha'], ['Persuasion', 'cha'], ['Religion', 'int'], ['Sleight of Hand', 'dex'], ['Stealth', 'dex'], ['Survival', 'wis'],
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');

export function parseDdb(d: any, existing?: Partial<Character>): Omit<Character, 'id' | 'color'> {
  const classes: any[] = d.classes || [];
  const level = Math.max(1, classes.reduce((s, c) => s + (c.level || 0), 0));
  const pb = Math.ceil(level / 4) + 1;

  // Item modifiers only count for equipped (and attuned, if needed) items.
  const inv: any[] = d.inventory || [];
  const activeItemIds = new Set(inv.filter(i => i.equipped && (!i.definition?.canAttune || i.isAttuned)).map(i => i.definition?.id));
  const mods: any[] = [];
  for (const [src, list] of Object.entries<any[]>(d.modifiers || {})) {
    for (const m of list || []) if (src !== 'item' || activeItemIds.has(m.componentId)) mods.push(m);
  }
  const sum = (type: string, sub: string) => mods.filter(m => m.type === type && m.subType === sub).reduce((s, m) => s + (m.value ?? m.fixedValue ?? 0), 0);
  const has = (type: string, sub: string) => mods.some(m => m.type === type && m.subType === sub);

  const scores = {} as Record<Ability, number>;
  AB_BY_ID.forEach((ab, i) => {
    const id = i + 1;
    const base = d.stats?.find((s: any) => s.id === id)?.value ?? 10;
    const bonus = d.bonusStats?.find((s: any) => s.id === id)?.value ?? 0;
    const over = d.overrideStats?.find((s: any) => s.id === id)?.value;
    let v = base + bonus + sum('bonus', `${AB_NAME[ab]}-score`);
    const setTo = mods.filter(m => m.type === 'set' && m.subType === `${AB_NAME[ab]}-score`).map(m => m.value ?? 0);
    if (setTo.length) v = Math.max(v, ...setTo);
    scores[ab] = over ?? v;
  });
  const mod = (ab: Ability) => modOf(scores[ab]);

  // Hit points
  const perLevel = sum('bonus', 'hit-points-per-level');
  const maxHp = d.overrideHitPoints ?? ((d.baseHitPoints ?? 0) + mod('con') * level + perLevel * level + (d.bonusHitPoints ?? 0));
  const hp = Math.max(0, maxHp - (d.removedHitPoints ?? 0));

  // Armor class
  const armor = inv.filter(i => i.equipped && i.definition?.armorTypeId && i.definition.armorTypeId !== 4);
  const shield = inv.find(i => i.equipped && i.definition?.armorTypeId === 4);
  let ac: number;
  if (armor.length) {
    const a = armor.sort((x, y) => (y.definition.armorClass ?? 0) - (x.definition.armorClass ?? 0))[0].definition;
    const t = a.armorTypeId;
    ac = (a.armorClass ?? 10) + (t === 1 ? mod('dex') : t === 2 ? Math.min(mod('dex'), has('set', 'ignore-medium-armor-dex-cap') ? 3 : 2) : 0);
    ac += sum('bonus', 'armored-armor-class');
  } else {
    ac = 10 + mod('dex');
    const unarmored = mods.filter(m => m.subType === 'unarmored-armor-class');
    const statBonus = unarmored.map(m => (m.statId ? mod(AB_BY_ID[m.statId - 1]) : 0) + (m.value ?? 0));
    if (statBonus.length) ac += Math.max(...statBonus);
    else {
      const names = classes.map(c => c.definition?.name);
      if (names.includes('Barbarian')) ac += mod('con');
      else if (names.includes('Monk') && !shield) ac += mod('wis');
    }
  }
  if (shield) ac += shield.definition.armorClass ?? 2;
  ac += sum('bonus', 'armor-class');

  // Saves and skills
  const saves = {} as Partial<Record<Ability, number>>;
  ABILITIES.forEach(ab => {
    const prof = has('proficiency', `${AB_NAME[ab]}-saving-throw`);
    saves[ab] = mod(ab) + (prof ? pb : 0) + sum('bonus', 'saving-throws') + sum('bonus', `${AB_NAME[ab]}-saving-throw`);
  });
  const jack = has('half-proficiency', 'ability-checks');
  const skills = SKILLS.map(([name, ab]) => {
    const s = slug(name);
    const mult = has('expertise', s) ? 2 : has('proficiency', s) ? 1 : has('half-proficiency', s) || jack ? 0.5 : 0;
    return { name, bonus: mod(ab) + Math.floor(pb * mult) + sum('bonus', s) + sum('bonus', 'ability-checks') };
  });
  const perception = skills.find(s => s.name === 'Perception')!.bonus;
  const initBonus = mod('dex') + sum('bonus', 'initiative') + (jack ? Math.floor(pb / 2) : 0);

  // Weapon attacks (assumes proficiency; magic bonuses come from the item's modifiers)
  const attacks = inv.filter(i => i.equipped && i.definition?.filterType === 'Weapon').map(i => {
    const def = i.definition;
    const props: string[] = (def.properties || []).map((p: any) => p.name);
    const ranged = def.attackType === 2;
    const ab: Ability = props.includes('Finesse') ? (mod('dex') > mod('str') ? 'dex' : 'str') : ranged ? 'dex' : 'str';
    const magic = (def.grantedModifiers || []).filter((m: any) => m.type === 'bonus' && m.subType === 'magic').reduce((s: number, m: any) => s + (m.value ?? 0), 0);
    const dice = def.damage?.diceString || '1';
    const dm = mod(ab) + magic;
    return {
      name: def.name,
      toHit: mod(ab) + pb + magic,
      damage: `${dice}${dm ? (dm > 0 ? '+' : '') + dm : ''}`,
      notes: [def.damageType, ranged && def.range ? `${def.range}/${def.longRange} ft` : '', ...props.filter(p => ['Finesse', 'Light', 'Heavy', 'Reach', 'Two-Handed', 'Versatile', 'Thrown'].includes(p))].filter(Boolean).join(' · '),
    };
  });

  const clsText = classes.map(c => `${c.definition?.name}${c.subclassDefinition ? ` (${c.subclassDefinition.name})` : ''} ${c.level}`).join(' / ');
  const speedVal = d.race?.weightSpeeds?.normal?.walk ?? 30;
  return {
    name: d.name,
    player: d.username ?? existing?.player,
    summary: `${d.race?.fullName ?? ''} ${clsText}`.trim(),
    portrait: d.decorations?.avatarUrl || d.avatarUrl || undefined,
    ac, maxHp, hp, tempHp: d.temporaryHitPoints ?? 0,
    initBonus, passivePerception: 10 + perception,
    speed: `${speedVal + sum('bonus', 'speed')} ft.`,
    abilities: scores, saves, skills, attacks,
    sheet: parseSheet(d, { scores, mods, pb, level }),
    ddbInventory: inv.filter(i => i.definition?.name).map(i => ({ name: i.definition.name, q: i.quantity ?? 1, equipped: !!i.equipped })),
    conditions: existing?.conditions ?? [],
    concentrating: existing?.concentrating ?? false,
    ddbId: String(d.id ?? existing?.ddbId ?? ''),
    syncedAt: Date.now(),
  };
}
