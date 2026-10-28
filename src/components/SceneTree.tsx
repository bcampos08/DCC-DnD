import { useState } from 'react';
import { useCampaign } from '../store';
import { useUI } from '../ui';
import { uid } from '../lib/id';
import type { Scene, SceneFolder } from '../types';

type Drag = { kind: 'scene' | 'folder'; id: string } | null;
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

// "Dungeon / Level 1" style path for a folder.
export function folderPath(folders: SceneFolder[], id?: string): string {
  const parts: string[] = [];
  let f = folders.find(x => x.id === id);
  for (let guard = 0; f && guard < 50; guard++) { parts.unshift(f.name); f = folders.find(x => x.id === f!.parentId); }
  return parts.join(' / ');
}

export const isInside = (folders: SceneFolder[], id: string | undefined, ancestor: string) => {
  let f = folders.find(x => x.id === id);
  for (let guard = 0; f && guard < 50; guard++) { if (f.id === ancestor) return true; f = folders.find(x => x.id === f!.parentId); }
  return false;
};

// Explorer-style tree of folders and scenes. Drag items onto a folder to move them,
// or onto empty space to move them back to the top level.
export default function SceneTree({ onNewScene }: { onNewScene: (folderId?: string) => void }) {
  const scenes = useCampaign(s => s.scenes);
  const folders = useCampaign(s => s.sceneFolders);
  const activeId = useCampaign(s => s.activeSceneId);
  const tableId = useCampaign(s => s.tableSceneId);
  const st = useCampaign.getState();
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<string | null>(null); // folder id or 'root'
  const [renaming, setRenaming] = useState<string | null>(null);

  const select = (id: string) => { st.set(d => { d.activeSceneId = id; }); useUI.getState().set({ selected: [] }); };
  const setFolder = (id: string, p: Partial<SceneFolder>) => st.set(d => { const f = d.sceneFolders.find(f => f.id === id); if (f) Object.assign(f, p); });
  const newFolder = (parentId?: string) => {
    const f: SceneFolder = { id: uid(), name: 'New folder', parentId };
    st.set(d => { d.sceneFolders.push(f); const p = d.sceneFolders.find(x => x.id === parentId); if (p) p.collapsed = false; });
    setRenaming(f.id);
  };
  const deleteFolder = (f: SceneFolder) => {
    const inside = scenes.filter(s => s.folderId === f.id).length + folders.filter(x => x.parentId === f.id).length;
    if (inside && !confirm(`Delete folder “${f.name}”? Everything in it moves up to ${f.parentId ? `“${folders.find(x => x.id === f.parentId)?.name}”` : 'the top level'}.`)) return;
    st.set(d => {
      d.scenes.forEach(s => { if (s.folderId === f.id) s.folderId = f.parentId; });
      d.sceneFolders.forEach(x => { if (x.parentId === f.id) x.parentId = f.parentId; });
      d.sceneFolders = d.sceneFolders.filter(x => x.id !== f.id);
    });
  };
  const moveTo = (target?: string) => {
    if (!drag) return;
    if (drag.kind === 'scene') st.set(d => { const s = d.scenes.find(s => s.id === drag.id); if (s) s.folderId = target; });
    else if (drag.id !== target && !isInside(folders, target, drag.id)) st.set(d => { const f = d.sceneFolders.find(f => f.id === drag.id); if (f) f.parentId = target; });
    if (target) setFolder(target, { collapsed: false });
    setDrag(null); setOver(null);
  };
  const dropProps = (target?: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!drag) return;
      if (drag.kind === 'folder' && target && (drag.id === target || isInside(folders, target, drag.id))) return; // can't go inside itself
      e.preventDefault(); e.stopPropagation(); setOver(target ?? 'root');
    },
    onDragLeave: (e: React.DragEvent) => { e.stopPropagation(); setOver(o => (o === (target ?? 'root') ? null : o)); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); moveTo(target); },
  });
  const dragProps = (kind: 'scene' | 'folder', id: string) => ({
    draggable: renaming !== id,
    onDragStart: (e: React.DragEvent) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setDrag({ kind, id }); },
    onDragEnd: () => { setDrag(null); setOver(null); },
  });

  // Called as a plain function (not <NameEdit/>) so re-renders don't remount the input mid-typing.
  const NameEdit = ({ id, value, onSave }: { id: string; value: string; onSave: (v: string) => void }) => (
    <input key={'rename-' + id} className="tree-rename" defaultValue={value} autoFocus onFocus={e => e.target.select()}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { (e.target as HTMLInputElement).value = value; (e.target as HTMLInputElement).blur(); } }}
      onBlur={e => { const v = e.target.value.trim(); if (v && v !== value) onSave(v); setRenaming(r => (r === id ? null : r)); }} />
  );

  const sceneRow = (s: Scene, depth: number) => (
    <li key={s.id} className={'tree-row scene' + (s.id === activeId ? ' on' : '') + (drag?.id === s.id ? ' dragging' : '')} style={{ paddingLeft: 6 + depth * 18 }} {...dragProps('scene', s.id)}>
      <span className="tree-caret" />
      <span className="tree-icon">🗺</span>
      {renaming === s.id
        ? NameEdit({ id: s.id, value: s.name, onSave: v => st.updateScene(s.id, x => { x.name = v; }, false) })
        : <button className="tree-name" onClick={() => select(s.id)} onDoubleClick={() => setRenaming(s.id)} title="Click to open, double-click to rename, drag to move">
            {s.name}<small>{s.tokens.length} tokens{s.fog.enabled ? ' · fog' : ''}</small>
          </button>}
      {s.id === tableId
        ? <span className="tag live" title="Players see this scene">📺</span>
        : <button className="btn sm ghost tree-show" onClick={() => st.set(d => { d.tableSceneId = s.id; })} title="Show this scene on the table screen">Show</button>}
      <span className="tree-actions">
        <button className="icon-btn" title="Rename" onClick={() => setRenaming(s.id)}>✎</button>
        <button className="icon-btn" title="Duplicate" onClick={() => st.set(d => { const i = d.scenes.findIndex(x => x.id === s.id); d.scenes.splice(i + 1, 0, { ...structuredClone(s), id: uid(), name: s.name + ' copy' }); })}>⧉</button>
        <button className="icon-btn" title="Delete" disabled={scenes.length < 2} onClick={() => {
          if (!confirm(`Delete scene “${s.name}”?`)) return;
          st.set(d => {
            d.scenes = d.scenes.filter(x => x.id !== s.id);
            if (d.activeSceneId === s.id) d.activeSceneId = d.scenes[0].id;
            if (d.tableSceneId === s.id) d.tableSceneId = d.scenes[0].id;
          });
        }}>🗑</button>
      </span>
    </li>
  );

  const countIn = (id: string): number => scenes.filter(s => s.folderId === id).length + folders.filter(f => f.parentId === id).reduce((n, f) => n + countIn(f.id), 0);

  const folderRows = (f: SceneFolder, depth: number): React.ReactNode[] => {
    const open = !f.collapsed;
    const hasActive = !open && (scenes.some(s => s.id === activeId && (s.folderId === f.id || isInside(folders, s.folderId, f.id))));
    const rows: React.ReactNode[] = [
      <li key={f.id} className={'tree-row folder' + (over === f.id ? ' drop' : '') + (drag?.id === f.id ? ' dragging' : '') + (hasActive ? ' has-active' : '')} style={{ paddingLeft: 6 + depth * 18 }}
        {...dragProps('folder', f.id)} {...dropProps(f.id)}>
        <button className="tree-caret" onClick={() => setFolder(f.id, { collapsed: open })} aria-label={open ? 'Collapse folder' : 'Expand folder'} aria-expanded={open}>{open ? '▾' : '▸'}</button>
        <span className="tree-icon">{open ? '📂' : '📁'}</span>
        {renaming === f.id
          ? NameEdit({ id: f.id, value: f.name, onSave: v => setFolder(f.id, { name: v }) })
          : <button className="tree-name" onClick={() => setFolder(f.id, { collapsed: open })} onDoubleClick={() => setRenaming(f.id)} title="Click to open or close, double-click to rename, drag to move">
              {f.name}<small>{countIn(f.id)}</small>
            </button>}
        <span className="tree-actions">
          <button className="icon-btn" title="New scene in this folder" onClick={() => onNewScene(f.id)}>＋🗺</button>
          <button className="icon-btn" title="New folder inside" onClick={() => newFolder(f.id)}>＋📁</button>
          <button className="icon-btn" title="Rename" onClick={() => setRenaming(f.id)}>✎</button>
          <button className="icon-btn" title="Delete folder" onClick={() => deleteFolder(f)}>🗑</button>
        </span>
      </li>,
    ];
    if (open) {
      for (const sub of folders.filter(x => x.parentId === f.id).sort(byName)) rows.push(...folderRows(sub, depth + 1));
      for (const s of scenes.filter(x => x.folderId === f.id).sort(byName)) rows.push(sceneRow(s, depth + 1));
      if (!folders.some(x => x.parentId === f.id) && !scenes.some(x => x.folderId === f.id)) rows.push(<li key={f.id + '-empty'} className="tree-empty" style={{ paddingLeft: 30 + (depth + 1) * 18 }}>Empty. Drag scenes here.</li>);
    }
    return rows;
  };

  // Scenes whose folder was deleted elsewhere show at the top level.
  const known = new Set(folders.map(f => f.id));
  const rootFolders = folders.filter(f => !f.parentId || !known.has(f.parentId)).sort(byName);
  const rootScenes = scenes.filter(s => !s.folderId || !known.has(s.folderId)).sort(byName);

  return (
    <div className={'scene-tree' + (over === 'root' ? ' drop' : '')} {...dropProps(undefined)}>
      <div className="row gap tree-bar">
        <button className="btn sm" onClick={() => newFolder()}>＋ Folder</button>
        <button className="btn sm ghost" onClick={() => st.set(d => { d.sceneFolders.forEach(f => { f.collapsed = true; }); })} disabled={!folders.length}>Collapse all</button>
        <button className="btn sm ghost" onClick={() => st.set(d => { d.sceneFolders.forEach(f => { f.collapsed = false; }); })} disabled={!folders.length}>Expand all</button>
      </div>
      <ul className="tree">
        {rootFolders.flatMap(f => folderRows(f, 0))}
        {rootScenes.map(s => sceneRow(s, 0))}
      </ul>
      {drag && <p className="hint tree-hint">Drop on a folder to move it there, or on empty space for the top level.</p>}
    </div>
  );
}
