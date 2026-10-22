import { useCallback, useEffect, useRef, useState } from 'react';
import MapCanvas from '../components/MapCanvas';
import Toolbar, { TOOL_KEYS } from '../components/Toolbar';
import DiceTray from '../components/DiceTray';
import TokenCard from '../components/TokenCard';
import Toasts from '../components/Toasts';
import CombatPanel from '../components/panels/CombatPanel';
import MonstersPanel from '../components/panels/MonstersPanel';
import PartyPanel from '../components/panels/PartyPanel';
import LootPanel from '../components/panels/LootPanel';
import ScenesPanel from '../components/panels/ScenesPanel';
import LogPanel from '../components/panels/LogPanel';
import NotesPanel from '../components/panels/NotesPanel';
import { useCampaign, creatureOf, campaignData } from '../store';
import { useUI, type Tab } from '../ui';
import { channel, send, tableState, type Measure, type Ping } from '../lib/sync';
import { uid } from '../lib/id';
import type { Camera, Scene } from '../types';
import { loadSrd } from '../lib/monsters';
import CloudModal from '../components/CloudModal';
import { cloudInfo, currentUser, isDirty, lastCloudSave, loadFromCloud, onDirtyChange } from '../lib/cloud';
import { nextTurn } from '../lib/actions';

const TABS: { id: Tab; label: string }[] = [
  { id: 'combat', label: '⚔ Combat' }, { id: 'monsters', label: '🐉 Monsters' }, { id: 'party', label: '🛡 Party' },
  { id: 'loot', label: '💰 Loot' }, { id: 'scenes', label: '🗺 Scenes' }, { id: 'notes', label: '📝 Notes' }, { id: 'log', label: '🎲 Log' },
];

export function fitCamera(scene: Scene, w: number, h: number): Camera {
  const W = scene.map?.width ?? 30 * scene.grid.size, H = scene.map?.height ?? 20 * scene.grid.size;
  const scale = Math.min(w / W, h / H) * 0.95;
  return { scale, x: (w - W * scale) / 2, y: (h - H * scale) / 2 };
}

