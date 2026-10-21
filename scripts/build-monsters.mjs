// Converts the 5e-bits SRD monster file into the compact format the app uses.
// Usage: node scripts/build-monsters.mjs <path to 5e-SRD-Monsters.json>
import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ABS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const SHORT = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
const speedStr = s => Object.entries(s).filter(([k]) => k !== 'hover').map(([k, v]) => (k === 'walk' ? v : `${k} ${v}`) + (k === 'fly' && s.hover ? ' (hover)' : '')).join(', ');
const sensesStr = s => Object.entries(s).filter(([k]) => k !== 'passive_perception').map(([k, v]) => `${k} ${v}`).join(', ');
const dmgList = l => l.map(x => typeof x === 'string' ? x : x.name).join('; ');
const act = a => {
  const o = { name: a.name, desc: a.desc || '' };
  if (a.usage) {
    const u = a.usage;
    o.name += u.type === 'recharge on roll' ? ` (Recharge ${u.min_value}–6)` : u.type === 'per day' ? ` (${u.times}/Day)` : u.type === 'recharge after rest' ? ` (Recharges after a ${u.rest_types?.join(' or ')} rest)` : '';
  }
  if (a.attack_bonus != null) o.atk = a.attack_bonus;
  const dmg = (a.damage || []).filter(d => d.damage_dice).map(d => ({ dice: d.damage_dice.replace(/\s/g, ''), type: d.damage_type?.name || '' }));
  if (dmg.length) o.dmg = dmg;
  if (a.dc) o.dc = { ab: a.dc.dc_type?.index, value: a.dc.dc_value };
  return o;
};
const out = src.map(m => {
  const saves = [], skills = [];
  for (const p of m.proficiencies) {
    const n = p.proficiency.name;
    if (n.startsWith('Saving Throw: ')) saves.push({ ab: n.slice(14).toLowerCase(), bonus: p.value });
    else if (n.startsWith('Skill: ')) skills.push({ name: n.slice(7), bonus: p.value });
  }
  const ac = m.armor_class[0];
  const o = {
    id: m.index, name: m.name, size: m.size,
    type: m.type + (m.subtype ? ` (${m.subtype})` : ''), alignment: m.alignment,
    ac: ac.value, acNote: ac.armor ? ac.armor.map(a => a.name.toLowerCase()).join(', ') : ac.type === 'natural' ? 'natural armor' : ac.type === 'dex' ? '' : (ac.type || ''),
    hp: m.hit_points, hd: m.hit_points_roll || m.hit_dice,
    speed: speedStr(m.speed),
    abilities: Object.fromEntries(ABS.map(a => [SHORT[a], m[a]])),
    saves, skills,
    vuln: dmgList(m.damage_vulnerabilities), res: dmgList(m.damage_resistances), imm: dmgList(m.damage_immunities),
    condImm: dmgList(m.condition_immunities),
    senses: sensesStr(m.senses), pp: m.senses.passive_perception,
    languages: m.languages, cr: m.challenge_rating, xp: m.xp,
    traits: (m.special_abilities || []).map(act),
    actions: (m.actions || []).map(act),
  };
  if (m.reactions?.length) o.reactions = m.reactions.map(act);
  if (m.legendary_actions?.length) o.legendary = m.legendary_actions.map(act);
  return o;
});
fs.writeFileSync(new URL('../public/data/monsters.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${out.length} monsters`);
