import { useRef, useState } from 'react';
import { useCampaign } from '../../store';
import { useUI } from '../../ui';
import { importDocs, sizeText } from '../../lib/docs';
import { deleteAsset } from '../../lib/assets';
import { uid } from '../../lib/id';
import { byName, folderPath, isInside } from '../SceneTree';
import type { Doc, SceneFolder } from '../../types';

export const DOC_ICON: Record<Doc['kind'], string> = { pdf: '📕', word: '📘', text: '📄', image: '🖼', other: '📦' };
const NONE: never[] = [];
type Drag = { kind: 'doc' | 'folder'; id: string } | null;
const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

// Documents in Explorer-style folders. Drag documents or folders onto a folder to move them,
// or drop files from your computer straight onto a folder.
export default function DocsPanel() {
  const docs = useCampaign(s => s.docs) ?? NONE;
  const folders = useCampaign(s => s.docFolders) ?? NONE;
  const openId = useUI(s => s.openDoc);
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<string | null>(null); // folder id or 'root'
  const [renaming, setRenaming] = useState<string | null>(null);
  const [uploadTo, setUploadTo] = useState<string | undefined>(undefined);
  const file = useRef<HTMLInputElement>(null);
  const st = useCampaign.getState();

  const upload = (folderId?: string) => { setUploadTo(folderId); file.current?.click(); };
  const setFolder = (id: string, p: Partial<SceneFolder>) => st.set(d => { const f = d.docFolders.find(f => f.id === id); if (f) Object.assign(f, p); });
  const newFolder = (parentId?: string) => {
    const f: SceneFolder = { id: uid(), name: 'New folder', parentId };
    st.set(d => { d.docFolders.push(f); const p = d.docFolders.find(x => x.id === parentId); if (p) p.collapsed = false; });
    setRenaming(f.id);
  };
  const deleteFolder = (f: SceneFolder) => {
    const inside = docs.filter(x => x.folderId === f.id).length + folders.filter(x => x.parentId === f.id).length;
    if (inside && !confirm(`Delete folder “${f.name}”? Everything in it moves up to ${f.parentId ? `“${folders.find(x => x.id === f.parentId)?.name}”` : 'the top level'}.`)) return;
    st.set(d => {
      d.docs.forEach(x => { if (x.folderId === f.id) x.folderId = f.parentId; });
      d.docFolders.forEach(x => { if (x.parentId === f.id) x.parentId = f.parentId; });
      d.docFolders = d.docFolders.filter(x => x.id !== f.id);
    });
  };
  const renameDoc = (id: string, name: string) => st.set(x => { const y = x.docs.find(y => y.id === id); if (y) y.name = name; });
  const removeDoc = (d: Doc) => { if (!confirm(`Delete “${d.name}”?`)) return; st.set(x => { x.docs = x.docs.filter(y => y.id !== d.id); }); deleteAsset(d.asset); };

  const moveTo = (target?: string) => {
    if (!drag) return;
    if (drag.kind === 'doc') st.set(d => { const x = d.docs.find(x => x.id === drag.id); if (x) x.folderId = target; });
    else if (drag.id !== target && !isInside(folders, target, drag.id)) st.set(d => { const f = d.docFolders.find(f => f.id === drag.id); if (f) f.parentId = target; });
    if (target) setFolder(target, { collapsed: false });
    setDrag(null); setOver(null);
  };
  const dropProps = (target?: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!drag && !hasFiles(e)) return;
      if (drag?.kind === 'folder' && target && (drag.id === target || isInside(folders, target, drag.id))) return; // can't go inside itself
      e.preventDefault(); e.stopPropagation(); setOver(target ?? 'root');
    },
    onDragLeave: (e: React.DragEvent) => { e.stopPropagation(); setOver(o => (o === (target ?? 'root') ? null : o)); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (!drag && e.dataTransfer.files.length) {
        importDocs(e.dataTransfer.files, target);
        if (target) setFolder(target, { collapsed: false });
        setOver(null); return;
      }
      moveTo(target);
    },
  });
  const dragProps = (kind: 'doc' | 'folder', id: string) => ({
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

  const docRow = (d: Doc, depth: number, showPath = false) => (
    <li key={d.id} className={'tree-row doc' + (d.id === openId ? ' on' : '') + (drag?.id === d.id ? ' dragging' : '')} style={{ paddingLeft: 6 + depth * 18 }} {...dragProps('doc', d.id)}>
      <span className="tree-caret" />
      <span className="tree-icon">{DOC_ICON[d.kind]}</span>
      {renaming === d.id
        ? NameEdit({ id: d.id, value: d.name, onSave: v => renameDoc(d.id, v) })
        : <button className="tree-name" onClick={() => useUI.getState().set({ openDoc: d.id })} onDoubleClick={() => setRenaming(d.id)} title="Click to open full screen, double-click to rename, drag to move">
            {d.name}<small>{showPath && d.folderId ? folderPath(folders, d.folderId) + ' · ' : ''}{sizeText(d.size)}{d.editedAt ? ' · edited' : ''}</small>
          </button>}
      <span className="tree-actions">
        <button className="icon-btn" title="Rename" onClick={() => setRenaming(d.id)}>✎</button>
        <button className="icon-btn" title="Delete" onClick={() => removeDoc(d)}>🗑</button>
      </span>
    </li>
  );

  const countIn = (id: string): number => docs.filter(d => d.folderId === id).length + folders.filter(f => f.parentId === id).reduce((n, f) => n + countIn(f.id), 0);

  const folderRows = (f: SceneFolder, depth: number): React.ReactNode[] => {
    const open = !f.collapsed;
    const rows: React.ReactNode[] = [
      <li key={f.id} className={'tree-row folder' + (over === f.id ? ' drop' : '') + (drag?.id === f.id ? ' dragging' : '')} style={{ paddingLeft: 6 + depth * 18 }}
        {...dragProps('folder', f.id)} {...dropProps(f.id)}>
        <button className="tree-caret" onClick={() => setFolder(f.id, { collapsed: open })} aria-label={open ? 'Collapse folder' : 'Expand folder'} aria-expanded={open}>{open ? '▾' : '▸'}</button>
        <span className="tree-icon">{open ? '📂' : '📁'}</span>
        {renaming === f.id
          ? NameEdit({ id: f.id, value: f.name, onSave: v => setFolder(f.id, { name: v }) })
          : <button className="tree-name" onClick={() => setFolder(f.id, { collapsed: open })} onDoubleClick={() => setRenaming(f.id)} title="Click to open or close, double-click to rename, drag to move">
              {f.name}<small>{countIn(f.id)}</small>
            </button>}
        <span className="tree-actions">
          <button className="icon-btn" title="Upload into this folder" onClick={() => upload(f.id)}>⬆</button>
          <button className="icon-btn" title="New folder inside" onClick={() => newFolder(f.id)}>＋📁</button>
          <button className="icon-btn" title="Rename" onClick={() => setRenaming(f.id)}>✎</button>
          <button className="icon-btn" title="Delete folder" onClick={() => deleteFolder(f)}>🗑</button>
        </span>
      </li>,
    ];
    if (open) {
      for (const sub of folders.filter(x => x.parentId === f.id).sort(byName)) rows.push(...folderRows(sub, depth + 1));
      for (const d of docs.filter(x => x.folderId === f.id).sort(byName)) rows.push(docRow(d, depth + 1));
      if (!folders.some(x => x.parentId === f.id) && !docs.some(x => x.folderId === f.id)) rows.push(<li key={f.id + '-empty'} className="tree-empty" style={{ paddingLeft: 30 + (depth + 1) * 18 }}>Empty. Drag documents or files here.</li>);
    }
    return rows;
  };

  // Documents whose folder was deleted elsewhere show at the top level.
  const known = new Set(folders.map(f => f.id));
  const rootFolders = folders.filter(f => !f.parentId || !known.has(f.parentId)).sort(byName);
  const rootDocs = docs.filter(d => !d.folderId || !known.has(d.folderId)).sort(byName);
  const query = q.trim().toLowerCase();
  const found = query ? docs.filter(d => d.name.toLowerCase().includes(query) || folderPath(folders, d.folderId).toLowerCase().includes(query)).sort(byName) : [];

  return (
    <div className="panel-scroll pad">
      <div className="row gap"><h3 className="h grow">Documents</h3><button className="btn sm primary" onClick={() => upload(undefined)}>⬆ Upload</button></div>
      <input ref={file} type="file" multiple hidden accept=".pdf,.docx,.txt,.md,.markdown,.csv,.rtf,.json,image/*,text/*" onChange={e => {
        if (e.target.files?.length) { importDocs(e.target.files, uploadTo); if (uploadTo) setFolder(uploadTo, { collapsed: false }); }
        e.target.value = '';
      }} />
      {(docs.length > 3 || folders.length > 0) && <input className="search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" />}
      {query ? (
        <ul className="tree scene-tree">
          {found.map(d => docRow(d, 0, true))}
          {!found.length && <li className="tree-empty">No documents match.</li>}
        </ul>
      ) : (
        <div className={'scene-tree' + (over === 'root' ? ' drop' : '')} {...dropProps(undefined)}>
          <div className="row gap tree-bar">
            <button className="btn sm" onClick={() => newFolder()}>＋ Folder</button>
            <button className="btn sm ghost" onClick={() => st.set(d => { d.docFolders.forEach(f => { f.collapsed = true; }); })} disabled={!folders.length}>Collapse all</button>
            <button className="btn sm ghost" onClick={() => st.set(d => { d.docFolders.forEach(f => { f.collapsed = false; }); })} disabled={!folders.length}>Expand all</button>
          </div>
          <ul className="tree">
            {rootFolders.flatMap(f => folderRows(f, 0))}
            {rootDocs.map(d => docRow(d, 0))}
          </ul>
          {!docs.length && !folders.length && (
            <button className="drop-zone" onClick={() => upload(undefined)}>
              <b>Drop files here</b>
              <small>Word (.docx), PDF, text (.txt, .md) or images. You can also drop them anywhere on the screen, or onto a folder.</small>
            </button>
          )}
          {drag && <p className="hint tree-hint">Drop on a folder to move it there, or on empty space for the top level.</p>}
        </div>
      )}
      <p className="hint">Drop files from your computer onto a folder to add them there. Word and text files can be edited when opened.</p>
    </div>
  );
}
