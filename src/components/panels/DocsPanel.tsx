import { useRef, useState } from 'react';
import { useCampaign } from '../../store';
import { useUI } from '../../ui';
import { importDocs, sizeText } from '../../lib/docs';
import { deleteAsset } from '../../lib/assets';
import type { Doc } from '../../types';

export const DOC_ICON: Record<Doc['kind'], string> = { pdf: '📕', word: '📘', text: '📄', image: '🖼', other: '📦' };

export default function DocsPanel() {
  const docs = useCampaign(s => s.docs) ?? [];
  const [q, setQ] = useState('');
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const st = useCampaign.getState();
  const shown = docs.filter(d => !q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="panel-scroll pad">
      <div className="row gap"><h3 className="h grow">Documents</h3><button className="btn sm primary" onClick={() => file.current?.click()}>⬆ Upload</button></div>
      <input ref={file} type="file" multiple hidden accept=".pdf,.docx,.txt,.md,.markdown,.csv,.rtf,.json,image/*,text/*" onChange={e => { if (e.target.files?.length) importDocs(e.target.files); e.target.value = ''; }} />
      <div className={'drop-zone' + (over ? ' over' : '')}
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); if (e.dataTransfer.files.length) importDocs(e.dataTransfer.files); }}
        onClick={() => file.current?.click()}>
        <b>Drop files here</b>
        <small>Word (.docx), PDF, text (.txt, .md) or images. You can also drop them anywhere on the screen.</small>
      </div>
      {docs.length > 3 && <input className="search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" />}
      <ul className="doc-list">
        {shown.map(d => (
          <li key={d.id}>
            <button className="doc-open" onClick={() => useUI.getState().set({ openDoc: d.id })} title="Open full screen">
              <span className="doc-icon">{DOC_ICON[d.kind]}</span>
              <span className="grow"><b>{d.name}</b><small>{sizeText(d.size)}{d.editedAt ? ' · edited' : ''}{d.kind === 'word' || d.kind === 'text' ? ' · editable' : ''}</small></span>
            </button>
            <button className="icon-btn" title="Rename" onClick={() => { const n = prompt('Document name', d.name); if (n) st.set(x => { const y = x.docs.find(y => y.id === d.id); if (y) y.name = n; }); }}>✎</button>
            <button className="icon-btn" title="Delete" onClick={() => { if (!confirm(`Delete “${d.name}”?`)) return; st.set(x => { x.docs = x.docs.filter(y => y.id !== d.id); }); deleteAsset(d.asset); }}>🗑</button>
          </li>
        ))}
      </ul>
      {!docs.length && <p className="hint">Add session notes, handouts or read-aloud text. Open one to read it full screen; Word and text files can be edited right here.</p>}
    </div>
  );
}