export default function DMView() {
  const st = useCampaign();
  const ui = useUI();
  const scene = st.scenes.find(s => s.id === st.activeSceneId) ?? st.scenes[0];
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [tableOpen, setTableOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [dirty, setDirtyState] = useState(isDirty());
  useEffect(() => onDirtyChange(() => setDirtyState(isDirty())), []);

  // On startup, offer a newer cloud save (e.g. planning done on the desktop).
  useEffect(() => {
    (async () => {
      try {
        if (!(await currentUser())) return;
        const info = await cloudInfo();
        const mine = lastCloudSave();
        if (info && (!mine || new Date(info.saved_at) > new Date(mine))) {
          useUI.getState().toast(`Newer cloud save from ${info.device ?? 'another computer'} (${new Date(info.saved_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})`, {
            label: 'Load it', run: async () => {
              if (isDirty() && !confirm('This computer has changes that are not in the cloud. Replace them?')) return;
              try { await loadFromCloud(() => {}); useUI.getState().toast('Loaded the cloud save'); } catch (e) { useUI.getState().toast((e as Error).message); }
            },
          });
        }
      } catch { /* offline or cloud not set up yet */ }
    })();
  }, []);

  useEffect(() => { loadSrd(); }, []);

  // Track canvas size.
  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }); useUI.getState().set({ viewport: { w: r.width, h: r.height } }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const camera = ui.camera[scene.id] ?? fitCamera(scene, size.w, size.h);
  const setCamera = useCallback((c: Camera) => useUI.getState().set(s => ({ camera: { ...s.camera, [scene.id]: c } })), [scene.id]);

  // Stream a players-safe copy of the state to the table window.
  useEffect(() => {
    let raf = 0;
    const push = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const u = useUI.getState(); send({ type: 'state', state: tableState(campaignData(), u.cameraNonce, u.tableCamera) }); }); };
    const un1 = useCampaign.subscribe(push);
    const un2 = useUI.subscribe((s, prev) => { if (s.cameraNonce !== prev.cameraNonce) push(); });
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'hello') { setTableOpen(true); push(); } if (e.data?.type === 'bye') setTableOpen(false); };
    channel?.addEventListener('message', onMsg);
    push();
    return () => { un1(); un2(); channel?.removeEventListener('message', onMsg); cancelAnimationFrame(raf); };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
      const u = useUI.getState(), c = useCampaign.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); c.undo(); return; }
      if (e.key === 'Escape') { u.set({ tool: 'select', selected: [], selectedTemplate: null }); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (u.selectedTemplate) { c.updateScene(c.activeSceneId, s => { s.templates = s.templates.filter(t => t.id !== u.selectedTemplate); }); u.set({ selectedTemplate: null }); }
        else if (u.selected.length) { c.updateScene(c.activeSceneId, s => { s.tokens = s.tokens.filter(t => !u.selected.includes(t.id)); }); u.set({ selected: [] }); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tool = TOOL_KEYS[e.key.toLowerCase()];
      if (tool) u.set({ tool });
      if (e.key === 'n' && c.encounter.active) nextTurn(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openTable = () => {
    window.open(`${location.pathname}#/table`, 'dcc-table', 'popup,width=1280,height=760');
  };
  const sendView = () => {
    const c = camera;
    useUI.getState().set(s => ({ tableCamera: { cx: (size.w / 2 - c.x) / c.scale, cy: (size.h / 2 - c.y) / c.scale, viewW: size.w / c.scale }, cameraNonce: s.cameraNonce + 1 }));
    if (st.tableSceneId !== scene.id) st.set(d => { d.tableSceneId = scene.id; });
  };
  const fitTable = () => useUI.getState().set(s => ({ tableCamera: null, cameraNonce: s.cameraNonce + 1 }));

  const activeEntry = st.encounter.active ? st.encounter.entries[st.encounter.turn] : undefined;
  const activeIds = new Set(activeEntry?.tokenIds ?? []);
  const drawStyle = { color: ui.color, width: ui.strokeWidth, fill: ui.fillShapes, dmOnly: ui.dmOnlyDraw, brush: ui.brush, tplColor: ui.tplColor };
  const upd = (fn: (s: Scene) => void) => st.updateScene(scene.id, fn);

  return (
    <div className="dm">
      <header className="topbar">
        <div className="brand">DCC <span>Table</span></div>
        <select className="scene-select" value={scene.id} onChange={e => st.set(d => { d.activeSceneId = e.target.value; })} aria-label="Scene you are editing">
          {st.scenes.map(s => <option key={s.id} value={s.id}>{s.name}{s.id === st.tableSceneId ? ' 📺' : ''}</option>)}
        </select>
        {scene.id !== st.tableSceneId
          ? <button className="btn sm warn" onClick={() => st.set(d => { d.tableSceneId = scene.id; })}>Players see “{st.scenes.find(s => s.id === st.tableSceneId)?.name}” — show this scene</button>
          : <span className="tag live">📺 Players see this scene</span>}
        <span className="grow" />
        <label className="check" title="Fog of war on this scene"><input type="checkbox" checked={scene.fog.enabled} onChange={e => upd(s => { s.fog.enabled = e.target.checked; })} /> Fog</label>
        <button className="btn sm" onClick={sendView} title="Make the table screen show what you see now">Send my view to table</button>
        <button className="btn sm" onClick={fitTable} title="Fit the whole map on the table screen">Fit table</button>
        <button className={'btn sm cloud-btn' + (dirty ? ' dirty' : '')} onClick={() => setCloudOpen(true)} title={dirty ? 'Changes on this computer are not saved to the cloud yet' : 'Cloud save'}>{dirty && <i className="dot" />}☁ Cloud</button>
        <button className={'btn sm' + (tableOpen ? '' : ' primary')} onClick={openTable}>{tableOpen ? '📺 Table open' : '📺 Open table view'}</button>
      </header>
      <div className="dm-body">
        <Toolbar />
        <div className="canvas-wrap" ref={wrap}>
          <MapCanvas
            mode="dm" scene={scene} width={size.w} height={size.h} camera={camera} onCamera={setCamera}
            creature={t => creatureOf(t, st.characters)} activeTokenIds={activeIds} showNames={() => true}
            measure={measure} pings={pings} tool={ui.tool} selected={ui.selected} selectedTemplate={ui.selectedTemplate}
            diagonal={st.settings.diagonal} drawStyle={drawStyle}
            onSelect={(ids, add) => ui.set(s => ({ selected: add ? [...new Set([...s.selected, ...ids])] : ids, selectedTemplate: null }))}
            onSelectTemplate={id => ui.set({ selectedTemplate: id })}
            onMoveTokens={moves => upd(s => { moves.forEach(m => { const t = s.tokens.find(t => t.id === m.id); if (t) { t.x = m.x; t.y = m.y; } }); })}
            onFog={op => upd(s => { s.fog.ops.push(op); })}
            onDraw={d => upd(s => { s.drawings.push(d); })}
            onRemoveDrawing={id => upd(s => { s.drawings = s.drawings.filter(d => d.id !== id); })}
            onTemplate={t => upd(s => { s.templates.push(t); })}
            onMoveTemplate={(id, x, y) => upd(s => { const t = s.templates.find(t => t.id === id); if (t) { t.x = x; t.y = y; } })}
            onRemoveTemplate={id => upd(s => { s.templates = s.templates.filter(t => t.id !== id); })}
            onGridAlign={(x, y, w, h) => {
              const sz = (w + h) / 2;
              st.updateScene(scene.id, s => { s.grid.size = Math.round(sz * 10) / 10; s.grid.offsetX = Math.round((x % sz) * 10) / 10; s.grid.offsetY = Math.round((y % sz) * 10) / 10; s.grid.show = true; });
              ui.set({ tool: 'select' });
              ui.toast(`Grid set to ${Math.round(sz)} px squares. Fine-tune in Scenes if needed.`);
            }}
            onMeasure={m => { setMeasure(m); send({ type: 'measure', m: m?.dmOnly ? null : m }); }}
            onPing={(x, y) => { const p = { x, y, at: Date.now() }; setPings(ps => [...ps.filter(q => Date.now() - q.at < 2500), p]); send({ type: 'ping', p }); }}
            onTokenDblClick={id => { const t = scene.tokens.find(t => t.id === id); if (t?.monsterId) ui.set({ tab: 'monsters', monsterId: t.monsterId }); if (t?.charId) ui.set({ tab: 'party' }); }}
            onAskText={(x, y) => { const text = prompt('Label text'); if (text) upd(s => { s.drawings.push({ id: uid(), t: 'text', x, y, text, color: ui.color, size: Math.max(18, scene.grid.size * 0.4), dmOnly: ui.dmOnlyDraw }); }); }}
          />
          {ui.tool === 'grid-align' && <div className="canvas-hint">Drag a box over exactly one square of the map’s printed grid. Esc to cancel.</div>}
          {scene.tokens.length === 0 && ui.tool === 'select' && <div className="canvas-hint soft">Add monsters from the 🐉 Monsters tab, or party tokens from 🛡 Party. Scroll to zoom, drag to pan.</div>}
          <DiceTray />
          <TokenCard />
          <Toasts />
          {cloudOpen && <CloudModal onClose={() => setCloudOpen(false)} />}
        </div>
        <aside className="side">
          <nav className="tabs">
            {TABS.map(t => <button key={t.id} className={'tab' + (ui.tab === t.id ? ' on' : '')} onClick={() => ui.set({ tab: t.id })}>{t.label}{t.id === 'combat' && st.encounter.active ? ` · R${st.encounter.round}` : ''}</button>)}
          </nav>
          <div className="tab-body">
            {ui.tab === 'combat' && <CombatPanel />}
            {ui.tab === 'monsters' && <MonstersPanel />}
            {ui.tab === 'party' && <PartyPanel />}
            {ui.tab === 'loot' && <LootPanel />}
            {ui.tab === 'scenes' && <ScenesPanel />}
            {ui.tab === 'notes' && <NotesPanel />}
            {ui.tab === 'log' && <LogPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}
