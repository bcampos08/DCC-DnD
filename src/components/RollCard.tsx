import type { RollResult } from '../types';

export default function RollCard({ r, big }: { r: RollResult; big?: boolean }) {
  const dmgTotal = r.parts?.reduce((s, p) => s + p.total, 0);
  return (
    <div className={'roll-card' + (r.crit ? ' crit' : '') + (r.fumble ? ' fumble' : '') + (big ? ' big' : '')}>
      <div className="rc-top">
        <span className="rc-who">{r.who}</span>
        <span className="rc-label">{r.label}</span>
        {r.hidden && <span className="tag hidden-tag" title="Only you saw this roll">DM only</span>}
      </div>
      <div className="rc-main">
        <b className="rc-total">{r.total}</b>
        <span className="rc-break">{r.expr} → {renderBreak(r.breakdown)}</span>
        {r.crit && <span className="tag crit-tag">NAT 20</span>}
        {r.fumble && <span className="tag fumble-tag">NAT 1</span>}
      </div>
      {!!r.parts?.length && (
        <div className="rc-parts">
          <b>{dmgTotal} damage</b>{r.crit && ' (crit)'}: {r.parts.map((p, i) => <span key={i}>{p.total} {p.label} <small>({p.expr})</small>{i < r.parts!.length - 1 ? ' + ' : ''}</span>)}
        </div>
      )}
    </div>
  );
}

// Dropped dice (from advantage etc.) are marked ~like this~ in the breakdown.
function renderBreak(s: string) {
  return s.split(/(~\d+~)/).map((x, i) => (x.startsWith('~') ? <s key={i}>{x.slice(1, -1)}</s> : x));
}
