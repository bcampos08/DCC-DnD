import { useState } from 'react';
import { useCampaign } from '../../store';
import { useUI } from '../../ui';
import { ddbIdFrom, fetchDdb, parseDdb } from '../../lib/ddb';
import { uid } from '../../lib/id';
import { PC_COLORS } from '../../lib/rules';
import { addCharacterToken } from '../../lib/actions';
import { roll } from '../../lib/roll';
import { d20Expr, fmtMod, modOf } from '../../lib/dice';
import HpControl, { HpBar } from '../HpControl';
import Conditions, { CondChips } from '../Conditions';
import Modal from '../Modal';
import CharacterSheet from '../CharacterSheet';
import { send } from '../../lib/sync';
import type { Character, LootItem } from '../../types';
import { ABILITIES } from '../../types';
import { RNAME } from '../../loot/engine';

export default function PartyPanel() {
  const chars = useCampaign(s => s.characters);
  const loot = useCampaign(s => s.partyLoot);
  const [adding, setAdding] = useState<null | 'ddb' | 'manual'>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Character | null>(null);
  const [q, setQ] = useState('');
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const st = useCampaign.getState();
  const ownerOf = (to?: string) => (to && chars.some(c => c.id === to) ? to : '');
  const stash = loot.filter(it => !ownerOf(it.to));

  const sync = async (c: Character) => {
    try {
      const d = await fetchDdb(c.ddbId!);
      const p = parseDdb(d, c);
      // Keep the HP tracked at the table; a character at full HP stays at full after a level-up.
      st.updateChar(c.id, { ...p, hp: c.hp >= c.maxHp ? p.maxHp : Math.min(c.hp, p.maxHp), tempHp: c.tempHp });
      useUI.getState().toast(`${c.name} synced from D&D Beyond`);
    } catch (e) { useUI.getState().toast(`Sync failed: ${(e as Error).message}`); }
  };
  const syncAll = () => chars.filter(c => c.ddbId).forEach(sync);

  return (
    <div className="panel-scroll pad">
      <div className="row gap wrap">
        <h3 className="h grow">Party</h3>
        {chars.some(c => c.ddbId) && <button className="btn sm" onClick={syncAll}>⟳ Sync all</button>}
        <button className="btn sm primary" onClick={() => setAdding('ddb')}>+ D&D Beyond</button>
        <button className="btn sm" onClick={() => setAdding('manual')}>+ Manual</button>
      </div>
      <input className="search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search inventories (e.g. rope, potion)" aria-label="Search inventories" />
      {q.trim() && <SearchResults q={q} />}
      {!chars.length && <p className="hint">Add your players' characters. Import from D&D Beyond (character set to Public) or type in the basics yourself.</p>}
      <ul className="char-list">
        {chars.map(c => (
          <li key={c.id} className="char-card" style={{ ['--pc' as string]: c.color }}>
            <div className="row gap">
              {c.portrait ? <img className="portrait" src={c.portrait} alt="" /> : <span className="portrait ph">{c.name[0]}</span>}
              <div className="grow">
                <button className="char-name" onClick={() => setOpen(open === c.id ? null : c.id)}>{c.name}</button>
                <small className="muted">{c.summary}</small>
              </div>
              <span className="ac-badge">AC {c.ac}</span>
            </div>
            <div className="row gap">
              <HpBar hp={c.hp} max={c.maxHp} temp={c.tempHp} />
              <span className="muted sm">PP {c.passivePerception ?? '–'} · Init {fmtMod(c.initBonus)}</span>
            </div>
            <CondChips ids={c.conditions} />
            <Inventory c={c} items={loot.filter(it => it.to === c.id)} />
            {open === c.id && (
              <div className="char-detail">
                <HpControl targets={[{ charId: c.id }]} />
                <label className="check"><input type="checkbox" checked={!!c.concentrating} onChange={e => st.updateChar(c.id, { concentrating: e.target.checked })} /> Concentrating</label>
                <Conditions value={c.conditions} onToggle={id => st.updateChar(c.id, { conditions: c.conditions.includes(id) ? c.conditions.filter(x => x !== id) : [...c.conditions, id] })} />
                {c.abilities && (
                  <>
                    <div className="sb-abilities">
                      {ABILITIES.map(a => (
                        <button key={a} onClick={() => roll(d20Expr(modOf(c.abilities![a])), `${a.toUpperCase()} check`, c.name)}>
                          <span>{a.toUpperCase()}</span><b>{c.abilities![a]}</b><small>{fmtMod(modOf(c.abilities![a]))}</small>
                        </button>
                      ))}
                    </div>
                    <div className="sb-line"><b>Saves</b> {ABILITIES.map(a => <button key={a} className="roll-chip sm" onClick={() => roll(d20Expr(c.saves?.[a] ?? 0), `${a.toUpperCase()} save`, c.name)}>{a.toUpperCase()} {fmtMod(c.saves?.[a] ?? 0)}</button>)}</div>
                    <div className="sb-line"><b>Skills</b> {(c.skills ?? []).map(s => <button key={s.name} className="roll-chip sm" onClick={() => roll(d20Expr(s.bonus), s.name, c.name)}>{s.name} {fmtMod(s.bonus)}</button>)}</div>
                  </>
                )}
                {!!c.attacks?.length && <div className="sb-line"><b>Attacks</b> {c.attacks.map(a => <span key={a.name} className="atk">{a.name} {a.toHit != null && <button className="roll-chip sm" onClick={() => roll(d20Expr(a.toHit!), `${a.name} attack`, c.name)}>{fmtMod(a.toHit)}</button>} {a.damage && <button className="roll-chip sm" onClick={() => roll(a.damage!, `${a.name} damage`, c.name)}>{a.damage}</button>} <small className="muted">{a.notes}</small></span>)}</div>}
                <div className="row gap wrap">
                  <button className="btn sm" onClick={() => addCharacterToken(c)}>Place token</button>
                  <button className="btn sm" onClick={() => setSheetFor(c.id)}>📜 Full sheet</button>
                  {c.ddbId && <button className="btn sm" onClick={() => sync(c)}>⟳ Sync</button>}
                  {c.ddbId && <a className="btn sm" href={`https://www.dndbeyond.com/characters/${c.ddbId}`} target="_blank" rel="noreferrer">Open sheet ↗</a>}
                  <button className="btn sm" onClick={() => setEditing(c)}>Edit</button>
                  <button className="btn sm danger" onClick={() => { if (confirm(`Remove ${c.name} from the party?`)) st.set(d => { d.characters = d.characters.filter(x => x.id !== c.id); d.scenes.forEach(s => { s.tokens = s.tokens.filter(t => t.charId !== c.id); }); }); }}>Remove</button>
                </div>
                {c.syncedAt && <small className="muted">Last synced {new Date(c.syncedAt).toLocaleString()}</small>}
              </div>
            )}
            {open !== c.id && <div className="row gap"><button className="btn sm" onClick={() => addCharacterToken(c)}>Place token</button><button className="btn sm" onClick={() => setSheetFor(c.id)}>📜 Full sheet</button><button className="btn sm ghost" onClick={() => setOpen(c.id)}>Details</button></div>}
          </li>
        ))}
      </ul>

      <details className="inv stash" open>
        <summary><b>Party stash</b> <span className="muted">({stash.length})</span></summary>
        {!stash.length && <p className="hint">Loot sent to “the party” lands here. Use the dropdown on an item to give it to someone.</p>}
        <ul className="loot-list">{stash.map(it => <LootRow key={it.id} it={it} />)}</ul>
        <AddItem to="" />
        {!!stash.length && <button className="btn sm" onClick={() => send({ type: 'popup', p: { kind: 'loot', title: 'Party stash', items: stash.slice(0, 20), at: Date.now() } })}>Show stash on table</button>}
      </details>

      {sheetFor && <CharacterSheet charId={sheetFor} onClose={() => setSheetFor(null)} />}
      {adding === 'ddb' && <DdbImport onClose={() => setAdding(null)} />}
      {adding === 'manual' && <CharForm onClose={() => setAdding(null)} />}
      {editing && <CharForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DdbImport({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const id = ddbIdFrom(url);
  const add = (data: unknown) => {
    const st = useCampaign.getState();
    const parsed = parseDdb(data);
    const existing = st.characters.find(c => c.ddbId && c.ddbId === parsed.ddbId);
    if (existing) st.updateChar(existing.id, parsed);
    else st.set(d => { d.characters.push({ ...parsed, id: uid(), color: PC_COLORS[d.characters.length % PC_COLORS.length] }); });
    useUI.getState().toast(`${parsed.name} ${existing ? 'updated' : 'added to the party'}`);
    onClose();
  };
  const go = async () => {
    if (!id) return;
    setBusy(true); setErr('');
    try { add(await fetchDdb(id)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Import from D&D Beyond" onClose={onClose}>
      <ol className="steps">
        <li>In D&D Beyond, open the character, go to <b>Manage → Character Settings</b>, and set <b>Character Privacy</b> to <b>Public</b>.</li>
        <li>Paste the character link below.</li>
      </ol>
      <input className="search" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.dndbeyond.com/characters/12345678" autoFocus />
      <div className="row gap end"><button className="btn primary" disabled={!id || busy} onClick={go}>{busy ? 'Importing…' : 'Import'}</button></div>
      {err && (
        <div className="callout">
          <p><b>{err}</b></p>
          <p>Backup option: open <a href={id ? `https://character-service.dndbeyond.com/character/v5/character/${id}` : '#'} target="_blank" rel="noreferrer">this data link</a> in a new tab, select all the text, copy it and paste it here.</p>
          <textarea rows={4} value={json} onChange={e => setJson(e.target.value)} placeholder='{"id":…,"success":true,"data":{…}}' />
          <button className="btn" disabled={!json.trim()} onClick={() => { try { const j = JSON.parse(json); add(j.data ?? j); } catch { setErr('That text is not valid character data.'); } }}>Import pasted data</button>
        </div>
      )}
      <p className="hint">The import is read-only: nothing is changed on D&D Beyond. HP you track here stays here. Press Sync after someone levels up.</p>
    </Modal>
  );
}

function CharForm({ initial, onClose }: { initial?: Character; onClose: () => void }) {
  const [c, setC] = useState<Character>(initial ?? { id: uid(), name: '', summary: '', ac: 10, maxHp: 10, hp: 10, tempHp: 0, initBonus: 0, passivePerception: 10, conditions: [], color: PC_COLORS[useCampaign.getState().characters.length % PC_COLORS.length] });
  const up = (p: Partial<Character>) => setC(x => ({ ...x, ...p }));
  const save = () => {
    if (!c.name.trim()) return;
    useCampaign.getState().set(d => {
      const i = d.characters.findIndex(x => x.id === c.id);
      if (i >= 0) d.characters[i] = c; else d.characters.push(c);
    });
    onClose();
  };
  return (
    <Modal title={initial ? `Edit ${initial.name}` : 'Add character'} onClose={onClose}>
      <div className="form-grid">
        <label className="field">Name<input value={c.name} onChange={e => up({ name: e.target.value })} autoFocus /></label>
        <label className="field">Player<input value={c.player ?? ''} onChange={e => up({ player: e.target.value })} /></label>
        <label className="field span2">Description<input value={c.summary ?? ''} onChange={e => up({ summary: e.target.value })} placeholder="Level 3 Human Fighter" /></label>
        <label className="field">AC<input type="number" value={c.ac} onChange={e => up({ ac: +e.target.value })} /></label>
        <label className="field">Max HP<input type="number" value={c.maxHp} onChange={e => up({ maxHp: +e.target.value, hp: initial ? c.hp : +e.target.value })} /></label>
        <label className="field">Current HP<input type="number" value={c.hp} onChange={e => up({ hp: +e.target.value })} /></label>
        <label className="field">Initiative bonus<input type="number" value={c.initBonus} onChange={e => up({ initBonus: +e.target.value })} /></label>
        <label className="field">Passive Perception<input type="number" value={c.passivePerception ?? 10} onChange={e => up({ passivePerception: +e.target.value })} /></label>
        <label className="field">Portrait URL<input value={c.portrait ?? ''} onChange={e => up({ portrait: e.target.value || undefined })} /></label>
      </div>
      <div className="swatches">{PC_COLORS.map(col => <button key={col} className={'sw' + (c.color === col ? ' on' : '')} style={{ background: col }} onClick={() => up({ color: col })} aria-label={`Colour ${col}`} />)}</div>
      {c.ddbId && <p className="hint">Imported from D&D Beyond. Syncing will overwrite these numbers.</p>}
      <div className="row gap end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></div>
    </Modal>
  );
}

// One loot item with "given to" and remove controls.
function LootRow({ it }: { it: LootItem }) {
  const chars = useCampaign(s => s.characters);
  const st = useCampaign.getState();
  const owner = it.to && chars.some(c => c.id === it.to) ? it.to : '';
  return (
    <li>
      <div className="grow">
        <b>{it.name}{it.q > 1 ? ` ×${it.q}` : ''}</b> <span className={`rar r-${it.rarity}`}>{it.cat === 'coins' ? '' : RNAME[it.rarity as keyof typeof RNAME] ?? ''}</span>
        {it.desc && it.cat !== 'coins' && <small className="muted block">{it.desc}</small>}
      </div>
      <select value={owner} onChange={e => st.set(d => { const x = d.partyLoot.find(x => x.id === it.id); if (x) x.to = e.target.value || undefined; })} aria-label="Given to">
        <option value="">Party</option>
        {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="icon-btn" onClick={() => st.set(d => { d.partyLoot = d.partyLoot.filter(x => x.id !== it.id); })} aria-label={`Remove ${it.name}`}>✕</button>
    </li>
  );
}

function AddItem({ to }: { to: string }) {
  const [name, setName] = useState('');
  return (
    <form className="row gap" onSubmit={e => {
      e.preventDefault();
      const n = name.trim();
      if (!n) return;
      useCampaign.getState().addLoot([{ id: uid(), name: n, q: 1, rarity: 'M', desc: '', cat: 'gear', to: to || undefined, at: Date.now() }]);
      setName('');
    }}>
      <input className="grow" value={name} onChange={e => setName(e.target.value)} placeholder="Add an item by hand" aria-label="New item name" />
      <button className="btn sm">Add</button>
    </form>
  );
}

// A character's inventory: loot given at the table plus their D&D Beyond inventory (read-only).
function Inventory({ c, items }: { c: Character; items: LootItem[] }) {
  const ddb = c.ddbInventory ?? [];
  return (
    <details className="inv">
      <summary>Inventory <span className="muted">({items.length + ddb.length})</span></summary>
      {items.length > 0 && <ul className="loot-list">{items.map(it => <LootRow key={it.id} it={it} />)}</ul>}
      {!items.length && <p className="hint">No loot given at the table yet.</p>}
      <AddItem to={c.id} />
      {ddb.length > 0 && (
        <>
          <div className="inv-sub">On D&D Beyond <small className="muted">(read-only, updates on Sync)</small></div>
          <ul className="ddb-inv">{ddb.map((it, i) => <li key={i}>{it.name}{it.q > 1 ? ` ×${it.q}` : ''}{it.equipped && <span className="tag">equipped</span>}</li>)}</ul>
        </>
      )}
    </details>
  );
}

// Who has an item matching the search, across table loot, the stash and D&D Beyond inventories.
function SearchResults({ q }: { q: string }) {
  const chars = useCampaign(s => s.characters);
  const loot = useCampaign(s => s.partyLoot);
  const needle = q.trim().toLowerCase();
  const hits: { item: string; who: string; where: string }[] = [];
  for (const it of loot) if (it.name.toLowerCase().includes(needle)) {
    const c = chars.find(c => c.id === it.to);
    hits.push({ item: it.name + (it.q > 1 ? ` ×${it.q}` : ''), who: c?.name ?? 'Party stash', where: 'table loot' });
  }
  for (const c of chars) for (const it of c.ddbInventory ?? []) if (it.name.toLowerCase().includes(needle))
    hits.push({ item: it.name + (it.q > 1 ? ` ×${it.q}` : ''), who: c.name, where: 'D&D Beyond' });
  return (
    <div className="search-results">
      {hits.length ? (
        <ul>{hits.map((h, i) => <li key={i}><b>{h.who}</b> has {h.item} <small className="muted">({h.where})</small></li>)}</ul>
      ) : <p className="hint">Nobody has anything matching “{q.trim()}”.</p>}
    </div>
  );
}
