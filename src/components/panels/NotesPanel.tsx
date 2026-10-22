import { useState } from 'react';
import { useCampaign } from '../../store';
import { uid } from '../../lib/id';
import type { Note } from '../../types';

// Encounter and session notes. A note can be tied to a scene so it's easy to find while running it.
export default function NotesPanel() {
  const notes = useCampaign(s => s.notes);
  const scenes = useCampaign(s => s.scenes);
  const activeId = useCampaign(s => s.activeSceneId);
  const [filter, setFilter] = useState<'all' | 'scene'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const st = useCampaign.getState();

  const upd = (id: string, patch: Partial<Note>) => st.set(d => { const n = d.notes.find(n => n.id === id); if (n) Object.assign(n, patch, { updatedAt: Date.now() }); });
  const add = () => {
    const n: Note = { id: uid(), title: '', body: '', sceneId: activeId, updatedAt: Date.now() };
    st.set(d => { d.notes.unshift(n); });
    setOpen(o => new Set(o).add(n.id));
    setFilter('all');
    setQ('');
  };
  const toggle = (id: string) => setOpen(o => { const x = new Set(o); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  const needle = q.trim().toLowerCase();
  const shown = notes.filter(n => (filter === 'all' || n.sceneId === activeId) && (!needle || n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle)));
  const sceneName = (id?: string) => scenes.find(s => s.id === id)?.name;

  return (
    <div className="panel-scroll pad">
      <div className="row gap"><h3 className="h grow">Notes</h3><button className="btn sm primary" onClick={add}>+ New note</button></div>
      <div className="row gap">
        <div className="seg">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'scene' ? 'on' : ''} onClick={() => setFilter('scene')} title={`Notes tied to ${sceneName(activeId)}`}>This scene</button>
        </div>
        <input className="grow" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" />
      </div>
      {!notes.length && <p className="hint">Write encounter plans, NPC names, read-aloud text or reminders. Only you see notes.</p>}
      {!!notes.length && !shown.length && <p className="hint">No notes match.</p>}
      <ul className="note-list">
        {shown.map(n => {
          const isOpen = open.has(n.id);
          return (
            <li key={n.id} className={'note' + (isOpen ? ' open' : '')}>
              <div className="note-head">
                <button className="note-toggle" onClick={() => toggle(n.id)} aria-expanded={isOpen} aria-label={isOpen ? 'Collapse note' : 'Expand note'}>{isOpen ? '▾' : '▸'}</button>
                <input className="note-title" value={n.title} onChange={e => upd(n.id, { title: e.target.value })} placeholder="Untitled note" aria-label="Note title" onFocus={() => !isOpen && toggle(n.id)} />
                {n.sceneId && sceneName(n.sceneId) && <span className="tag">{sceneName(n.sceneId)}</span>}
              </div>
              {!isOpen && n.body && <button className="note-preview" onClick={() => toggle(n.id)}>{n.body.slice(0, 140)}{n.body.length > 140 ? '…' : ''}</button>}
              {isOpen && (
                <>
                  <textarea className="note-body" rows={Math.min(24, Math.max(5, n.body.split('\n').length + 1))} value={n.body} onChange={e => upd(n.id, { body: e.target.value })} placeholder="Write anything…" autoFocus={!n.body && !!n.title} />
                  <div className="row gap">
                    <select value={n.sceneId ?? ''} onChange={e => upd(n.id, { sceneId: e.target.value || undefined })} aria-label="Scene">
                      <option value="">Any scene</option>
                      {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <span className="grow muted sm">Edited {new Date(n.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <button className="btn sm danger" onClick={() => confirm(`Delete “${n.title || 'Untitled note'}”?`) && st.set(d => { d.notes = d.notes.filter(x => x.id !== n.id); })}>Delete</button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
