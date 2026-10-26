import { manualFx, type ManualFx } from '../lib/fx/play';
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
  { id: 'heal', label: '💚 Healing', fx: { kind: 'heal' } },
  { id: 'poof', label: '💨 Smoke puff (on this token)', fx: { kind: 'poof' } },
];

// Plays an effect from this token on the table screen, without rolling anything.
export default function FxPicker({ tokenId }: { tokenId: string }) {
  const on = useCampaign(s => s.settings.fx !== false);
  const isTable = useCampaign(s => s.activeSceneId === s.tableSceneId);
  // Each token remembers its own choice (player characters keep theirs across scenes).
  const token = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId)?.tokens.find(t => t.id === tokenId));
  const char = useCampaign(s => (token?.charId ? s.characters.find(c => c.id === token.charId) : undefined));
  const saved: FxPick = (char ?? token)?.fxPick ?? { pick: 'sword', element: 'fire', toHit: '', dice: '' };
  const { pick, toHit, dice } = saved;
  const element = saved.element as Element;
  const save = (p: Partial<FxPick>) => {
    const next = { ...saved, ...p };
    const st = useCampaign.getState();
    if (char) st.updateChar(char.id, { fxPick: next });
    else st.updateScene(st.activeSceneId, s => { const t = s.tokens.find(t => t.id === tokenId); if (t) t.fxPick = next; }, false);
  };
  const setPick = (v: string) => save({ pick: v });
  const setElement = (v: Element) => save({ element: v });
  const setToHit = (v: string) => save({ toHit: v });
  const setDice = (v: string) => save({ dice: v });
  if (!on || !token) return null;
  const opt = OPTIONS.find(o => o.id === pick)!;
  const isAttack = opt.fx.kind === 'melee' || opt.fx.kind === 'missile' || opt.fx.kind === 'spell';
  const rolls = isAttack && toHit.trim() !== '';
  const el: Element = opt.id === 'lightning' ? 'lightning' : opt.id === 'darts' ? 'force' : opt.element ? element : 'physical';
  return (
    <details className="notes-box fx-picker">
      <summary>🎬 Play an effect</summary>
      <div className="row gap wrap">
        <select value={pick} onChange={e => setPick(e.target.value)} aria-label="Effect">{OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        {opt.element && <select value={element} onChange={e => setElement(e.target.value as Element)} aria-label="Element">{ELEMENTS.map(el => <option key={el.id} value={el.id}>{el.label}</option>)}</select>}
      </div>
      {isAttack && (
        <div className="row gap wrap fx-roll">
          <label className="row gap sm-label">To hit <input type="number" value={toHit} onChange={e => setToHit(e.target.value)} placeholder="+5" style={{ width: 64 }} aria-label="Attack bonus" /></label>
          <label className="row gap sm-label">Damage <input value={dice} onChange={e => setDice(e.target.value)} placeholder="1d10" style={{ width: 84 }} aria-label="Damage dice" /></label>
        </div>
      )}
      <button className="btn sm primary" disabled={!isTable} onClick={() => manualFx(tokenId, opt.fx, el, rolls ? { toHit: +toHit, dice: dice.replace(/\s/g, ''), label: opt.label.replace(/^\S+\s/, '').replace(/ \(.*\)$/, '') } : undefined)}>
        {opt.fx.kind === 'poof' ? 'Play' : rolls ? '🎯 Pick target and roll' : '🎯 Pick target'}
      </button>
      <p className="hint">{!isTable ? 'Effects only play on the scene players are looking at.'
        : !isAttack ? 'Plays on the table screen.'
          : rolls ? 'Rolls to hit against the target’s AC, shows hit or miss, and offers to apply the damage.'
            : 'Fill in To hit to roll a real attack. Left empty, it only plays the animation (hold Shift when clicking for a miss).'}</p>
    </details>
  );
}
