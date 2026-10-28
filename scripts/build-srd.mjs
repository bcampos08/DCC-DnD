// Builds public/data/srd.json from the 5e-bits/5e-database SRD 5.1 files (2014 rules).
// Usage: node scripts/build-srd.mjs <path to 5e-database/src/2014/en>
// Content: System Reference Document 5.1 by Wizards of the Coast LLC, CC BY 4.0.
import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
if (!dir) { console.error('Pass the folder holding the 5e-SRD-*.json files.'); process.exit(1); }
const load = n => JSON.parse(fs.readFileSync(path.join(dir, `5e-SRD-${n}.json`), 'utf8'));

// Turns a list of paragraphs into markdown, keeping table rows together.
const md = (lines = []) => {
  const out = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    if (prev != null && l.trim().startsWith('|') && prev.trim().split('\n').pop().startsWith('|')) out[out.length - 1] = prev + '\n' + l;
    else out.push(l);
  }
  return out.join('\n\n');
};
const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

const rules = load('Rule-Sections');
const parent = {};
for (const r of load('Rules')) for (const s of r.subsections) parent[s.index] = r.name;
const out = { rules: [], conditions: [], spells: [], items: [], gear: [], props: [], damage: [], skills: [] };

for (const r of rules) out.rules.push({ n: r.name, s: parent[r.index] ?? 'Rules', d: r.desc.replace(/^#+ .*\n+/, '') });
for (const c of load('Conditions')) out.conditions.push({ n: c.name, d: md(c.desc) });
for (const s of load('Spells')) {
  const lvl = s.level === 0 ? `${s.school.name} cantrip` : `${ORD[s.level]}-level ${s.school.name.toLowerCase()}`;
  const head = [
    `*${lvl}${s.ritual ? ' (ritual)' : ''}*`,
    `**Casting Time:** ${s.casting_time}  \n**Range:** ${s.range}  \n**Components:** ${s.components.join(', ')}${s.material ? ` (${s.material.replace(/\.$/, '')})` : ''}  \n**Duration:** ${s.concentration && !/^Concentration/.test(s.duration) ? 'Concentration, ' : ''}${s.duration}  \n**Classes:** ${s.classes.map(c => c.name).join(', ')}`,
  ];
  const higher = s.higher_level?.length ? ['**At Higher Levels.** ' + s.higher_level.join('\n\n')] : [];
  out.spells.push({ n: s.name, l: s.level, sc: s.school.name, c: s.classes.map(c => c.name), conc: !!s.concentration, rit: !!s.ritual, d: md([...head, ...s.desc, ...higher]) });
}
for (const m of load('Magic-Items')) {
  const [h, ...rest] = m.desc;
  out.items.push({ n: m.name, h, r: m.rarity?.name, cat: m.equipment_category?.name, d: md(rest) });
}
for (const e of load('Equipment')) {
  const bits = [];
  if (e.cost) bits.push(`**Cost:** ${e.cost.quantity} ${e.cost.unit}`);
  if (e.weight) bits.push(`**Weight:** ${e.weight} lb.`);
  if (e.damage) bits.push(`**Damage:** ${e.damage.damage_dice} ${e.damage.damage_type?.name?.toLowerCase() ?? ''}`);
  if (e.two_handed_damage) bits.push(`**Two-handed:** ${e.two_handed_damage.damage_dice}`);
  if (e.range?.long) bits.push(`**Range:** ${e.range.normal}/${e.range.long} ft.`);
  if (e.properties?.length) bits.push(`**Properties:** ${e.properties.map(p => p.name).join(', ')}`);
  if (e.armor_class) bits.push(`**AC:** ${e.armor_class.base}${e.armor_class.dex_bonus ? (e.armor_class.max_bonus ? ` + Dex (max ${e.armor_class.max_bonus})` : ' + Dex') : ''}`);
  if (e.str_minimum) bits.push(`**Strength:** ${e.str_minimum}`);
  if (e.stealth_disadvantage) bits.push('**Stealth:** Disadvantage');
  if (e.speed) bits.push(`**Speed:** ${e.speed.quantity} ${e.speed.unit}`);
  if (e.capacity) bits.push(`**Carrying capacity:** ${e.capacity}`);
  const kind = e.weapon_category ? `${e.weapon_category} ${e.weapon_range?.toLowerCase() ?? ''} weapon` : e.armor_category ? `${e.armor_category} armor` : e.gear_category?.name ?? e.tool_category ?? e.vehicle_category ?? e.equipment_category?.name;
  const contents = e.contents?.length ? ['**Contains:** ' + e.contents.map(c => `${c.item.name}${c.quantity > 1 ? ` ×${c.quantity}` : ''}`).join(', ')] : [];
  out.gear.push({ n: e.name, h: kind, d: md([bits.join('  \n'), ...(e.desc ?? []), ...(e.special ?? []), ...contents].filter(Boolean)) });
}
for (const p of load('Weapon-Properties')) out.props.push({ n: p.name, d: md(p.desc) });
for (const p of load('Damage-Types')) out.damage.push({ n: p.name, d: md(p.desc) });
for (const p of load('Skills')) out.skills.push({ n: p.name, h: p.ability_score?.name, d: md(p.desc) });

fs.writeFileSync(new URL('../public/data/srd.json', import.meta.url), JSON.stringify(out));
console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length}`).join(', '));
