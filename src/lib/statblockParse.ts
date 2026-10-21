import type { Monster, MonsterAction, Ability } from '../types';

// Best-effort reader for a stat block pasted as plain text (D&D Beyond, PDFs, etc.).
const num = (s?: string) => (s ? parseInt(s.replace('−', '-'), 10) : 0);
const AB_MAP: Record<string, Ability> = { str: 'str', strength: 'str', dex: 'dex', dexterity: 'dex', con: 'con', constitution: 'con', int: 'int', intelligence: 'int', wis: 'wis', wisdom: 'wis', cha: 'cha', charisma: 'cha' };

export function parseAction(name: string, desc: string): MonsterAction {
  const a: MonsterAction = { name, desc };
  const hit = desc.match(/([+\-−]\d+)\s*to hit/i);
  if (hit) a.atk = num(hit[1]);
  const dmg = [...desc.matchAll(/\((\d+d\d+(?:\s*[+\-−]\s*\d+)?)\)\s*([a-z]+)\s+damage/gi)].map(m => ({ dice: m[1].replace(/\s|−/g, s => (s === '−' ? '-' : '')), type: cap(m[2]) }));
  if (dmg.length) a.dmg = dmg;
  const dc = desc.match(/DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i);
  if (dc) a.dc = { value: num(dc[1]), ab: AB_MAP[dc[2].toLowerCase()] };
  return a;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1).toLowerCase();

export function parseStatBlock(text: string): Partial<Monster> {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const m: Partial<Monster> = { traits: [], actions: [], saves: [], skills: [] };
  if (!lines.length) return m;
  m.name = lines[0];
  const all = lines.join('\n');
  const st = all.match(/(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+([^,\n]+),\s*([^\n]+)/i);
  if (st) { m.size = cap(st[1]); m.type = st[2].trim(); m.alignment = st[3].trim(); }
  const ac = all.match(/Armor Class\s*(\d+)\s*(?:\(([^)]+)\))?/i); if (ac) { m.ac = num(ac[1]); m.acNote = ac[2] ?? ''; }
  const hp = all.match(/Hit Points\s*(\d+)\s*(?:\(([^)]+)\))?/i); if (hp) { m.hp = num(hp[1]); m.hd = (hp[2] ?? '').replace(/\s/g, ''); }
  const sp = all.match(/Speed\s*([^\n]+)/i); if (sp) m.speed = sp[1].trim();
  const after = all.slice(all.search(/\bSTR\b/i) >= 0 ? all.search(/\bSTR\b/i) : 0);
  const scores = [...after.matchAll(/(\d{1,2})\s*\(\s*[+\-−]?\d+\s*\)/g)].slice(0, 6).map(x => num(x[1]));
  if (scores.length === 6) m.abilities = { str: scores[0], dex: scores[1], con: scores[2], int: scores[3], wis: scores[4], cha: scores[5] };
  const field = (label: string) => all.match(new RegExp(label + '\\s+([^\\n]+)', 'i'))?.[1].trim() ?? '';
  const sv = field('Saving Throws'); if (sv) m.saves = [...sv.matchAll(/(Str|Dex|Con|Int|Wis|Cha)\w*\s*([+\-−]\d+)/gi)].map(x => ({ ab: AB_MAP[x[1].toLowerCase()], bonus: num(x[2]) }));
  const sk = field('Skills'); if (sk) m.skills = [...sk.matchAll(/([A-Za-z ]+?)\s*([+\-−]\d+)/g)].map(x => ({ name: x[1].replace(/^[,\s]+/, '').trim(), bonus: num(x[2]) }));
  m.vuln = field('Damage Vulnerabilities'); m.res = field('Damage Resistances'); m.imm = field('Damage Immunities'); m.condImm = field('Condition Immunities');
  const sen = field('Senses'); const pp = sen.match(/passive Perception\s*(\d+)/i);
  m.senses = sen.replace(/,?\s*passive Perception\s*\d+/i, '').trim(); if (pp) m.pp = num(pp[1]);
  m.languages = field('Languages');
  const cr = all.match(/Challenge\s*([\d/]+)\s*(?:\(([\d,]+)\s*XP\))?/i);
  if (cr) { m.cr = cr[1].includes('/') ? num(cr[1].split('/')[0]) / num(cr[1].split('/')[1]) : num(cr[1]); m.xp = num((cr[2] ?? '0').replace(/,/g, '')); }

  // Traits and actions: "Name. Description" paragraphs, sorted into sections by headers.
  const start = lines.findIndex(l => /^(Challenge|Proficiency Bonus)/i.test(l));
  let section: 'traits' | 'actions' | 'reactions' | 'legendary' = 'traits';
  const lists: Record<string, MonsterAction[]> = { traits: [], actions: [], reactions: [], legendary: [] };
  let cur: { name: string; desc: string } | null = null;
  const flush = () => { if (cur) lists[section].push(parseAction(cur.name, cur.desc.trim())); cur = null; };
  for (const l of lines.slice(start + 1)) {
    if (/^Proficiency Bonus/i.test(l)) continue;
    if (/^Actions$/i.test(l)) { flush(); section = 'actions'; continue; }
    if (/^(Reactions|Bonus Actions)$/i.test(l)) { flush(); section = 'reactions'; continue; }
    if (/^Legendary Actions$/i.test(l)) { flush(); section = 'legendary'; continue; }
    const mm = l.match(/^([A-Z][A-Za-z0-9'’()/,\- ]{1,60}?)\.\s+(.*)$/);
    if (mm) { flush(); cur = { name: mm[1], desc: mm[2] }; }
    else if (cur) cur.desc += '\n' + l;
    else if (section === 'legendary') { /* intro text */ }
  }
  flush();
  m.traits = lists.traits; m.actions = lists.actions;
  if (lists.reactions.length) m.reactions = lists.reactions;
  if (lists.legendary.length) m.legendary = lists.legendary;
  return m;
}
