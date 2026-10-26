import { useCampaign } from '../store';
import { findMonster } from '../lib/monsters';
import { attack, pcAttack } from '../lib/fx/play';
import { fmtMod } from '../lib/dice';
import type { Token } from '../types';

// The selected creature's own attacks, one click each: pick the target, roll vs AC, apply damage, animate.
export default function TokenAttacks({ t }: { t: Token }) {
  const chars = useCampaign(s => s.characters);
  const fx = useCampaign(s => s.settings.fx !== false);
  const m = t.monsterId ? findMonster(t.monsterId) : undefined;
  const ch = t.charId ? chars.find(c => c.id === t.charId) : undefined;
  const monsterAttacks = (m?.actions ?? []).filter(a => a.atk != null);
  const pcAttacks = (ch?.attacks ?? []).filter(a => a.toHit != null);
  if (!monsterAttacks.length && !pcAttacks.length) return null;
  return (
    <div className="token-attacks">
      <div className="ta-head">⚔ Attacks <small className="muted">{fx ? 'click, then click the target' : 'rolls attack and damage'}</small></div>
      <div className="row gap wrap">
        {monsterAttacks.map(a => (
          <button key={a.name} className="roll-chip" onClick={() => attack({ name: a.name, who: t.name, toHit: a.atk!, dmg: a.dmg ?? [], desc: a.desc, monsterId: t.monsterId, attackerId: t.id })}>
            {a.name} {fmtMod(a.atk!)}{a.dmg?.length ? ` · ${a.dmg.map(d => d.dice).join('+')}` : ''}
          </button>
        ))}
        {ch && pcAttacks.map(a => (
          <button key={a.name} className="roll-chip" onClick={() => pcAttack(ch, a, t.id)}>{a.name} {fmtMod(a.toHit!)}{a.damage ? ` · ${a.damage}` : ''}</button>
        ))}
      </div>
    </div>
  );
}
