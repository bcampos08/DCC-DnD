import { Fragment } from 'react';
import { roll } from '../lib/roll';

// Turns dice like "2d6 + 3" and "+5 to hit" inside rules text into roll buttons.
const RX = /(\d+d\d+(?:\s*[+\-−]\s*\d+)?)|([+\-−]\d+) to hit/g;

export default function DiceText({ text, who, label }: { text: string; who: string; label: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RX.lastIndex = 0;
  while ((m = RX.exec(text))) {
    out.push(text.slice(last, m.index));
    if (m[1]) {
      const expr = m[1].replace(/−/g, '-').replace(/\s/g, '');
      out.push(<button key={m.index} className="dice-link" onClick={() => roll(expr, label, who)}>{m[1]}</button>);
    } else {
      const b = parseInt(m[2].replace('−', '-'), 10);
      out.push(<Fragment key={m.index}><button className="dice-link" onClick={() => roll(`1d20${b >= 0 ? '+' : ''}${b}`, `${label} attack`, who)}>{m[2]}</button> to hit</Fragment>);
    }
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}
