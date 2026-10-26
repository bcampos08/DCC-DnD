import { DURATIONS, entryForToken, manualFx, type ManualFx } from '../lib/fx/play';
import { useUI } from '../ui';
import { ELEMENTS, type Element } from '../lib/fx/core';
import { useCampaign } from '../store';
import type { FxPick } from '../types';

const OPTIONS: { id: string; label: string; fx: ManualFx; element?: boolean }[] = [
  { id: 'sword', label: '⚔ Sword swing', fx: { kind: 'melee', weapon: 'sword' } },
  { id: 'scimitar', label: '⚔ Scimitar swing', fx: { kind: 'melee', weapon: 'scimitar' } },
  { id: 'axe', label: '🪓 Axe chop', fx: { kind: 'melee', weapon: 'axe' } },
  { id: 'club', label: '🔨 Mace / club', fx: { kind: 'melee', weapon: 'club' } },
  { id: 'dagger', label: '🗡 Dagger stab', fx: { kind: 'melee', weapon: 'dagger' } },
  { id: 'spear', label: '🔱 Spear thrust', fx: { kind: 'melee', weapon: 'spear' } },
  { id: 'bite', label: '🦷 Bite', fx: { kind: 'melee', weapon: 'bite' } },
  { id: 'claw', label: '🐾 Claws', fx: { kind: 'melee', weapon: 'claw' } },
  { id: 'slam', label: '👊 Slam / punch', fx: { kind: 'melee', weapon: 'slam' } },
  { id: 'touch', label: '✋ Spell touch', fx: { kind: 'melee', weapon: 'touch' }, element: true },
  { id: 'arrow', label: '🏹 Arrow', fx: { kind: 'missile', missile: 'arrow' } },
  { id: 'bolt', label: '🏹 Crossbow bolt', fx: { kind: 'missile', missile: 'bolt' } },
  { id: 'stone', label: '🪨 Sling stone', fx: { kind: 'missile', missile: 'stone' } },
  { id: 'thrown', label: '🗡 Thrown weapon', fx: { kind: 'missile', missile: 'thrown' } },
  { id: 'boulder', label: '🪨 Hurled boulder', fx: { kind: 'missile', missile: 'boulder' } },
  { id: 'orb', label: '☄ Spell bolt (fire bolt etc.)', fx: { kind: 'spell', missile: 'orb' }, element: true },
  { id: 'ray', label: '〰 Ray / beam', fx: { kind: 'spell', missile: 'ray' }, element: true },
  { id: 'lightning', label: '⚡ Lightning strike', fx: { kind: 'spell', missile: 'lightning' } },
  { id: 'darts', label: '✨ Magic missile', fx: { kind: 'spell', missile: 'darts' } },
  { id: 'burst10', label: '💥 Explosion, 10 ft', fx: { kind: 'burst', radiusFt: 10 }, element: true },
  { id: 'burst20', label: '💥 Explosion, 20 ft', fx: { kind: 'burst', radiusFt: 20 }, element: true },
  { id: 'wall', label: '🧱 Wall (fire, ice, force, stone, thorns…)', fx: { kind: 'wall' }, element: true },
  { id: 'cone', label: '🔺 Cone (breath, cone of cold…)', fx: { kind: 'cone' }, element: true },
  { id: 'heal', label: '💚 Healing', fx: { kind: 'heal' } },
  { id: 'poof', label: '💨 Smoke puff (on this token)', fx: { kind: 'poof' } },
];

