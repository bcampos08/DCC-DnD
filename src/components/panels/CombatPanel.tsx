import { useState } from 'react';
import { useCampaign, creatureOf } from '../../store';
import { useUI } from '../../ui';
import { startCombat, sortEntries, rollInitFor, groupMonsters, nextTurn, initDex, isDefeated } from '../../lib/actions';
import DeathSaves from '../DeathSaves';
import FxPicker from '../FxPicker';
import DiceText from '../DiceText';
import { uid } from '../../lib/id';
import { fmtMod } from '../../lib/dice';
import HpControl, { HpBar } from '../HpControl';
import { CondChips } from '../Conditions';
import { findMonster } from '../../lib/monsters';

export default function CombatPanel() {
  const enc = useCampaign(s => s.encounter);
  const scene = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId));
  const scenes = useCampaign(s => s.scenes);
  const chars = useCampaign(s => s.characters);
  const st = useCampaign.getState();
  const [adhoc, setAdhoc] = useState('');

  const tokenById = (id: string) => { for (const s of scenes) { const t = s.tokens.find(t => t.id === id); if (t) return t; } return undefined; };

  if (!enc.active) {
    const n = scene?.tokens.filter(t => !t.charId).length ?? 0;
    return (
      <div className="panel-scroll pad">
        <h3 className="h">Combat</h3>
        <p className="hint">Starting combat adds every party member plus the {n} monster{n === 1 ? '' : 's'}/NPC{n === 1 ? '' : 's'} on this scene. Monsters added later join automatically.</p>
        <button className="btn primary big" onClick={startCombat}>⚔ Start combat</button>
        <p className="hint">Tip: roll monster initiative with the 🎲 buttons, type in the players' numbers, then press Sort.</p>
      </div>
    );
  }

  // Monster types with 4+ creatures can roll as a group.
  const byType = new Map<string, { count: number; grouped: boolean }>();
  for (const e of enc.entries) if (e.monsterId) {
    const cur = byType.get(e.monsterId) ?? { count: 0, grouped: false };
    cur.count += e.tokenIds.length;
    if (e.tokenIds.length > 1) cur.grouped = true;
    byType.set(e.monsterId, cur);
  }
  const groupable = [...byType.entries()].filter(([, v]) => v.count > 3);

  const setInit = (id: string, v: string) => st.setEntries(l => { const e = l.find(x => x.id === id); if (e) e.init = v === '' ? null : +v; });
  const remove = (id: string) => st.set(d => {
    const i = d.encounter.entries.findIndex(e => e.id === id);
    d.encounter.entries.splice(i, 1);
    if (i < d.encounter.turn) d.encounter.turn--;
    d.encounter.turn = Math.max(0, Math.min(d.encounter.turn, d.encounter.entries.length - 1));
  });
  const rollAllMonsters = () => { enc.entries.filter(e => !e.charId && e.init == null).forEach(e => rollInitFor(e.id)); sortEntries(); };
  const end = () => { if (confirm('End combat and clear the initiative order?')) st.set(d => { d.encounter = { active: false, round: 1, turn: 0, entries: [] }; }); };
  const focus = (tokenIds: string[]) => useUI.getState().set({ selected: tokenIds });
  const campaign = useCampaign.getState();
  const defeated = new Set(enc.entries.filter(e => isDefeated(e, campaign)).map(e => e.id));

  const row = (e: (typeof enc.entries)[number], i: number) => {
    const toks = e.tokenIds.map(tokenById).filter(Boolean) as NonNullable<ReturnType<typeof tokenById>>[];
    const char = e.charId ? chars.find(c => c.id === e.charId) : undefined;
    const one = toks.length === 1 ? creatureOf(toks[0], chars) : char ? creatureOf({ charId: char.id } as never, chars) : null;
    const hiddenAll = toks.length > 0 && toks.every(t => t.hidden);
    const seenByPlayers = e.tokenIds.some(id => (enc.seenTokens ?? []).includes(id));
    const targets = e.charId ? [{ charId: e.charId }] : toks.map(t => ({ tokenId: t.id }));
    return (
      <li key={e.id} className={'init-row' + (i === enc.turn ? ' current' : '') + (hiddenAll ? ' hidden-tok' : '')}>
        <div className="init-num">
          <input type="number" value={e.init ?? ''} placeholder="–" onChange={ev => setInit(e.id, ev.target.value)} aria-label={`Initiative for ${e.name}`} />
          {!e.charId && <button className="icon-btn" title={`Roll d20${fmtMod(initDex(e))}`} onClick={() => rollInitFor(e.id)}>🎲</button>}
        </div>
        <div className="init-body">
          <button className="init-name" onClick={() => focus(e.tokenIds)}>
            {e.name}{hiddenAll && <span className="tag" title={seenByPlayers ? 'Hidden on the map, but players already saw it, so it stays in their turn order' : 'Players have not seen it yet'}>{seenByPlayers ? 'hidden · in players\' order' : 'hidden'}</span>}{e.charId && <span className="tag pc">PC</span>}
          </button>
          {one && <div className="row gap"><HpBar hp={one.hp} max={one.maxHp} temp={one.tempHp} /><span className="ac-badge">AC {one.ac}</span><CondChips ids={one.conditions} /></div>}
          {toks.length > 1 && (
            <div className="group-hp">
              {toks.map(t => { const c = creatureOf(t, chars); return <button key={t.id} className="mini-hp" onClick={() => focus([t.id])} title={t.name}><HpBar hp={c.hp} max={c.maxHp} /></button>; })}
            </div>
          )}
          {e.charId && <DeathSaves charId={e.charId} compact />}
          {(one || toks.length > 1) && <HpControl compact targets={targets} />}
          {!e.charId && !e.monsterId && !e.tokenIds.length && (
            // Added entries (lair actions, traps...) get notes and an effect to play on their turn.
            <details className="notes-box entry-extra" open={!!e.note || i === enc.turn}>
              <summary>📝 Notes & effect{e.note ? '' : ''}</summary>
              <textarea rows={2} value={e.note ?? ''} placeholder="What happens: e.g. the ceiling cracks, DC 15 Dex save or 2d10 bludgeoning"
                onChange={ev => st.setEntries(l => { const x = l.find(y => y.id === e.id); if (x) x.note = ev.target.value || undefined; })} />
              {e.note && <div className="desc sm"><DiceText text={e.note} who={e.name} label={e.name} /></div>}
              <FxPicker entryId={e.id} />
            </details>
          )}
        </div>
        <button className="icon-btn" onClick={() => remove(e.id)} aria-label={`Remove ${e.name}`}>✕</button>
      </li>
    );
  };

  return (
    <div className="panel-col">
      {enc.sceneId && enc.sceneId !== scene?.id && scenes.some(s => s.id === enc.sceneId) && (
        <div className="callout row gap combat-elsewhere">
          <span className="grow">This fight is on <b>{scenes.find(s => s.id === enc.sceneId)!.name}</b>.</span>
          <button className="btn sm primary" onClick={() => st.set(d => { d.activeSceneId = enc.sceneId!; })}>Go to it</button>
        </div>
      )}
      <div className="combat-head">
        <div className="round">Round <b>{enc.round}</b></div>
        <button className="btn" onClick={() => nextTurn(-1)} aria-label="Previous turn">◀</button>
        <button className="btn primary" onClick={() => nextTurn(1)}>Next turn ▶</button>
        <span className="grow" />
        <button className="btn sm danger" onClick={end}>End</button>
      </div>
      <div className="row gap wrap pad-x">
        <button className="btn sm" onClick={rollAllMonsters}>🎲 Roll unrolled monsters</button>
        <button className="btn sm" onClick={sortEntries}>Sort</button>
        {groupable.map(([mid, v]) => (
          <button key={mid} className="btn sm" onClick={() => groupMonsters(mid, !v.grouped)}>
            {v.grouped ? 'Split' : 'Group'} {findMonster(mid)?.name ?? 'monsters'} ×{v.count}
          </button>
        ))}
      </div>
      <div className="panel-scroll">
        <ol className="init-list">{enc.entries.map((e, i) => (defeated.has(e.id) ? null : row(e, i)))}</ol>
        {defeated.size > 0 && (
          <>
            <h4 className="init-sec">Defeated <small className="muted">(skipped in the turn order; heal them to bring them back)</small></h4>
            <ol className="init-list defeated">{enc.entries.map((e, i) => (defeated.has(e.id) ? row(e, i) : null))}</ol>
          </>
        )}
      </div>
      <form className="row gap pad-x pad-b" onSubmit={ev => { ev.preventDefault(); if (!adhoc.trim()) return; st.setEntries(l => { l.push({ id: uid(), name: adhoc.trim(), tokenIds: [], init: 20, dex: 0 }); }); setAdhoc(''); }}>
        <input className="grow" value={adhoc} onChange={e => setAdhoc(e.target.value)} placeholder="Add entry (e.g. Lair action)" />
        <button className="btn sm">Add</button>
      </form>
    </div>
  );
}
