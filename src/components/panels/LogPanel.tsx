import { useCampaign } from '../../store';
import RollCard from '../RollCard';

export default function LogPanel() {
  const rolls = useCampaign(s => s.rolls);
  return (
    <div className="panel-col">
      <div className="row gap pad-x pad-t"><h3 className="h grow">Roll log</h3>{!!rolls.length && <button className="btn sm" onClick={() => confirm('Clear the roll log?') && useCampaign.getState().set(d => { d.rolls = []; })}>Clear</button>}</div>
      <div className="panel-scroll pad-x">
        {!rolls.length && <p className="hint">Rolls from stat blocks, the dice tray and initiative show up here.</p>}
        {rolls.map(r => <RollCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}
