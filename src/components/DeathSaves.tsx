import { useCampaign } from '../store';
import { setDeathSaves } from '../lib/actions';

// Click a box to mark a pass or fail; click the last marked box to undo it.
export default function DeathSaves({ charId, compact }: { charId: string; compact?: boolean }) {
  const c = useCampaign(s => s.characters.find(x => x.id === charId));
  if (!c || c.maxHp <= 0 || c.hp > 0) return null;
  const ds = c.deathSaves ?? { success: 0, fail: 0 };
  const set = (kind: 'success' | 'fail', i: number) => {
    const cur = ds[kind];
    setDeathSaves(charId, { ...ds, [kind]: i < cur ? i : i + 1 });
  };
  const status = ds.fail >= 3 ? 'Dead' : ds.success >= 3 ? 'Stable' : 'Dying';
  return (
    <div className={'death-saves' + (compact ? ' compact' : '')}>
      <span className={'ds-status ' + status.toLowerCase()}>{status === 'Dead' ? '💀' : status === 'Stable' ? '🛡' : '❤'} {status}</span>
      <span className="ds-group" aria-label="Death save passes">
        <small>Pass</small>
        {[0, 1, 2].map(i => <button key={i} className={'ds-box ok' + (i < ds.success ? ' on' : '')} onClick={() => set('success', i)} aria-label={`Pass ${i + 1}`} />)}
      </span>
      <span className="ds-group" aria-label="Death save fails">
        <small>Fail</small>
        {[0, 1, 2].map(i => <button key={i} className={'ds-box bad' + (i < ds.fail ? ' on' : '')} onClick={() => set('fail', i)} aria-label={`Fail ${i + 1}`} />)}
      </span>
      {(ds.success > 0 || ds.fail > 0) && <button className="icon-btn" title="Clear death saves" onClick={() => setDeathSaves(charId, { success: 0, fail: 0 })}>↺</button>}
    </div>
  );
}
