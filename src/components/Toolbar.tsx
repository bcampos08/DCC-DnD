import { useUI, type Tool } from '../ui';
import { useCampaign, canUndo } from '../store';

const GROUPS: { title: string; tools: { id: Tool; icon: string; label: string; key?: string }[] }[] = [
  { title: '', tools: [
    { id: 'select', icon: '🖐', label: 'Select & move (drag empty space to pan, Shift+drag to box-select)', key: 'V' },
    { id: 'ruler', icon: '📏', label: 'Measure distance (players see it too)', key: 'M' },
    { id: 'ping', icon: '📍', label: 'Ping a spot on the table screen', key: 'P' },
  ] },
  { title: 'Fog', tools: [
    { id: 'fog-reveal-rect', icon: '⬚', label: 'Reveal area (drag a box)', key: 'R' },
    { id: 'fog-reveal-brush', icon: '🖌', label: 'Reveal with brush' },
    { id: 'fog-hide-rect', icon: '■', label: 'Hide area (drag a box)', key: 'H' },
    { id: 'fog-hide-brush', icon: '🖍', label: 'Hide with brush' },
  ] },
  { title: 'Draw', tools: [
    { id: 'pen', icon: '✏', label: 'Freehand', key: 'D' },
    { id: 'line', icon: '╱', label: 'Line' },
    { id: 'rect', icon: '▭', label: 'Rectangle' },
    { id: 'circle', icon: '◯', label: 'Circle' },
    { id: 'text', icon: 'T', label: 'Text label' },
    { id: 'erase', icon: '⌫', label: 'Erase a drawing or template (click it)', key: 'E' },
  ] },
  { title: 'Area', tools: [
    { id: 'tpl-circle', icon: '◎', label: 'Sphere / radius' },
    { id: 'tpl-cone', icon: '◥', label: 'Cone' },
    { id: 'tpl-cube', icon: '▣', label: 'Cube' },
    { id: 'tpl-line', icon: '━', label: 'Line (5 ft wide)' },
  ] },
];
export const TOOL_KEYS = Object.fromEntries(GROUPS.flatMap(g => g.tools).filter(t => t.key).map(t => [t.key!.toLowerCase(), t.id]));

const COLORS = ['#e11d48', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ffffff', '#111111'];

export default function Toolbar() {
  const ui = useUI();
  useCampaign(s => s.scenes); // re-render for undo state
  const isDraw = ['pen', 'line', 'rect', 'circle', 'text'].includes(ui.tool);
  const isBrush = ui.tool.includes('brush');
  const isTpl = ui.tool.startsWith('tpl-');
  return (
    <div className="toolbar">
      {GROUPS.map(g => (
        <div key={g.title} className="tool-group">
          {g.title && <span className="tg-title">{g.title}</span>}
          {g.tools.map(t => (
            <button key={t.id} className={'tool' + (ui.tool === t.id ? ' on' : '')} title={t.label + (t.key ? ` (${t.key})` : '')} aria-label={t.label} onClick={() => ui.set({ tool: t.id })}>{t.icon}</button>
          ))}
        </div>
      ))}
      <div className="tool-group">
        <button className="tool" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!canUndo()} onClick={() => useCampaign.getState().undo()}>↶</button>
      </div>
      {(isDraw || isTpl) && (
        <div className="tool-opts">
          {(isTpl ? COLORS.slice(0, 7) : COLORS).map(c => (
            <button key={c} className={'sw' + ((isTpl ? ui.tplColor : ui.color) === c ? ' on' : '')} style={{ background: c }} onClick={() => ui.set(isTpl ? { tplColor: c } : { color: c })} aria-label={`Colour ${c}`} />
          ))}
          {isDraw && ui.tool !== 'text' && <input type="range" min={1} max={24} value={ui.strokeWidth} onChange={e => ui.set({ strokeWidth: +e.target.value })} title="Line width" aria-label="Line width" />}
          {(ui.tool === 'rect' || ui.tool === 'circle') && <label className="check" title="Fill shape"><input type="checkbox" checked={ui.fillShapes} onChange={e => ui.set({ fillShapes: e.target.checked })} />Fill</label>}
          {isDraw && <label className="check" title="Only you see it"><input type="checkbox" checked={ui.dmOnlyDraw} onChange={e => ui.set({ dmOnlyDraw: e.target.checked })} />DM only</label>}
        </div>
      )}
      {isBrush && (
        <div className="tool-opts">
          <span className="tg-title">Brush</span>
          <input type="range" min={0.5} max={6} step={0.5} value={ui.brush} onChange={e => ui.set({ brush: +e.target.value })} aria-label="Brush size" />
          <small>{ui.brush} sq</small>
        </div>
      )}
    </div>
  );
}
