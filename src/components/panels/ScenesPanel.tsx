import { useRef, useState } from 'react';
import { useCampaign, newScene } from '../../store';
import { useUI } from '../../ui';
import { BUILTIN_MAPS } from '../../lib/builtinMaps';
import { prepareImage, saveAsset } from '../../lib/assets';
import { exportBackup, importBackup } from '../../lib/backup';
import { uid } from '../../lib/id';
import Modal from '../Modal';
import type { Grid } from '../../types';

export default function ScenesPanel() {
  const scenes = useCampaign(s => s.scenes);
  const activeId = useCampaign(s => s.activeSceneId);
  const tableId = useCampaign(s => s.tableSceneId);
  const settings = useCampaign(s => s.settings);
  const name = useCampaign(s => s.name);
  const st = useCampaign.getState();
  const scene = scenes.find(s => s.id === activeId)!;
  const [adding, setAdding] = useState(false);
  const restore = useRef<HTMLInputElement>(null);

  const grid = (p: Partial<Grid>) => st.updateScene(activeId, s => { Object.assign(s.grid, p); }, false);
  const select = (id: string) => { st.set(d => { d.activeSceneId = id; }); useUI.getState().set({ selected: [] }); };

  return (
    <div className="panel-scroll pad">
      <div className="row gap"><h3 className="h grow">Scenes</h3><button className="btn sm primary" onClick={() => setAdding(true)}>+ New scene</button></div>
      <ul className="scene-list">
        {scenes.map(s => (
          <li key={s.id} className={s.id === activeId ? 'on' : ''}>
            <button className="grow scene-pick" onClick={() => select(s.id)}>
              <b>{s.name}</b>
              <small>{s.tokens.length} tokens{s.fog.enabled ? ' · fog' : ''}</small>
            </button>
            {s.id === tableId ? <span className="tag live" title="Showing on the table screen">📺 On table</span>
              : <button className="btn sm" onClick={() => st.set(d => { d.tableSceneId = s.id; })}>Show on table</button>}
            <button className="icon-btn" title="Rename" onClick={() => { const n = prompt('Scene name', s.name); if (n) st.updateScene(s.id, x => { x.name = n; }, false); }}>✎</button>
            <button className="icon-btn" title="Duplicate" onClick={() => st.set(d => { const i = d.scenes.findIndex(x => x.id === s.id); d.scenes.splice(i + 1, 0, { ...structuredClone(s), id: uid(), name: s.name + ' copy' }); })}>⧉</button>
            <button className="icon-btn" title="Delete" disabled={scenes.length < 2} onClick={() => {
              if (!confirm(`Delete scene “${s.name}”?`)) return;
              st.set(d => {
                d.scenes = d.scenes.filter(x => x.id !== s.id);
                if (d.activeSceneId === s.id) d.activeSceneId = d.scenes[0].id;
                if (d.tableSceneId === s.id) d.tableSceneId = d.scenes[0].id;
              });
            }}>🗑</button>
          </li>
        ))}
      </ul>

      <h3 className="h">Grid — {scene.name}</h3>
      <div className="row gap wrap">
        <label className="check"><input type="checkbox" checked={scene.grid.show} onChange={e => grid({ show: e.target.checked })} /> Show grid</label>
        <label className="check"><input type="checkbox" checked={scene.grid.snap} onChange={e => grid({ snap: e.target.checked })} /> Snap to grid</label>
      </div>
      <label className="slider">Square size <input type="range" min={20} max={300} value={scene.grid.size} onChange={e => grid({ size: +e.target.value })} /><input type="number" value={scene.grid.size} step={0.5} onChange={e => grid({ size: Math.max(5, +e.target.value) })} /></label>
      <label className="slider">Offset X <input type="range" min={0} max={scene.grid.size} step={0.5} value={scene.grid.offsetX % scene.grid.size} onChange={e => grid({ offsetX: +e.target.value })} /><input type="number" value={scene.grid.offsetX} step={0.5} onChange={e => grid({ offsetX: +e.target.value })} /></label>
      <label className="slider">Offset Y <input type="range" min={0} max={scene.grid.size} step={0.5} value={scene.grid.offsetY % scene.grid.size} onChange={e => grid({ offsetY: +e.target.value })} /><input type="number" value={scene.grid.offsetY} step={0.5} onChange={e => grid({ offsetY: +e.target.value })} /></label>
      <label className="slider">Line opacity <input type="range" min={0} max={1} step={0.05} value={scene.grid.opacity} onChange={e => grid({ opacity: +e.target.value })} /><input type="color" value={scene.grid.color} onChange={e => grid({ color: e.target.value })} aria-label="Grid colour" /></label>
      <div className="row gap wrap">
        <button className="btn sm" onClick={() => useUI.getState().set({ tool: 'grid-align' })}>Align grid to map…</button>
        <label className="row gap sm-label">Feet per square <input type="number" value={scene.grid.feet} min={1} style={{ width: 60 }} onChange={e => grid({ feet: Math.max(1, +e.target.value) })} /></label>
      </div>
      <p className="hint">Align: choose the tool, then drag a box over exactly one square of the map's own grid.</p>

      <h3 className="h">Fog of war</h3>
      <div className="row gap wrap">
        <label className="check"><input type="checkbox" checked={scene.fog.enabled} onChange={e => st.updateScene(activeId, s => { s.fog.enabled = e.target.checked; })} /> Fog on</label>
        <button className="btn sm" onClick={() => st.updateScene(activeId, s => { s.fog.enabled = true; s.fog.ops = []; })}>Hide everything</button>
        <button className="btn sm" onClick={() => st.updateScene(activeId, s => { s.fog.ops = [{ t: 'all', mode: 'reveal' }]; })}>Reveal everything</button>
      </div>
      <label className="check"><input type="checkbox" checked={scene.fog.autoReveal !== false} onChange={e => st.updateScene(activeId, s => { s.fog.autoReveal = e.target.checked; }, false)} /> Player tokens reveal fog as they move</label>
      {scene.fog.autoReveal !== false && (
        <div className="row gap wrap sm-label">
          <label className="row gap">Lighting
            <select value={scene.fog.light ?? 'lit'} onChange={e => st.updateScene(activeId, s => { s.fog.light = e.target.value as 'lit' | 'dark'; }, false)}>
              <option value="lit">Lit: everyone sees</option>
              <option value="dark">Dark: darkvision and carried light only (explored areas stay dimmed)</option>
            </select>
          </label>
          {(scene.fog.light ?? 'lit') === 'lit' && (
            <label className="row gap">Sight <input type="number" min={5} step={5} style={{ width: 64 }} value={scene.fog.sightFeet ?? 60} onChange={e => st.updateScene(activeId, s => { s.fog.sightFeet = Math.max(5, +e.target.value || 60); }, false)} /> ft</label>
          )}
        </div>
      )}
      <p className="hint">Use the fog tools on the left. You see fog as a shaded overlay; players see solid black. Revealing by movement clears a circle; it doesn't stop at walls, so hide anything behind a wall again with the Hide tools.</p>

      <h3 className="h">Table settings</h3>
      <label className="check"><input type="checkbox" checked={settings.showMonsterNames} onChange={e => st.set(d => { d.settings.showMonsterNames = e.target.checked; })} /> Show monster names on the table</label>
      <label className="row gap sm-label">Diagonals
        <select value={settings.diagonal} onChange={e => st.set(d => { d.settings.diagonal = e.target.value as '5' | '5-10'; })}>
          <option value="5">Every square is 5 ft (PHB)</option>
          <option value="5-10">Alternate 5 / 10 ft (DMG variant)</option>
        </select>
      </label>

      <h3 className="h">Campaign</h3>
      <label className="field">Name<input value={name} onChange={e => st.set(d => { d.name = e.target.value; })} /></label>
      <p className="hint">Everything saves automatically in this browser. Download a backup now and then, and before clearing browser data or switching computers.</p>
      <div className="row gap wrap">
        <button className="btn sm" onClick={exportBackup}>⬇ Download backup</button>
        <button className="btn sm" onClick={() => restore.current?.click()}>⬆ Restore backup</button>
      </div>
      <input ref={restore} type="file" accept=".json,application/json" hidden onChange={async e => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f || !confirm('Restoring replaces everything currently in the app. Continue?')) return;
        try { await importBackup(f); useUI.getState().toast('Backup restored'); } catch (err) { alert((err as Error).message); }
      }} />
      {adding && <NewScene onClose={() => setAdding(false)} />}
    </div>
  );
}

