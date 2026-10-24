import { useState } from 'react';
import Modal from './Modal';
import { useCampaign } from '../store';
import { uid } from '../lib/id';
import { PC_COLORS } from '../lib/rules';
import { fmtMod, modOf } from '../lib/dice';
import { ABILITIES, type Ability, type Character } from '../types';
import { SKILLS } from '../lib/ddb';

const AB_NAME: Record<Ability, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
// Level 0 characters use the level 1 proficiency bonus.
const profBonus = (level: number) => Math.ceil(Math.max(1, level) / 4) + 1;
type Attack = NonNullable<Character['attacks']>[number];

// Create or edit a character by hand. Saves and skills are worked out from ability scores,
// level and the proficiencies ticked here.
export default function CharEditor({ initial, onClose }: { initial?: Character; onClose: () => void }) {
  const [c, setC] = useState<Character>(() => initial
    ? { ...initial, abilities: initial.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, level: initial.level ?? 1, saveProf: initial.saveProf ?? [], skillProf: initial.skillProf ?? {}, attacks: initial.attacks ?? [] }
    : { id: uid(), name: '', summary: '', ac: 10, maxHp: 10, hp: 10, tempHp: 0, initBonus: 0, passivePerception: 10, speed: '30 ft.', conditions: [], level: 1,
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, saveProf: [], skillProf: {}, attacks: [],
      color: PC_COLORS[useCampaign.getState().characters.length % PC_COLORS.length] });
  const [autoInit, setAutoInit] = useState(!initial || initial.initBonus === modOf(initial.abilities?.dex ?? 10));
  const up = (p: Partial<Character>) => setC(x => ({ ...x, ...p }));
  const ab = c.abilities!;
  const pb = profBonus(c.level ?? 1);
  const saveOf = (a: Ability) => modOf(ab[a]) + ((c.saveProf ?? []).includes(a) ? pb : 0);
  const skillOf = (name: string, a: Ability) => modOf(ab[a]) + Math.floor(pb * ((c.skillProf ?? {})[name] ?? 0));

  const save = () => {
    if (!c.name.trim()) { alert('Give the character a name.'); return; }
    const out: Character = {
      ...c,
      initBonus: autoInit ? modOf(ab.dex) : c.initBonus,
      saves: Object.fromEntries(ABILITIES.map(a => [a, saveOf(a)])),
      skills: SKILLS.map(([name, a]) => ({ name, bonus: skillOf(name, a) })),
      passivePerception: 10 + skillOf('Perception', 'wis'),
      attacks: (c.attacks ?? []).filter(a => a.name.trim()),
    };
    useCampaign.getState().set(d => {
      const i = d.characters.findIndex(x => x.id === out.id);
      if (i >= 0) d.characters[i] = out; else d.characters.push(out);
    });
    onClose();
  };
  const setAttack = (i: number, p: Partial<Attack>) => up({ attacks: (c.attacks ?? []).map((a, j) => (j === i ? { ...a, ...p } : a)) });

  return (
    <Modal title={initial ? `Edit ${initial.name}` : 'Add character'} onClose={onClose} wide>
      {c.ddbId && <p className="callout">Imported from D&D Beyond. Pressing Sync will replace these numbers with D&D Beyond's.</p>}
      <div className="form-grid">
        <label className="field">Name<input value={c.name} onChange={e => up({ name: e.target.value })} autoFocus={!initial} /></label>
        <label className="field">Player<input value={c.player ?? ''} onChange={e => up({ player: e.target.value })} /></label>
        <label className="field span2">Description<input value={c.summary ?? ''} onChange={e => up({ summary: e.target.value })} placeholder="Level 3 Human Fighter" /></label>
        <label className="field">Level<input type="number" min={0} max={20} value={c.level ?? 1} onChange={e => up({ level: Math.max(0, Math.min(20, +e.target.value)) })} /></label>
        <label className="field">AC<input type="number" value={c.ac} onChange={e => up({ ac: +e.target.value })} /></label>
        <label className="field">Max HP<input type="number" value={c.maxHp} onChange={e => up({ maxHp: +e.target.value, hp: initial ? c.hp : +e.target.value })} /></label>
        <label className="field">Current HP<input type="number" value={c.hp} onChange={e => up({ hp: +e.target.value })} /></label>
        <label className="field">Speed<input value={c.speed ?? ''} onChange={e => up({ speed: e.target.value })} placeholder="30 ft." /></label>
        <label className="field">Darkvision (ft)<input type="number" min={0} step={30} value={c.darkvision ?? 0} onChange={e => up({ darkvision: +e.target.value || undefined })} /></label>
        <label className="field">Initiative
          <span className="row gap">
            <input type="number" value={autoInit ? modOf(ab.dex) : c.initBonus} disabled={autoInit} onChange={e => up({ initBonus: +e.target.value })} style={{ width: 70 }} />
            <label className="check"><input type="checkbox" checked={autoInit} onChange={e => setAutoInit(e.target.checked)} />= Dex</label>
          </span>
        </label>
        <label className="field">Portrait URL<input value={c.portrait ?? ''} onChange={e => up({ portrait: e.target.value || undefined })} /></label>
      </div>
      <div className="swatches">{PC_COLORS.map(col => <button key={col} className={'sw' + (c.color === col ? ' on' : '')} style={{ background: col }} onClick={() => up({ color: col })} aria-label={`Colour ${col}`} />)}</div>

      <h4 className="sb-h">Ability scores <small className="muted">(proficiency bonus {fmtMod(pb)})</small></h4>
      <div className="ab-grid">
        {ABILITIES.map(a => (
          <label key={a} className="field ab-field">{a.toUpperCase()}
            <input type="number" min={1} max={30} value={ab[a]} onChange={e => up({ abilities: { ...ab, [a]: +e.target.value } })} />
            <small>{fmtMod(modOf(ab[a]))}</small>
          </label>
        ))}
      </div>

      <div className="two-col">
        <div>
          <h4 className="sb-h">Saving throws</h4>
          {ABILITIES.map(a => (
            <label key={a} className="prof-row">
              <input type="checkbox" checked={(c.saveProf ?? []).includes(a)} onChange={e => up({ saveProf: e.target.checked ? [...(c.saveProf ?? []), a] : (c.saveProf ?? []).filter(x => x !== a) })} />
              <span className="grow">{AB_NAME[a]}</span><b>{fmtMod(saveOf(a))}</b>
            </label>
          ))}
        </div>
        <div>
          <h4 className="sb-h">Skills</h4>
          {SKILLS.map(([name, a]) => (
            <div key={name} className="prof-row">
              <select value={(c.skillProf ?? {})[name] ?? 0} onChange={e => up({ skillProf: { ...(c.skillProf ?? {}), [name]: +e.target.value } })} aria-label={`${name} proficiency`}>
                <option value={0}>—</option><option value={1}>Prof</option><option value={2}>Expert</option><option value={0.5}>Half</option>
              </select>
              <span className="grow">{name} <small className="muted">{a.toUpperCase()}</small></span><b>{fmtMod(skillOf(name, a))}</b>
            </div>
          ))}
        </div>
      </div>

      <h4 className="sb-h">Attacks</h4>
      {(c.attacks ?? []).map((a, i) => (
        <div key={i} className="row gap wrap attack-row">
          <input className="grow" value={a.name} onChange={e => setAttack(i, { name: e.target.value })} placeholder="Longsword" aria-label="Attack name" />
          <input type="number" value={a.toHit ?? ''} onChange={e => setAttack(i, { toHit: e.target.value === '' ? undefined : +e.target.value })} placeholder="To hit" aria-label="To hit" style={{ width: 70 }} />
          <input value={a.damage ?? ''} onChange={e => setAttack(i, { damage: e.target.value })} placeholder="1d8+3" aria-label="Damage" style={{ width: 90 }} />
          <input className="grow" value={a.notes ?? ''} onChange={e => setAttack(i, { notes: e.target.value })} placeholder="Slashing, versatile" aria-label="Notes" />
          <button className="icon-btn" onClick={() => up({ attacks: (c.attacks ?? []).filter((_, j) => j !== i) })} aria-label="Remove attack">✕</button>
        </div>
      ))}
      <button className="btn sm" onClick={() => up({ attacks: [...(c.attacks ?? []), { name: '', toHit: pb + modOf(ab.str), damage: '' }] })}>+ Add attack</button>

      <label className="field">Notes (features, spells, anything else)<textarea rows={4} value={c.notes ?? ''} onChange={e => up({ notes: e.target.value })} /></label>
      <div className="row gap end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></div>
    </Modal>
  );
}
