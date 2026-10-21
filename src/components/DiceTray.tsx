import { useState } from 'react';
import { useUI, setTrayRolls } from '../ui';
import { useCampaign } from '../store';
import { roll } from '../lib/roll';
import { isDiceExpr } from '../lib/dice';
import RollCard from './RollCard';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function DiceTray() {
  const { rollHidden, adv, set, trayRolls } = useUI();
  const rolls = useCampaign(s => s.rolls);
  const recent = rolls.slice(0, trayRolls);
  const [expr, setExpr] = useState('');
  const [open, setOpen] = useState(true);
  const go = () => {
    const e = expr.trim().replace(/^\//, '').replace(/^r(oll)?\s+/i, '');
    if (!isDiceExpr(e)) { useUI.getState().toast('Try something like 2d6+3 or 1d20+5'); return; }
    roll(e, 'Roll', 'DM');
  };
  return (
    <div className={'dice-tray' + (open ? '' : ' closed')}>
      <div className="row gap">
        <button className="tray-toggle grow" onClick={() => setOpen(!open)}>{open ? '▾ Dice' : '▴ Dice'}</button>
        {open && (
          <span className="tray-count" title="How many recent rolls to show here">
            Rolls shown
            <button className="icon-btn" onClick={() => setTrayRolls(trayRolls - 1)} disabled={trayRolls <= 0} aria-label="Show fewer rolls">−</button>
            <b>{trayRolls}</b>
            <button className="icon-btn" onClick={() => setTrayRolls(trayRolls + 1)} disabled={trayRolls >= 20} aria-label="Show more rolls">+</button>
          </span>
        )}
      </div>
      {open && (
        <>
          {recent.length > 0 && <div className="tray-rolls">{recent.map(r => <RollCard key={r.id} r={r} />)}</div>}
          <div className="dice-row">
            {DICE.map(d => <button key={d} className="die" onClick={() => roll(`1d${d}`, `d${d}`, 'DM')}>d{d}</button>)}
          </div>
          <form className="row gap" onSubmit={e => { e.preventDefault(); go(); }}>
            <input className="grow" value={expr} onChange={e => setExpr(e.target.value)} placeholder="2d6+3" aria-label="Dice expression" />
            <button className="btn sm primary">Roll</button>
          </form>
          <div className="row gap">
            <div className="seg">
              <button className={adv === 'dis' ? 'on' : ''} onClick={() => set({ adv: adv === 'dis' ? 'normal' : 'dis' })} title="Next d20 roll at disadvantage">Dis</button>
              <button className={adv === 'normal' ? 'on' : ''} onClick={() => set({ adv: 'normal' })}>Normal</button>
              <button className={adv === 'adv' ? 'on' : ''} onClick={() => set({ adv: adv === 'adv' ? 'normal' : 'adv' })} title="Next d20 roll at advantage">Adv</button>
            </div>
            <div className="seg">
              <button className={rollHidden ? 'on' : ''} onClick={() => set({ rollHidden: true })} title="Only you see the result">🙈 Hidden</button>
              <button className={!rollHidden ? 'on' : ''} onClick={() => set({ rollHidden: false })} title="Result pops up on the table screen">📺 Public</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