function NewScene({ onClose }: { onClose: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const add = (s: ReturnType<typeof newScene>) => {
    useCampaign.getState().set(d => { d.scenes.push(s); d.activeSceneId = s.id; });
    useUI.getState().set({ selected: [] });
    onClose();
  };
  const upload = async (f: File) => {
    setBusy(true);
    try {
      const { blob, width, height } = await prepareImage(f);
      const id = await saveAsset(blob);
      const sc = newScene(name || f.name.replace(/\.[^.]+$/, ''), { src: id, width, height }, 70);
      sc.grid.show = true;
      add(sc);
      useUI.getState().toast('Map added. Use “Align grid to map” in Scenes if the squares don’t line up.');
    } catch { alert('Could not read that image.'); } finally { setBusy(false); }
  };
  return (
    <Modal title="New scene" onClose={onClose}>
      <label className="field">Scene name (optional)<input value={name} onChange={e => setName(e.target.value)} /></label>
      <button className="btn primary big" disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Loading…' : 'Upload a map image'}</button>
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <p className="hint">Or start from a built-in map:</p>
      <div className="builtin-grid">
        {BUILTIN_MAPS.map(m => (
          <button key={m.id} className="builtin" onClick={() => add(newScene(name || m.name, { src: m.src, width: m.width, height: m.height }, m.grid))}>
            <img src={m.src} alt="" /><span>{m.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
