import { useState } from 'react';
import { useCampaign } from '../store';
import { useUI } from '../ui';
import { ELEMENTS, type Element } from '../lib/fx/core';
import { fxOn, templateFx } from '../lib/fx/play';

const SHAPE = { circle: 'sphere', cone: 'cone', cube: 'cube', line: 'line' } as const;

// Shown when an area template is selected: play its spell effect on the table, or delete it.
export default function TemplateCard() {
  const id = useUI(s => s.selectedTemplate);
  const selected = useUI(s => s.selected);
  const scene = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId));
  const isTable = useCampaign(s => s.activeSceneId === s.tableSceneId);
  useCampaign(s => s.settings.fx);
  const [element, setElement] = useState<Element>('fire');
  const t = scene?.templates.find(x => x.id === id);
  if (!scene || !t) return null;
  const caster = selected.length === 1 ? scene.tokens.find(x => x.id === selected[0]) : undefined;
  const remove = () => { useCampaign.getState().updateScene(scene.id, s => { s.templates = s.templates.filter(x => x.id !== t.id); }); useUI.getState().set({ selectedTemplate: null }); };
  return (
    <div className="template-card">
      <div className="tc-head"><b>{t.feet}-ft {SHAPE[t.shape]}</b><button className="icon-btn" onClick={() => useUI.getState().set({ selectedTemplate: null })} aria-label="Close">✕</button></div>
      {fxOn() && (
        <>
          <div className="row gap wrap">
            <select value={element} onChange={e => setElement(e.target.value as Element)} aria-label="Element">{ELEMENTS.map(el => <option key={el.id} value={el.id}>{el.label}</option>)}</select>
            <button className="btn sm primary" disabled={!isTable} onClick={() => templateFx(t, element, caster?.id)}>🎬 Play on table</button>
          </div>
          <p className="hint">
            {!isTable ? 'Effects only play on the scene players are looking at.'
              : t.shape === 'circle' ? (caster ? `Flies from ${caster.name}, then bursts.` : 'Tip: select the caster’s token first and the spell flies from them.') : 'Plays from the template’s starting point.'}
          </p>
        </>
      )}
      <button className="btn sm danger" onClick={remove}>Delete template</button>
    </div>
  );
}
