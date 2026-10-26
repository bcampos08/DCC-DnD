import { useMemo, useState } from 'react';
import { useMonsters } from '../../lib/monsters';
import { useUI } from '../../ui';
import { useCampaign } from '../../store';
import { crText } from '../../lib/rules';
import { addMonsters } from '../../lib/actions';
import StatBlock from '../StatBlock';
import MonsterNotes from '../MonsterNotes';
import MonsterEditor from '../MonsterEditor';
import type { Monster } from '../../types';

const CRS = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)];

export default function MonstersPanel() {
  const all = useMonsters();
  const { monsterId, set } = useUI();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [crMin, setCrMin] = useState(0);
  const [crMax, setCrMax] = useState(30);
  const [count, setCount] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [rollHp, setRollHp] = useState(false);
  const [editing, setEditing] = useState<Partial<Monster> | null>(null);
  const removeCustom = (id: string) => useCampaign.getState().set(d => { d.customMonsters = d.customMonsters.filter(m => m.id !== id); });

  const types = useMemo(() => [...new Set(all.map(m => m.type.split(' ')[0]))].sort(), [all]);
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all.filter(m => (!qq || m.name.toLowerCase().includes(qq)) && (!type || m.type.startsWith(type)) && m.cr >= crMin && m.cr <= crMax)
      .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || a.name.localeCompare(b.name));
  }, [all, q, type, crMin, crMax]);
  const m = monsterId ? all.find(x => x.id === monsterId) : undefined;
  // When one copy of this monster is selected on the map, rolls are logged under its name (e.g. "Goblin 2").
  const selected = useUI(s => s.selected);
  const sceneTokens = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId)?.tokens);
  const selTok = selected.length === 1 ? sceneTokens?.find(t => t.id === selected[0]) : undefined;
  const who = m && selTok?.monsterId === m.id ? selTok.name : m?.name;

  if (m) {
    return (
      <div className="panel-scroll">
        <div className="row gap wrap sticky-bar">
          <button className="btn" onClick={() => set({ monsterId: null })}>← All monsters</button>
          <span className="grow" />
          <button className="btn sm" onClick={() => setEditing({ ...m, id: m.custom ? m.id : undefined, name: m.custom ? m.name : `${m.name} (custom)` })}>{m.custom ? 'Edit' : 'Copy & edit'}</button>
          {m.custom && <button className="btn sm danger" onClick={() => { if (confirm(`Delete ${m.name}?`)) { removeCustom(m.id); set({ monsterId: null }); } }}>Delete</button>}
        </div>
        <div className="add-box">
          <label className="row gap">Add
            <input type="number" min={1} max={30} value={count} onChange={e => setCount(Math.max(1, Math.min(30, +e.target.value || 1)))} style={{ width: 56 }} />
          </label>
          <label className="check"><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> Hidden</label>
          <label className="check"><input type="checkbox" checked={rollHp} onChange={e => setRollHp(e.target.checked)} /> Roll HP</label>
          <button className="btn primary" onClick={() => { addMonsters(m, count, { hidden, rollHp }); useUI.getState().toast(`Added ${count} ${m.name}${count > 1 ? 's' : ''} to the map`); }}>Add to map</button>
        </div>
        <div className="pad-x"><MonsterNotes monsterId={m.id} /></div>
        {who !== m.name && <p className="hint pad-x rolling-as">Rolls are logged as <b>{who}</b>.</p>}
        <StatBlock m={m} who={who} attackerId={selTok?.monsterId === m.id ? selTok.id : undefined} />
        {editing && <MonsterEditor initial={editing} onClose={() => setEditing(null)} />}
      </div>
    );
  }

  return (
    <div className="panel-col">
      <div className="filters">
        <input className="search" placeholder={`Search ${all.length} monsters`} value={q} onChange={e => setQ(e.target.value)} autoFocus />
        <div className="row gap">
          <select value={type} onChange={e => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="row gap sm-label">CR
            <select value={crMin} onChange={e => setCrMin(+e.target.value)} aria-label="Minimum CR">{CRS.map(c => <option key={c} value={c}>{crText(c)}</option>)}</select>
            –
            <select value={crMax} onChange={e => setCrMax(+e.target.value)} aria-label="Maximum CR">{CRS.map(c => <option key={c} value={c}>{crText(c)}</option>)}</select>
          </label>
        </div>
        <button className="btn sm" onClick={() => setEditing({})}>+ New custom monster</button>
      </div>
      <ul className="list panel-scroll">
        {list.slice(0, 300).map(x => (
          <li key={x.id}>
            <button className="list-row" onClick={() => set({ monsterId: x.id })}>
              <span className="grow"><b>{x.name}</b>{x.custom && <span className="tag">Custom</span>}<small>{x.size} {x.type}</small></span>
              <span className="cr">CR {crText(x.cr)}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="empty">No monsters match.</li>}
        <li className="srd-credit">Monster data: System Reference Document 5.1 by Wizards of the Coast LLC, licensed under <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">CC BY 4.0</a>.</li>
      </ul>
      {editing && <MonsterEditor initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
