import { useState } from 'react';
import Modal from './Modal';
import type { Ability, Monster, MonsterAction } from '../types';
import { ABILITIES } from '../types';
import { parseAction, parseStatBlock } from '../lib/statblockParse';
import { useCampaign } from '../store';
import { useUI } from '../ui';
import { uid } from '../lib/id';
import { fmtMod } from '../lib/dice';

const blank: Monster = {
  id: '', name: '', size: 'Medium', type: 'humanoid', alignment: 'unaligned', ac: 12, acNote: '', hp: 10, hd: '3d8', speed: '30 ft.',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, saves: [], skills: [], vuln: '', res: '', imm: '', condImm: '',
  senses: '', pp: 10, languages: '', cr: 1, xp: 200, traits: [], actions: [],
};
const toText = (l?: MonsterAction[]) => (l ?? []).map(a => `${a.name}. ${a.desc}`).join('\n\n');
const fromText = (t: string) => t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => {
  const m = p.match(/^([^.]{1,80})\.\s*([\s\S]*)$/);
  return m ? parseAction(m[1].trim(), m[2].trim()) : parseAction('Feature', p);
});
const savesText = (m: Monster) => m.saves.map(s => `${s.ab[0].toUpperCase() + s.ab.slice(1)} ${fmtMod(s.bonus)}`).join(', ');
const skillsText = (m: Monster) => m.skills.map(s => `${s.name} ${fmtMod(s.bonus)}`).join(', ');

export default function MonsterEditor({ initial, onClose }: { initial: Partial<Monster>; onClose: () => void }) {
  const [m, setM] = useState<Monster>({ ...blank, ...initial, abilities: { ...blank.abilities, ...initial.abilities } });
  const [traits, setTraits] = useState(toText(initial.traits));
  const [actions, setActions] = useState(toText(initial.actions));
  const [reactions, setReactions] = useState(toText(initial.reactions));
  const [legendary, setLegendary] = useState(toText(initial.legendary));
  const [saves, setSaves] = useState(savesText({ ...blank, ...initial } as Monster));
  const [skills, setSkills] = useState(skillsText({ ...blank, ...initial } as Monster));
  const [paste, setPaste] = useState('');
  const up = (p: Partial<Monster>) => setM(x => ({ ...x, ...p }));

  const applyPaste = () => {
    const r = parseStatBlock(paste);
    const next = { ...m, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== '')) } as Monster;
    setM(next);
    setTraits(toText(r.traits)); setActions(toText(r.actions)); setReactions(toText(r.reactions)); setLegendary(toText(r.legendary));
    setSaves(savesText(next)); setSkills(skillsText(next));
    setPaste('');
    useUI.getState().toast('Stat block filled in. Check the fields before saving.');
  };

  const save = () => {
    if (!m.name.trim()) { alert('Give the monster a name.'); return; }
    const out: Monster = {
      ...m,
      id: m.id || 'custom-' + uid(),
      saves: [...saves.matchAll(/(Str|Dex|Con|Int|Wis|Cha)\w*\s*([+\-−]?\d+)/gi)].map(x => ({ ab: x[1].toLowerCase().slice(0, 3), bonus: parseInt(x[2].replace('−', '-'), 10) })),
      skills: [...skills.matchAll(/([A-Za-z][A-Za-z ]*?)\s*([+\-−]\d+)/g)].map(x => ({ name: x[1].trim(), bonus: parseInt(x[2].replace('−', '-'), 10) })),
      traits: fromText(traits), actions: fromText(actions),
      reactions: reactions.trim() ? fromText(reactions) : undefined,
      legendary: legendary.trim() ? fromText(legendary) : undefined,
      custom: true,
    };
    useCampaign.getState().saveMonster(out);
    useUI.getState().set({ monsterId: out.id });
    onClose();
  };

  const F = ({ label, k, type = 'text', w }: { label: string; k: keyof Monster; type?: string; w?: number }) => (
    <label className="field" style={w ? { maxWidth: w } : undefined}>{label}
      <input type={type} value={String(m[k] ?? '')} onChange={e => up({ [k]: type === 'number' ? +e.target.value : e.target.value } as Partial<Monster>)} />
    </label>
  );

  return (
    <Modal title={m.id ? `Edit ${m.name}` : 'New custom monster'} onClose={onClose} wide>
      <details className="paste-box" open={!initial.name}>
        <summary>Paste a stat block to fill this in</summary>
        <textarea rows={6} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Copy a full stat block (name through actions) and paste it here." />
        <button className="btn" disabled={!paste.trim()} onClick={applyPaste}>Fill in fields</button>
      </details>
      <div className="form-grid">
        {F({ label: 'Name', k: 'name' })}
        <label className="field">Size
          <select value={m.size} onChange={e => up({ size: e.target.value })}>{['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].map(s => <option key={s}>{s}</option>)}</select>
        </label>
        {F({ label: 'Type', k: 'type' })}
        {F({ label: 'Alignment', k: 'alignment' })}
        {F({ label: 'AC', k: 'ac', type: 'number' })}
        {F({ label: 'AC note', k: 'acNote' })}
        {F({ label: 'Hit points', k: 'hp', type: 'number' })}
        {F({ label: 'Hit dice', k: 'hd' })}
        {F({ label: 'Speed', k: 'speed' })}
        {F({ label: 'CR', k: 'cr', type: 'number' })}
        {F({ label: 'XP', k: 'xp', type: 'number' })}
        {F({ label: 'Passive Perception', k: 'pp', type: 'number' })}
      </div>
      <div className="ab-grid">
        {ABILITIES.map(a => (
          <label key={a} className="field">{a.toUpperCase()}
            <input type="number" value={m.abilities[a]} onChange={e => up({ abilities: { ...m.abilities, [a as Ability]: +e.target.value } })} />
          </label>
        ))}
      </div>
      <div className="form-grid">
        <label className="field">Saving throws<input value={saves} onChange={e => setSaves(e.target.value)} placeholder="Dex +5, Wis +3" /></label>
        <label className="field">Skills<input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Perception +4, Stealth +6" /></label>
        {F({ label: 'Senses', k: 'senses' })}
        {F({ label: 'Languages', k: 'languages' })}
        {F({ label: 'Vulnerabilities', k: 'vuln' })}
        {F({ label: 'Resistances', k: 'res' })}
        {F({ label: 'Immunities', k: 'imm' })}
        {F({ label: 'Condition immunities', k: 'condImm' })}
      </div>
      <p className="hint">One feature per paragraph, written as <i>Name. Description</i>. Attack bonuses ("+5 to hit") and damage like "(2d6 + 3) slashing damage" become roll buttons.</p>
      <label className="field">Traits<textarea rows={4} value={traits} onChange={e => setTraits(e.target.value)} /></label>
      <label className="field">Actions<textarea rows={6} value={actions} onChange={e => setActions(e.target.value)} /></label>
      <label className="field">Reactions<textarea rows={2} value={reactions} onChange={e => setReactions(e.target.value)} /></label>
      <label className="field">Legendary actions<textarea rows={3} value={legendary} onChange={e => setLegendary(e.target.value)} /></label>
      <div className="row gap end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save monster</button></div>
    </Modal>
  );
}
