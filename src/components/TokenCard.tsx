import { useRef } from 'react';
import { useCampaign, creatureOf } from '../store';
import { useUI } from '../ui';
import HpControl, { HpBar } from './HpControl';
import Conditions from './Conditions';
import MonsterNotes from './MonsterNotes';
import { saveAsset } from '../lib/assets';
import { TOKEN_COLORS } from '../lib/rules';
import type { Token } from '../types';

const SIZES: [number, string][] = [[0.5, 'Tiny'], [1, 'Medium'], [2, 'Large'], [3, 'Huge'], [4, 'Gargantuan']];

export default function TokenCard() {
  const selected = useUI(s => s.selected);
  const sceneId = useCampaign(s => s.activeSceneId);
  const scene = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId));
  const chars = useCampaign(s => s.characters);
  const st = useCampaign.getState();
  const file = useRef<HTMLInputElement>(null);
  if (!scene) return null;
  const toks = scene.tokens.filter(t => selected.includes(t.id));
  if (!toks.length) return null;

  const upd = (patch: Partial<Token>) => st.updateScene(sceneId, s => { s.tokens.forEach(t => { if (selected.includes(t.id)) Object.assign(t, patch); }); });
  const remove = () => { st.updateScene(sceneId, s => { s.tokens = s.tokens.filter(t => !selected.includes(t.id)); }); useUI.getState().set({ selected: [] }); };
  const toggleCond = (id: string) => {
    const on = !toks.every(t => creatureOf(t, chars).conditions.includes(id));
    toks.forEach(t => {
      if (t.charId) { const c = chars.find(c => c.id === t.charId)!; st.updateChar(c.id, { conditions: on ? [...new Set([...c.conditions, id])] : c.conditions.filter(x => x !== id) }); }
      else st.updateToken(sceneId, t.id, { conditions: on ? [...new Set([...t.conditions, id])] : t.conditions.filter(x => x !== id) });
    });
  };
  const setConc = (v: boolean) => toks.forEach(t => (t.charId ? st.updateChar(t.charId, { concentrating: v }) : st.updateToken(sceneId, t.id, { concentrating: v })));
  const targets = toks.map(t => ({ tokenId: t.id }));
  const close = () => useUI.getState().set({ selected: [] });

  if (toks.length > 1) {
    return (
      <div className="token-card">
        <div className="tc-head"><b>{toks.length} tokens selected</b><button className="icon-btn" onClick={close} aria-label="Close">✕</button></div>
        <HpControl targets={targets} />
        <p className="hint">Applies to every selected token, handy for area spells.</p>
        <details className="tc-more"><summary>Conditions</summary><Conditions value={toks.flatMap(t => creatureOf(t, chars).conditions).filter((c, _, a) => a.filter(x => x === c).length === toks.length)} onToggle={toggleCond} /></details>
        <div className="row gap wrap">
          <button className="btn sm" onClick={() => upd({ hidden: !toks.every(t => t.hidden) })}>{toks.every(t => t.hidden) ? 'Reveal to players' : 'Hide from players'}</button>
          <button className="btn sm danger" onClick={remove}>Remove from map</button>
        </div>
      </div>
    );
  }

  const t = toks[0];
  const c = creatureOf(t, chars);
  return (
    <div className="token-card">
      <div className="tc-head">
        <input className="tc-name" value={t.charId ? c.name : t.name} disabled={!!t.charId} onChange={e => st.updateToken(sceneId, t.id, { name: e.target.value })} aria-label="Name" />
        <button className="icon-btn" onClick={close} aria-label="Close">✕</button>
      </div>
      <div className="row gap">
        <HpBar hp={c.hp} max={c.maxHp} temp={c.tempHp} />
        <span className="ac-badge" title="Armor Class">AC {c.ac}</span>
      </div>
      <HpControl targets={targets} />
      {!t.charId && (
        <div className="row gap wrap small-fields">
          <label>HP <input type="number" value={t.hp} onChange={e => st.updateToken(sceneId, t.id, { hp: +e.target.value })} /></label>
          <label>Max <input type="number" value={t.maxHp} onChange={e => st.updateToken(sceneId, t.id, { maxHp: +e.target.value })} /></label>
          <label>AC <input type="number" value={t.ac} onChange={e => st.updateToken(sceneId, t.id, { ac: +e.target.value })} /></label>
        </div>
      )}
      <MonsterNotes monsterId={t.monsterId} token={{ sceneId, id: t.id, note: t.note }} />
      <label className="check"><input type="checkbox" checked={c.concentrating} onChange={e => setConc(e.target.checked)} /> Concentrating</label>
      <details className="tc-more" open={c.conditions.length > 0}>
        <summary>Conditions{c.conditions.length ? ` (${c.conditions.length})` : ''}</summary>
        <Conditions value={c.conditions} onToggle={toggleCond} />
      </details>
      <div className="row gap wrap">
        <select value={t.size} onChange={e => upd({ size: +e.target.value })} aria-label="Size">{SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <div className="swatches">{TOKEN_COLORS.map(col => <button key={col} className={'sw' + (t.color === col ? ' on' : '')} style={{ background: col }} onClick={() => upd({ color: col })} aria-label={`Colour ${col}`} />)}</div>
      </div>
      <div className="row gap wrap">
        <button className="btn sm" onClick={() => upd({ hidden: !t.hidden })}>{t.hidden ? '👁 Reveal to players' : '🙈 Hide from players'}</button>
        <button className="btn sm" onClick={() => file.current?.click()}>Token image</button>
        {t.image && <button className="btn sm" onClick={() => upd({ image: undefined })}>Clear image</button>}
        {t.monsterId && <button className="btn sm" onClick={() => useUI.getState().set({ tab: 'monsters', monsterId: t.monsterId })}>Stat block</button>}
        <button className="btn sm danger" onClick={remove}>Remove</button>
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) {
        const image = await saveAsset(f);
        // A monster's picture is used for every copy of it in this scene.
        if (t.monsterId) st.updateScene(sceneId, s => { s.tokens.forEach(x => { if (x.monsterId === t.monsterId) x.image = image; }); });
        else upd({ image });
      } e.target.value = ''; }} />
    </div>
  );
}
