import { useEffect, useMemo, useState } from 'react';
import type { RollResult } from '../types';
import { DICE_HOLD_MS, DICE_LAND_MS } from '../lib/diceAnim';

type D = { s: number; v: number; drop?: boolean; dmg?: boolean };
const MAX_DICE = 14;

// Outline for each die type, in a 100×100 box.
function Shape({ s }: { s: number }) {
  switch (s) {
    case 4: return <polygon points="50,6 95,88 5,88" />;
    case 6: return <rect x="10" y="10" width="80" height="80" rx="14" />;
    case 8: return <><polygon points="50,4 94,50 50,96 6,50" /><polyline className="facet" points="6,50 94,50" /></>;
    case 10: case 100: return <><polygon points="50,4 94,42 50,96 6,42" /><polyline className="facet" points="6,42 50,60 94,42 M50,60 L50,96" /></>;
    case 12: return <><polygon points="50,4 95,37 78,92 22,92 5,37" /><polygon className="facet" points="50,24 73,41 64,70 36,70 27,41" /></>;
    case 20: return <><polygon points="50,3 92,27 92,73 50,97 8,73 8,27" /><polygon className="facet" points="50,22 78,68 22,68" /></>;
    default: return <circle cx="50" cy="50" r="44" />;
  }
}
const textY = (s: number) => (s === 4 ? 70 : s === 10 || s === 100 ? 52 : 50);

// Dice tumbling onto the table screen before the result card shows.
export default function DiceThrow({ roll, row }: { roll: RollResult; row: number }) {
  const dice = useMemo<D[]>(() => [
    ...(roll.dice ?? []),
    ...(roll.parts ?? []).flatMap(p => (p.dice ?? []).map(d => ({ ...d, dmg: true }))),
  ], [roll]);
  const shown = dice.slice(0, MAX_DICE);
  // each die flies in from a random side with its own spin
  const paths = useMemo(() => shown.map(() => {
    const fromLeft = Math.random() < 0.5;
    return { dx: (fromLeft ? -1 : 1) * (45 + Math.random() * 20), dy: 18 + Math.random() * 20, r: (fromLeft ? 1 : -1) * (540 + Math.random() * 540), delay: Math.random() * 120, tilt: Math.random() * 16 - 8 };
  }), [shown.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [landed, setLanded] = useState(false);
  const [, tick] = useState(0);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const spin = setInterval(() => tick(t => t + 1), 70);
    const land = setTimeout(() => { setLanded(true); clearInterval(spin); }, DICE_LAND_MS);
    const out = setTimeout(() => setGone(true), DICE_LAND_MS + DICE_HOLD_MS);
    return () => { clearInterval(spin); clearTimeout(land); clearTimeout(out); };
  }, []);
  if (!shown.length) return null;

  return (
    <div className={'dice-throw' + (gone ? ' gone' : '')} style={{ ['--row' as string]: row }}>
      {shown.map((d, i) => {
        const nat = d.s === 20 && !d.drop && !d.dmg ? (d.v === 20 ? ' nat20' : d.v === 1 ? ' nat1' : '') : '';
        const p = paths[i];
        const face = landed ? d.v : 1 + Math.floor(Math.random() * d.s);
        return (
          <div key={i} className={'die3' + (d.dmg ? ' dmg' : '') + (landed && d.drop ? ' drop' : '') + (landed ? ' landed' + nat : '')}
            style={{ ['--dx' as string]: `${p.dx}vw`, ['--dy' as string]: `${p.dy}vh`, ['--spin' as string]: `${p.r}deg`, ['--tilt' as string]: `${p.tilt}deg`, animationDelay: `${p.delay}ms` }}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <g className="body"><Shape s={d.s} /></g>
              <text x="50" y={textY(d.s)} className={face >= 100 ? 'three' : face >= 10 ? 'two' : ''}>{face}</text>
            </svg>
            <small>d{d.s}</small>
          </div>
        );
      })}
      {dice.length > MAX_DICE && <div className="dice-more">+{dice.length - MAX_DICE} more</div>}
    </div>
  );
}
