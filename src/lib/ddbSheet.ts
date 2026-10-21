import type { Ability, DdbSheet, SheetAction, SheetItem, SheetSpell, SheetText } from '../types';
import { modOf } from './dice';

// Reads the rest of a D&D Beyond character: spells, slots, features, actions, proficiencies,
// defenses, inventory details, money, personality and notes. Every field is optional in their
// data, so each lookup falls back quietly.

const AB_BY_ID: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const AB_LONG: Record<Ability, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const ALIGN = ['', 'Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
const RESET: Record<number, string> = { 1: 'short rest', 2: 'long rest', 3: 'dawn', 4: 'other' };
const ACTIVATION: Record<number, string> = { 0: '', 1: 'action', 2: 'no action', 3: 'bonus action', 4: 'reaction', 5: 'special', 6: 'minute', 7: 'hour', 8: 'special' };
const FULL = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'];
const HALF = ['Paladin', 'Ranger'];
const THIRD_SUB = ['Eldritch Knight', 'Arcane Trickster'];
// Spell slots by caster level (PHB multiclass table).
const SLOTS: number[][] = [
  [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// D&D Beyond text is HTML. Turn it into plain text with line breaks.
export function htmlToText(html?: string | null): string {
  if (!html) return '';
  let s = String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d|tr|table|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/t[dh]>/gi, '  ')
    .replace(/<[^>]+>/g, '');
  if (typeof document !== 'undefined') {
    const t = document.createElement('textarea');
    t.innerHTML = s;
    s = t.value;
  } else {
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’');
  }
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

export function parseSheet(d: any, ctx: { scores: Record<Ability, number>; mods: any[]; pb: number; level: number }): DdbSheet {
  const { scores, mods, pb } = ctx;
  const mod = (ab: Ability) => modOf(scores[ab]);
  const classes: any[] = d.classes || [];
  const friendly = (m: any) => m.friendlySubtypeName || m.subType?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Proficiencies and languages
  const profMods = mods.filter(m => m.type === 'proficiency' && !/saving-throw$/.test(m.subType ?? ''));
  const skillSlugs = new Set(['acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival']);
  const prof = { armor: [] as string[], weapons: [] as string[], tools: [] as string[], languages: [] as string[], other: [] as string[] };
  for (const m of profMods) {
    if (skillSlugs.has(m.subType)) continue;
    const n = friendly(m);
    const sub = String(m.subType ?? '');
    if (/armor|shields/.test(sub)) prof.armor.push(n);
    else if (/weapon|sword|bow|axe|crossbow|dagger|hammer|mace|club|spear|staff|sling|dart|javelin|pick|flail|glaive|halberd|lance|maul|morningstar|pike|rapier|scimitar|trident|whip|net|sickle|blowgun/.test(sub)) prof.weapons.push(n);
    else if (/tools|kit|supplies|instrument|set|utensils|vehicles|lute|flute|drum|lyre|horn|bagpipes|dulcimer|pan-flute|shawm|viol/.test(sub)) prof.tools.push(n);
    else prof.other.push(n);
  }
  prof.languages = mods.filter(m => m.type === 'language').map(friendly);
  (Object.keys(prof) as (keyof typeof prof)[]).forEach(k => (prof[k] = uniq(prof[k])));

  // Defenses
  const defenses = {
    resist: uniq(mods.filter(m => m.type === 'resistance').map(friendly)),
    immune: uniq(mods.filter(m => m.type === 'immunity' && !/condition|blinded|charmed|deafened|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious|exhaustion/i.test(m.subType ?? '') ).map(friendly)),
    vuln: uniq(mods.filter(m => m.type === 'vulnerability').map(friendly)),
    condImmune: uniq(mods.filter(m => m.type === 'immunity' && /blinded|charmed|deafened|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious|exhaustion/i.test(m.subType ?? '')).map(friendly)),
  };

  // Senses and speeds
  const senseVal = (sub: string) => Math.max(0, ...mods.filter(m => (m.type === 'set-base' || m.type === 'sense') && m.subType === sub).map(m => m.value ?? 0));
  const senses = ['darkvision', 'blindsight', 'tremorsense', 'truesight'].map(s => [s, senseVal(s)] as const).filter(([, v]) => v > 0).map(([s, v]) => `${s[0].toUpperCase() + s.slice(1)} ${v} ft.`);
  const speeds: string[] = [];
  const ws = d.race?.weightSpeeds?.normal ?? {};
  for (const [k, label] of [['fly', 'Fly'], ['swim', 'Swim'], ['climb', 'Climb'], ['burrow', 'Burrow']] as const) {
    const innate = Math.max(ws[k] ?? 0, ...mods.filter(m => m.type === 'set' && m.subType === `innate-speed-${k === 'fly' ? 'flying' : k === 'swim' ? 'swimming' : k === 'climb' ? 'climbing' : 'burrowing'}`).map(m => m.value ?? 0));
    if (innate > 0) speeds.push(`${label} ${innate} ft.`);
  }

  // Spellcasting per class
  const spellcasting = classes.filter(c => c.definition?.canCastSpells || c.subclassDefinition?.canCastSpells).map(c => {
    const abId = c.definition?.spellCastingAbilityId ?? c.subclassDefinition?.spellCastingAbilityId;
    const ab = abId ? AB_BY_ID[abId - 1] : undefined;
    return ab ? { cls: c.definition?.name ?? 'Spellcasting', ability: AB_LONG[ab], dc: 8 + pb + mod(ab), attack: pb + mod(ab) } : null;
  }).filter(Boolean) as DdbSheet['spellcasting'];

  // Spell slots
  const nonWarlock = classes.filter(c => c.definition?.name !== 'Warlock');
  const casterLevel = (() => {
    const parts = nonWarlock.map(c => {
      const n = c.definition?.name, sub = c.subclassDefinition?.name, lv = c.level || 0;
      if (FULL.includes(n)) return { lv, kind: 'full' };
      if (n === 'Artificer') return { lv, kind: 'art' };
      if (HALF.includes(n)) return { lv, kind: 'half' };
      if (THIRD_SUB.includes(sub)) return { lv, kind: 'third' };
      return null;
    }).filter(Boolean) as { lv: number; kind: string }[];
    if (!parts.length) return 0;
    if (parts.length === 1) {
      const p = parts[0];
      if (p.kind === 'full') return p.lv;
      if (p.kind === 'art') return Math.ceil(p.lv / 2);
      if (p.kind === 'half') return p.lv >= 2 ? Math.ceil(p.lv / 2) : 0;
      return p.lv >= 3 ? Math.ceil(p.lv / 3) : 0;
    }
    return parts.reduce((s, p) => s + (p.kind === 'full' ? p.lv : p.kind === 'art' ? Math.ceil(p.lv / 2) : p.kind === 'half' ? Math.floor(p.lv / 2) : Math.floor(p.lv / 3)), 0);
  })();
  const usedAt = (lvl: number) => (d.spellSlots || []).find((s: any) => s.level === lvl)?.used ?? 0;
  const slots = (SLOTS[Math.min(20, casterLevel)] || []).map((max, i) => ({ level: i + 1, max, used: Math.min(max, usedAt(i + 1)) }));
  const wl = classes.find(c => c.definition?.name === 'Warlock');
  let pact: DdbSheet['pact'];
  if (wl) {
    const lv = wl.level || 1;
    const max = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1;
    const level = Math.min(5, Math.ceil(lv / 2));
    pact = { level, max, used: Math.min(max, (d.pactMagic || []).find((s: any) => s.level === level)?.used ?? (d.pactMagic || [])[0]?.used ?? 0) };
  }

  // Spells: class lists plus spells granted by race, feats and items
  const spells: SheetSpell[] = [];
  const seen = new Set<string>();
  const addSpell = (sp: any, source: string) => {
    const def = sp.definition;
    if (!def?.name) return;
    const key = def.name + '|' + source;
    if (seen.has(key)) return;
    seen.add(key);
    const comps = (def.components || []).map((c: number) => ['', 'V', 'S', 'M'][c]).filter(Boolean).join(', ');
    const r = def.range || {};
    const range = r.origin === 'Ranged' || (r.origin === undefined && r.rangeValue) ? `${r.rangeValue} ft.` : r.origin === 'Self' && r.aoeValue ? `Self (${r.aoeValue}-ft. ${String(r.aoeType ?? '').toLowerCase()})` : r.origin || '';
    const du = def.duration || {};
    const duration = du.durationType === 'Instantaneous' ? 'Instantaneous' : du.durationType === 'Special' ? 'Special' : du.durationInterval ? `${def.concentration ? 'Concentration, up to ' : ''}${du.durationInterval} ${String(du.durationUnit ?? '').toLowerCase()}${du.durationInterval > 1 ? 's' : ''}` : du.durationType || '';
    const act = def.activation || sp.activation || {};
    const time = act.activationTime ? `${act.activationTime} ${ACTIVATION[act.activationType] ?? ''}`.trim() : '';
    spells.push({
      name: def.name, level: def.level ?? 0, school: def.school ?? '', time, range, components: comps + (def.componentsDescription ? ` (${def.componentsDescription})` : ''),
      duration, concentration: !!def.concentration, ritual: !!def.ritual, desc: htmlToText(def.description),
      prepared: !!(sp.prepared || sp.alwaysPrepared || def.level === 0 || sp.countsAsKnownSpell), always: !!sp.alwaysPrepared, source,
    });
  };
  for (const cs of d.classSpells || []) {
    const cls = classes.find(c => c.id === cs.characterClassId)?.definition?.name ?? 'Class';
    for (const sp of cs.spells || []) addSpell(sp, cls);
  }
  for (const [src, list] of Object.entries<any[]>(d.spells || {})) for (const sp of list || []) addSpell({ ...sp, alwaysPrepared: true }, src === 'race' ? 'Species' : src === 'feat' ? 'Feat' : src === 'item' ? 'Item' : src === 'class' ? 'Class feature' : src);
  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  // Limited-use and special actions
  const actions: SheetAction[] = [];
  for (const [src, list] of Object.entries<any[]>(d.actions || {})) for (const a of list || []) {
    if (!a?.name) continue;
    const lu = a.limitedUse;
    let uses: SheetAction['uses'];
    if (lu && (lu.maxUses || lu.useProficiencyBonus || lu.statModifierUsesId)) {
      let max = lu.maxUses || 0;
      if (lu.statModifierUsesId) max += mod(AB_BY_ID[lu.statModifierUsesId - 1]);
      if (lu.useProficiencyBonus) max += pb;
      uses = { max: Math.max(1, max), used: lu.numberUsed ?? 0, reset: RESET[lu.resetType] ?? '' };
    }
    actions.push({ name: a.name, desc: htmlToText(a.description || a.snippet), source: src === 'race' ? 'Species' : src[0].toUpperCase() + src.slice(1), uses });
  }

  // Features: class and subclass features up to current level, species traits, feats, background
  const features: SheetText[] = [];
  for (const c of classes) {
    const all = [...(c.classFeatures || []), ...(c.subclassDefinition?.classFeatures || []).map((f: any) => ({ definition: f }))];
    const names = new Set<string>();
    for (const f of all) {
      const def = f.definition ?? f;
      if (!def?.name || names.has(def.name) || (def.requiredLevel ?? 1) > (c.level || 0)) continue;
      if (/^(Hit Points|Proficiencies|Ability Score Improvement|Spellcasting Focus)$/.test(def.name) && !def.description) continue;
      names.add(def.name);
      features.push({ name: def.name, desc: htmlToText(def.description || def.snippet), source: c.definition?.name, level: def.requiredLevel });
    }
  }
  for (const t of d.race?.racialTraits || []) {
    const def = t.definition;
    if (!def?.name || /^(Age|Size|Alignment|Languages|Ability Score Increase|Speed)$/.test(def.name)) continue;
    features.push({ name: def.name, desc: htmlToText(def.description || def.snippet), source: d.race?.fullName ?? 'Species' });
  }
  for (const f of d.feats || []) if (f.definition?.name) features.push({ name: f.definition.name, desc: htmlToText(f.definition.description || f.definition.snippet), source: 'Feat' });

  const bgDef = d.background?.definition ?? d.background?.customBackground;
  const background = bgDef?.name ? {
    name: bgDef.name,
    desc: htmlToText(bgDef.featureName ? `<b>${bgDef.featureName}.</b> ${bgDef.featureDescription ?? ''}` : bgDef.shortDescription ?? bgDef.description),
    source: 'Background',
  } : undefined;
  if (background && bgDef.featureName) features.push({ name: bgDef.featureName, desc: htmlToText(bgDef.featureDescription), source: `Background: ${bgDef.name}` });

  // Inventory details
  const inventory: SheetItem[] = (d.inventory || []).filter((i: any) => i.definition?.name).map((i: any) => ({
    name: i.definition.name, q: i.quantity ?? 1, equipped: !!i.equipped, attuned: !!i.isAttuned,
    weight: i.definition.weight || undefined, rarity: i.definition.rarity && i.definition.rarity !== 'Common' ? i.definition.rarity : undefined,
    type: i.definition.filterType || i.definition.type, magic: !!i.definition.magic, desc: htmlToText(i.definition.description || i.definition.snippet),
  }));
  for (const ci of d.customItems || []) if (ci?.name) inventory.push({ name: ci.name, q: ci.quantity ?? 1, equipped: false, attuned: false, weight: ci.weight || undefined, desc: htmlToText(ci.description), type: 'Custom' });

  const cur = d.currencies || {};
  const t = d.traits || {};
  const traits = [['Personality traits', t.personalityTraits], ['Ideals', t.ideals], ['Bonds', t.bonds], ['Flaws', t.flaws], ['Appearance', t.appearance]]
    .filter(([, v]) => v).map(([label, text]) => ({ label: label as string, text: htmlToText(text as string) }));
  const n = d.notes || {};
  const notes = [['Backstory', n.backstory], ['Allies', n.allies], ['Organizations', n.organizations], ['Enemies', n.enemies], ['Personal possessions', n.personalPossessions], ['Other holdings', n.otherHoldings], ['Other notes', n.otherNotes]]
    .filter(([, v]) => v).map(([label, text]) => ({ label: label as string, text: htmlToText(text as string) }));
  const bio = [['Gender', d.gender], ['Age', d.age], ['Height', d.height], ['Weight', d.weight ? `${d.weight} lb` : ''], ['Eyes', d.eyes], ['Hair', d.hair], ['Skin', d.skin], ['Faith', d.faith], ['Lifestyle', d.lifestyle?.name]]
    .filter(([, v]) => v).map(([label, value]) => ({ label: label as string, value: String(value) }));

  return {
    alignment: ALIGN[d.alignmentId] || undefined,
    xp: d.currentXp ?? undefined,
    inspiration: !!d.inspiration,
    background,
    hitDice: classes.map(c => ({ die: `d${c.definition?.hitDice ?? 8}`, total: c.level || 0, used: c.hitDiceUsed ?? 0 })),
    deathSaves: d.deathSaves ? { success: d.deathSaves.successCount ?? 0, fail: d.deathSaves.failCount ?? 0 } : undefined,
    senses, speeds, proficiencies: prof, defenses, spellcasting, slots, pact, spells, actions, features, inventory,
    currency: { cp: cur.cp ?? 0, sp: cur.sp ?? 0, ep: cur.ep ?? 0, gp: cur.gp ?? 0, pp: cur.pp ?? 0 },
    traits, notes, bio,
  };
}
