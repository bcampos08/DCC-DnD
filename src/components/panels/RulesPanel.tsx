import { useDeferredValue, useMemo, useState } from 'react';
import { useSrdText, type Srd, type SrdEntry } from '../../lib/srd';
import { SrdBody } from '../SrdText';
import Modal from '../Modal';

type Cat = 'all' | 'rules' | 'conditions' | 'spells' | 'items' | 'gear' | 'other';
const CATS: { id: Cat; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'conditions', label: 'Conditions' }, { id: 'rules', label: 'Rules' }, { id: 'spells', label: 'Spells' },
  { id: 'items', label: 'Magic items' }, { id: 'gear', label: 'Equipment' }, { id: 'other', label: 'Skills & more' },
];
const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];

interface Row { key: string; cat: Exclude<Cat, 'all'>; title: string; sub: string; e: SrdEntry; hay: string }

function rowsOf(d: Srd): Row[] {
  const rows: Row[] = [];
  const add = (cat: Row['cat'], e: SrdEntry, sub: string) => rows.push({ key: cat + ':' + e.n + ':' + rows.length, cat, title: e.n, sub, e, hay: (e.n + ' ' + (e.h ?? '') + ' ' + e.d).toLowerCase() });
  d.conditions.forEach(e => add('conditions', e, 'Condition'));
  d.rules.forEach(e => add('rules', e, `Rules · ${e.s}`));
  d.spells.forEach(e => add('spells', e, `${e.l === 0 ? 'Cantrip' : ORD[e.l!] + ' level'} ${e.sc?.toLowerCase()}${e.conc ? ' · concentration' : ''}${e.rit ? ' · ritual' : ''}`));
  d.items.forEach(e => add('items', e, e.h ?? 'Magic item'));
  d.gear.forEach(e => add('gear', e, e.h ?? 'Equipment'));
  d.skills.forEach(e => add('other', e, `Skill · ${e.h}`));
  d.props.forEach(e => add('other', e, 'Weapon property'));
  d.damage.forEach(e => add('other', e, 'Damage type'));
  return rows;
}

// Searchable SRD 5.1 quick reference: rules, conditions, spells, magic items and equipment.
export default function RulesPanel() {
  const srd = useSrdText();
  const rows = useMemo(() => (srd ? rowsOf(srd) : []), [srd]);
  const [q, setQ] = useState('');
  const query = useDeferredValue(q.trim().toLowerCase());
  const [cat, setCat] = useState<Cat>('all');
  const [lvl, setLvl] = useState('');
  const [cls, setCls] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [big, setBig] = useState<Row | null>(null);

  const results = useMemo(() => {
    let list = rows.filter(r => cat === 'all' || r.cat === cat);
    if (cat === 'spells') list = list.filter(r => (lvl === '' || r.e.l === +lvl) && (!cls || r.e.c?.includes(cls)));
    if (!query) return cat === 'all' ? list.filter(r => r.cat === 'conditions' || r.cat === 'rules') : list;
    const words = query.split(/\s+/);
    const scored: [number, Row][] = [];
    for (const r of list) {
      const t = r.title.toLowerCase();
      if (!words.every(w => r.hay.includes(w))) continue;
      const score = t === query ? 0 : t.startsWith(query) ? 1 : words.every(w => t.includes(w)) ? 2 : 3;
      scored.push([score, r]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title)).map(x => x[1]);
  }, [rows, cat, lvl, cls, query]);
  const shown = results.slice(0, 150);
  const firstBody = query ? shown.findIndex(r => !r.title.toLowerCase().includes(query.split(/\s+/)[0])) : -1;

  return (
    <div className="panel-scroll pad rules-panel">
      <h3 className="h">Quick reference</h3>
      <input className="search" type="search" value={q} onChange={e => { setQ(e.target.value); setOpen(null); }} placeholder="Search rules, conditions, spells, items…" aria-label="Search the rules" autoFocus />
      <div className="chips">
        {CATS.map(c => <button key={c.id} className={'chip' + (c.id === cat ? ' on' : '')} onClick={() => { setCat(c.id); setOpen(null); }}>{c.label}</button>)}
      </div>
      {cat === 'spells' && (
        <div className="row gap">
          <select value={lvl} onChange={e => setLvl(e.target.value)} aria-label="Spell level"><option value="">Any level</option>{ORD.map((o, i) => <option key={i} value={i}>{i === 0 ? 'Cantrip' : o + ' level'}</option>)}</select>
          <select value={cls} onChange={e => setCls(e.target.value)} aria-label="Class"><option value="">Any class</option>{CLASSES.map(c => <option key={c}>{c}</option>)}</select>
        </div>
      )}
      {!srd && <p className="hint">Loading the rules…</p>}
      {srd && (
        <p className="muted sm">
          {query ? `${results.length} result${results.length === 1 ? '' : 's'}${results.length > shown.length ? ` (showing ${shown.length})` : ''}` : cat === 'all' ? 'Conditions and core rules. Search to look through spells, items and equipment too.' : `${results.length} entries`}
        </p>
      )}
      <ul className="ref-list">
        {shown.map((r, i) => [
          i === firstBody && i > 0 && <li key="divider" className="ref-divider">Mentioned in</li>,
          <li key={r.key} className={open === r.key ? 'on' : ''}>
            <button className="ref-head" onClick={() => setOpen(open === r.key ? null : r.key)} aria-expanded={open === r.key}>
              <b>{r.title}</b><small>{r.sub}</small>
            </button>
            {open === r.key && (
              <div className="ref-body">
                <SrdBody text={r.e.d} highlight={query} />
                <button className="link-btn" onClick={() => setBig(r)}>⤢ Read larger</button>
              </div>
            )}
          </li>,
        ])}
      </ul>
      {srd && query && !results.length && <p className="hint">Nothing matches “{q.trim()}”{cat !== 'all' ? ' in this category' : ''}.</p>}
      {big && <Modal title={big.title} onClose={() => setBig(null)} wide><div className="srd-modal">{big.cat !== 'spells' && <p className="srd-sub">{big.sub}</p>}<SrdBody text={big.e.d} highlight={query} /></div></Modal>}
      <p className="srd-credit">Rules text: System Reference Document 5.1 by Wizards of the Coast LLC, licensed under <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p>
    </div>
  );
}
