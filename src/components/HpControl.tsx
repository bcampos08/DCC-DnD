import { useState } from 'react';
import { changeHp } from '../lib/actions';
import { evaluate, isDiceExpr } from '../lib/dice';

// Type an amount (or dice like 2d6+3), then Damage / Heal / Temp.
export default function HpControl({ targets, compact }: { targets: { tokenId?: string; charId?: string }[]; compact?: boolean }) {
  const [v, setV] = useState('');
  const apply = (kind: 'damage' | 'heal' | 'temp') => {
    const s = v.trim();
    if (!s) return;
    const n = isDiceExpr(s) ? evaluate(s).total : parseInt(s, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    targets.forEach(t => changeHp(t, n, kind));
    setV('');
  };
  return (
    <div className={'hp-control' + (compact ? ' compact' : '')}>
      <input value={v} onChange={e => setV(e.target.value)} placeholder="HP" inputMode="numeric" aria-label="Amount"
        onKeyDown={e => { if (e.key === 'Enter') apply(e.shiftKey ? 'heal' : 'damage'); }} title="Enter = damage, Shift+Enter = heal" />
      <button className="btn sm dmg" onClick={() => apply('damage')}>{compact ? '−' : 'Damage'}</button>
      <button className="btn sm heal" onClick={() => apply('heal')}>{compact ? '+' : 'Heal'}</button>
      {!compact && <button className="btn sm temp" onClick={() => apply('temp')}>Temp</button>}
    </div>
  );
}

export function HpBar({ hp, max, temp }: { hp: number; max: number; temp?: number }) {
  const f = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  return (
    <div className="hpbar" title={`${hp} / ${max}${temp ? ` (+${temp} temp)` : ''}`}>
      <i style={{ width: `${f * 100}%`, background: f > 0.5 ? 'var(--ok)' : f > 0.25 ? 'var(--warn)' : 'var(--bad)' }} />
      <span>{hp}/{max}{temp ? ` +${temp}` : ''}</span>
    </div>
  );
}
