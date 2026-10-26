import { useEffect, useState } from 'react';
import { useCampaign } from '../store';
import { endLasting } from '../lib/fx/play';

// Lasting spell effects on this scene, with time or rounds left and an End button.
export default function EffectsBar() {
  const list = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId)?.effects);
  const effects = list ?? [];
  const enc = useCampaign(s => s.encounter);
  const [, tick] = useState(0);
  useEffect(() => { if (!list?.some(e => e.endsAt)) return; const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, [list]);
  if (!effects.length) return null;
  const left = (e: (typeof effects)[number]) => {
    if (e.endsAt) return `${Math.max(0, Math.ceil((e.endsAt - Date.now()) / 1000))}s`;
    if (e.endsRound) return enc.active ? `${Math.max(0, e.endsRound - enc.round)} rd` : 'paused';
    return 'until ended';
  };
  return (
    <div className="effects-bar">
      <b>✨ Lasting effects</b>
      {effects.map(e => (
        <div key={e.id} className="eff">
          <span className="grow">{e.label}</span>
          <small className="muted">{left(e)}</small>
          <button className="btn sm" onClick={() => endLasting(e.id)}>End</button>
        </div>
      ))}
    </div>
  );
}
