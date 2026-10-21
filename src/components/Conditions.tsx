import { CONDITIONS } from '../lib/rules';

export default function Conditions({ value, onToggle }: { value: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="cond-grid">
      {CONDITIONS.map(c => (
        <button key={c.id} className={'cond' + (value.includes(c.id) ? ' on' : '')} style={{ ['--c' as string]: c.color }} title={c.desc} onClick={() => onToggle(c.id)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function CondChips({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return <span className="cond-chips">{ids.map(id => { const c = CONDITIONS.find(x => x.id === id); return <i key={id} style={{ background: c?.color }} title={c?.label}>{c?.short ?? id}</i>; })}</span>;
}
