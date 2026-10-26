import { useState } from 'react';
import { useCampaign } from '../store';
import { useUI } from '../ui';
import { ELEMENTS, type Element } from '../lib/fx/core';
import { DURATIONS, fxOn, playTemplate, templateStyles, type TemplateStyle } from '../lib/fx/play';

const SHAPE = { circle: 'sphere', cone: 'cone', cube: 'cube', line: 'line' } as const;

// Shown when an area template is selected: play its spell effect on the table, or delete it.
export default function TemplateCard() {
  const id = useUI(s => s.selectedTemplate);
  const selected = useUI(s => s.selected);
  const scene = useCampaign(s => s.scenes.find(x => x.id === s.activeSceneId));
  const isTable = useCampaign(s => s.activeSceneId === s.tableSceneId);
  useCampaign(s => s.settings.fx);
  const [element, setElement] = useState<Element>('fire');
  const [styleId, setStyle] = useState<TemplateStyle | ''>('');
  const [duration, setDuration] = useState('r10');
  const t = scene?.templates.find(x => x.id === id);
  if (!scene || !t) return null;
  const caster = selected.length === 1 ? scene.tokens.find(x => x.id === selected[0]) : undefined;
  const styles = templateStyles(t.shape);
  const style = styles.find(x => x.id === styleId) ?? styles[0];
  const remove = () => { useCampaign.getState().updateScene(scene.id, s => { s.templates = s.templates.filter(x => x.id !== t.id); }); useUI.getState().set({ selectedTemplate: null }); };
  return (
    <div className="template-card">
      <div className="tc-head"><b>{t.feet}-ft {SHAPE[t.shape]}</b><button className="icon-btn" onClick={() => useUI.getState().set({ selectedTemplate: null })} aria-label="Close">✕</button></div>
      {fxOn() && (
        <>
          <div className="row gap wrap">
            <select value={style.id} onChange={e => setStyle(e.target.value as TemplateStyle)} aria-label="Effect style">{styles.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
            <select value={element} onChange={e => setElement(e.target.value as Element)} aria-label="Element">{ELEMENTS.map(el => <option key={el.id} value={el.id}>{el.id === 'poison' && style.id === 'wall' ? 'Poison (thorns)' : el.label}</option>)}</select>
          </div>
          {style.lasting && (
            <label className="row gap sm-label">Lasts <select value={duration} onChange={e => setDuration(e.target.value)} aria-label="Duration">{DURATIONS.filter(d => d.id !== 'instant').map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
          )}
          <button className="btn sm primary" disabled={!isTable && !style.lasting} onClick={() => {
            playTemplate(t, style.id, element, style.lasting ? duration : 'instant', caster?.id);
            if (style.lasting) remove(); // the effect takes the template's place
          }}>{style.lasting ? '✨ Start effect' : '🎬 Play on table'}</button>
          {style.lasting && <p className="hint">The template turns into the effect. End it any time from the Lasting effects list. Rounds count down during combat.</p>}
          <p className="hint">
            {!isTable && !style.lasting ? 'Effects only play on the scene players are looking at.'
              : style.lasting ? '' : t.shape === 'circle' ? (caster ? `Flies from ${caster.name}, then bursts.` : 'Tip: select the caster’s token first and the spell flies from them.') : 'Plays from the template’s starting point.'}
          </p>
        </>
      )}
      <button className="btn sm danger" onClick={remove}>Delete template</button>
    </div>
  );
}