// Plays an effect from a token, or from an initiative entry with no token (e.g. a lair action).
export default function FxPicker({ tokenId, entryId }: { tokenId?: string; entryId?: string }) {
  const on = useCampaign(s => s.settings.fx !== false);
  const isTable = useCampaign(s => s.activeSceneId === s.tableSceneId);
  // Each token remembers its own choice (player characters keep theirs across scenes).
  const token = useCampaign(s => (tokenId ? s.scenes.find(x => x.id === s.activeSceneId)?.tokens.find(t => t.id === tokenId) : undefined));
  const char = useCampaign(s => (token?.charId ? s.characters.find(c => c.id === token.charId) : undefined));
  const entry = useCampaign(s => (entryId ? s.encounter.entries.find(e => e.id === entryId) : undefined));
  const saved: FxPick = (char ?? token ?? entry)?.fxPick ?? { pick: entryId ? 'burst10' : 'sword', element: 'fire', toHit: '', dice: '' };
  const { pick, toHit, dice } = saved;
  const element = saved.element as Element;
  const save = (p: Partial<FxPick>) => {
    const next = { ...saved, ...p };
    const st = useCampaign.getState();
    if (entry) st.setEntries(l => { const x = l.find(e => e.id === entry.id); if (x) x.fxPick = next; });
    else if (char) st.updateChar(char.id, { fxPick: next });
    else st.updateScene(st.activeSceneId, s => { const t = s.tokens.find(t => t.id === tokenId); if (t) t.fxPick = next; }, false);
  };
  const setPick = (v: string) => save({ pick: v });
  const setElement = (v: Element) => save({ element: v });
  const setToHit = (v: string) => save({ toHit: v });
  const setDice = (v: string) => save({ dice: v });
  const radius = saved.radius ?? '0', dur = saved.dur ?? 'instant';
  if (!on || (!token && !entry)) return null;
  // Without a token there's nothing to swing a weapon from.
  const options = entry ? OPTIONS.filter(o => o.fx.kind !== 'melee') : OPTIONS;
  const opt = options.find(o => o.id === pick) ?? options[0];
  const source = { tokenId, entryId, name: token?.name ?? entry?.name ?? 'Effect' };
  const isAttack = opt.fx.kind === 'melee' || opt.fx.kind === 'missile' || opt.fx.kind === 'spell';
  const rolls = isAttack && toHit.trim() !== '';
  const el: Element = opt.id === 'lightning' ? 'lightning' : opt.id === 'darts' ? 'force' : opt.element ? element : 'physical';
  return (
    <details className="notes-box fx-picker">
      <summary>🎬 Play an effect</summary>
      <div className="row gap wrap">
        <select value={opt.id} onChange={e => setPick(e.target.value)} aria-label="Effect">{options.map(o => <option key={o.id} value={o.id}>{o.id === 'poof' && entry ? '💨 Smoke puff' : o.label}</option>)}</select>
        {opt.element && <select value={element} onChange={e => setElement(e.target.value as Element)} aria-label="Element">{ELEMENTS.map(el => <option key={el.id} value={el.id}>{el.label}</option>)}</select>}
      </div>
      {isAttack && (
        <div className="row gap wrap fx-roll">
          <label className="row gap sm-label">To hit <input type="number" value={toHit} onChange={e => setToHit(e.target.value)} placeholder="+5" style={{ width: 64 }} aria-label="Attack bonus" /></label>
          <label className="row gap sm-label">Damage <input value={dice} onChange={e => setDice(e.target.value)} placeholder="1d10" style={{ width: 84 }} aria-label="Damage dice" /></label>
        </div>
      )}
      {opt.id === 'orb' && (
        <div className="row gap wrap fx-roll">
          <label className="row gap sm-label">Impact radius <select value={radius} onChange={e => save({ radius: e.target.value })} aria-label="Impact radius">{['0', '5', '10', '15', '20', '30'].map(r => <option key={r} value={r}>{r === '0' ? 'Target only' : `${r} ft`}</option>)}</select></label>
          <label className="row gap sm-label">Lingers <select value={dur} onChange={e => save({ dur: e.target.value })} aria-label="How long it lingers">{DURATIONS.map(d => <option key={d.id} value={d.id}>{d.id === 'instant' ? 'No' : d.label}</option>)}</select></label>
        </div>
      )}
      {(opt.id === 'wall' || opt.id === 'cone') && (
        <label className="row gap sm-label">Lasts <select value={dur} onChange={e => save({ dur: e.target.value })} aria-label="Duration">{DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
      )}
      {opt.id === 'wall' || opt.id === 'cone' ? (
        <button className="btn sm primary" onClick={() => {
          useUI.getState().set({ tool: opt.id === 'wall' ? 'tpl-line' : 'tpl-cone', pendingEffect: { style: opt.id as 'wall' | 'cone', element: el, duration: dur, casterEntry: entryId ?? entryForToken(tokenId), label: `${ELEMENTS.find(x => x.id === el)?.label ?? ''} ${opt.id}` } });
        }}>✏ Drag it on the map</button>
      ) : (
        <button className="btn sm primary" disabled={!isTable} onClick={() => manualFx(source, opt.fx.kind === 'spell' ? { ...opt.fx, radiusFt: +radius, linger: dur } : opt.fx, el, rolls ? { toHit: +toHit, dice: dice.replace(/\s/g, ''), label: opt.label.replace(/^\S+\s/, '').replace(/ \(.*\)$/, '') } : undefined)}>
          {opt.fx.kind === 'poof' ? 'Play' : rolls ? '🎯 Pick target and roll' : '🎯 Pick target'}
        </button>
      )}
      <p className="hint">{opt.id === 'wall' ? 'Drag from one end of the wall to the other. Start the drag on a token to begin at its centre.'
        : opt.id === 'cone' ? 'Drag out from the caster to aim the cone. Start the drag on the caster’s token.'
        : !isTable ? 'Effects only play on the scene players are looking at.'
        : !isAttack ? 'Plays on the table screen.'
          : rolls ? 'Rolls to hit against the target’s AC, shows hit or miss, and offers to apply the damage.'
            : 'Fill in To hit to roll a real attack. Left empty, it only plays the animation (hold Shift when clicking for a miss).'}</p>
    </details>
  );
}
