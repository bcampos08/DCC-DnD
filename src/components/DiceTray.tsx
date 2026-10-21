import { useState } from 'react';
import { useUI } from '../ui';
import { useCampaign } from '../store';
import { roll } from '../lib/roll';
import { isDiceExpr } from '../lib/dice';
import RollCard from './RollCard';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function DiceTray() {
  const { rollHidden, adv, set } = useUI();
  const last = useCampaign(s => s.rolls[0]);
  const [expr, setExpr] = useState('');
  const [open, setOpen] = useState(true);
  const go = () => {
    const e = expr.trim().replace(/^\//, '').replace(/^r(oll)?\s+/i, '');
    if (!isDiceExpr(e)) { useUI.getState().toast('Try something like 2d6+3 or 1d20+5'); return; }
    roll(e, 'Roll', 'DM');
  };
  return (
    <div className={'dice-tray' + (open ? '' : ' closed')}>
      <button className="tray-toggle" onClick={() => setOpen(!open)}>{open ? '▾ Dice' : '▴ Dice'}</button>
      {open && (
        <>
          {last && <RollCard r={last} />}
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
