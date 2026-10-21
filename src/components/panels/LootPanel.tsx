import { useState } from 'react';
import { BOXES, TIERS, BOXMAP, RNAME, CATS, openBox, rerollAt, oddsText, MAX_LEVEL, type LootResult } from '../../loot/engine';
import { useCampaign } from '../../store';
import { useUI } from '../../ui';
import { uid } from '../../lib/id';
import { send } from '../../lib/sync';
import type { LootItem } from '../../types';

const fmt = (n: number) => n.toLocaleString('en-US');
const coinText = (c: LootResult['coins']) => {
  if (!c) return '';
  if (c.copper != null) return `${fmt(c.copper)} cp`;
  return [c.pp && `${fmt(c.pp)} pp`, c.gp && `${fmt(c.gp)} gp`, c.sp && `${fmt(c.sp)} sp`].filter(Boolean).join(', ');
};

export default function LootPanel() {
  const level = useCampaign(s => s.settings.partyLevel);
  const chars = useCampaign(s => s.characters);
  const st = useCampaign.getState();
  const [box, setBox] = useState('adventurer');
  const [tier, setTier] = useState('silver');
  const [res, setRes] = useState<LootResult | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [coins, setCoins] = useState(true);
  const [to, setTo] = useState('');
  const [, force] = useState(0);
  const setLevel = (v: number) => st.set(d => { d.settings.partyLevel = Math.max(1, Math.min(MAX_LEVEL, v)); });

  const open = () => { const r = openBox(box, tier, level); setRes(r); setPicked(new Set(r.items.map((_, i) => i))); setCoins(true); };
  const toggle = (i: number) => setPicked(p => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const chosen = (): LootItem[] => {
    if (!res) return [];
    const items: LootItem[] = res.items.filter((_, i) => picked.has(i)).map(it => ({ id: uid(), name: it.name, q: it.q, rarity: it.r, desc: it.desc, value: it.value, cat: it.cat, to: to || undefined, at: Date.now() }));
    const ct = coinText(res.coins);
    if (coins && ct) items.unshift({ id: uid(), name: ct, q: 1, rarity: 'M', desc: 'Coins', cat: 'coins', to: to || undefined, at: Date.now() });
    return items;
  };
  const sendToParty = () => {
    const items = chosen();
    if (!items.length) return;
    st.addLoot(items);
    const who = to ? chars.find(c => c.id === to)?.name : 'the party';
    useUI.getState().toast(`Sent ${items.length} item${items.length > 1 ? 's' : ''} to ${who}`);
  };
  const show = () => {
    const items = chosen();
    if (items.length) send({ type: 'popup', p: { kind: 'loot', title: `${TIERS.find(t => t.id === tier)!.name} ${BOXMAP[box].name} Box`, items, at: Date.now() } });
  };

  return (
    <div className="panel-scroll pad">
      <h3 className="h">Loot Box Forge</h3>
      <div className="chips">
        {BOXES.map(b => <button key={b.id} className={'chip' + (b.id === box ? ' on' : '')} title={b.blurb} onClick={() => setBox(b.id)}>{b.name}</button>)}
      </div>
      <p className="hint">{BOXMAP[box].blurb}</p>
      <div className="tiers">
        {TIERS.map(t => <button key={t.id} className={`tier t-${t.id}` + (t.id === tier ? ' on' : '')} onClick={() => setTier(t.id)}><b>{t.name}</b><small>{t.lv}</small></button>)}
      </div>
      <div className="row gap level-row">
        <span>Party level</span>
        <button className="btn sm" onClick={() => setLevel(level - 1)} aria-label="Lower level">−</button>
        <b className="lvl">{level}</b>
        <button className="btn sm" onClick={() => setLevel(level + 1)} aria-label="Raise level">+</button>
        <input type="range" min={1} max={MAX_LEVEL} value={level} onChange={e => setLevel(+e.target.value)} className="grow" aria-label="Party level" />
      </div>
      <p className="hint">{oddsText(tier, level)}</p>
      <button className="btn primary big" onClick={open}>Open {TIERS.find(t => t.id === tier)!.name} {BOXMAP[box].name} box</button>

      {res && (
        <div className={`loot-result t-${res.tier}`}>
          <div className="lr-head"><b>{BOXMAP[res.box].name} Box</b><span>{TIERS.find(t => t.id === res.tier)!.name} · Level {res.level}</span></div>
          {res.coins && <label className="lr-item coins"><input type="checkbox" checked={coins} onChange={e => setCoins(e.target.checked)} /> <b>{coinText(res.coins)}</b></label>}
          {res.items.map((it, i) => (
            <div key={i} className="lr-item">
              <input type="checkbox" checked={picked.has(i)} onChange={() => toggle(i)} aria-label={`Include ${it.name}`} />
              <div className="grow">
                <b>{it.name}{it.q > 1 ? ` ×${it.q}` : ''}</b>
                <div className="muted sm"><span className={`rar r-${it.r}`}>{RNAME[it.r]}</span> · {CATS[it.cat] ?? it.cat}{it.extra ? ` · ${it.extra}` : ''}{it.value ? ` · ${it.value}` : ''} · {it.src}</div>
                {it.desc && <div className="sm">{it.desc}</div>}
              </div>
              <button className="btn sm" onClick={() => { rerollAt(res, i); force(x => x + 1); }}>Reroll</button>
            </div>
          ))}
          {!res.items.length && <p className="empty">This box came up empty.</p>}
          <div className="lr-actions">
            <div className="row gap">
              <button className="btn sm" onClick={() => { setPicked(new Set(res.items.map((_, i) => i))); setCoins(true); }}>All</button>
              <button className="btn sm" onClick={() => { setPicked(new Set()); setCoins(false); }}>None</button>
              <span className="grow" />
              <select value={to} onChange={e => setTo(e.target.value)} aria-label="Send to">
                <option value="">To party</option>
                {chars.map(c => <option key={c.id} value={c.id}>To {c.name}</option>)}
              </select>
            </div>
            <div className="row gap">
              <button className="btn" onClick={show}>Show on table</button>
              <button className="btn primary grow" onClick={sendToParty}>Send selected</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
