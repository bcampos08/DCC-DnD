import { useState } from 'react';
import { manualFx, type ManualFx } from '../lib/fx/play';
import { ELEMENTS, type Element } from '../lib/fx/core';
import { useCampaign } from '../store';

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
  const [pick, setPick] = useState('sword');
  const [element, setElement] = useState<Element>('fire');
  if (!on) return null;
  const opt = OPTIONS.find(o => o.id === pick)!;
  return (
    <details className="notes-box fx-picker">
      <summary>🎬 Play an effect</summary>
      <div className="row gap wrap">
        <select value={pick} onChange={e => setPick(e.target.value)} aria-label="Effect">{OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        {opt.element && <select value={element} onChange={e => setElement(e.target.value as Element)} aria-label="Element">{ELEMENTS.map(el => <option key={el.id} value={el.id}>{el.label}</option>)}</select>}
        <button className="btn sm primary" disabled={!isTable} onClick={() => manualFx(tokenId, opt.fx, opt.id === 'lightning' ? 'lightning' : opt.id === 'darts' ? 'force' : opt.element ? element : 'physical')}>
          {opt.fx.kind === 'poof' ? 'Play' : '🎯 Pick target'}
        </button>
      </div>
      <p className="hint">{isTable ? 'Plays on the table screen only. Use it for players’ attacks and spells from D&D Beyond.' : 'Effects only play on the scene players are looking at.'}</p>
    </details>
  );
}
