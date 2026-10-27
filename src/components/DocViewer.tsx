import { useEffect, useRef, useState } from 'react';
import { useCampaign } from '../store';
import { useUI } from '../ui';
import { docUrl, downloadEdited, downloadOriginal } from '../lib/docs';
import { DOC_ICON } from './panels/DocsPanel';

// A document open full screen over the DM screen. Word and text files can be edited; changes save as you type.
export default function DocViewer() {
  const id = useUI(s => s.openDoc);
  const doc = useCampaign(s => s.docs?.find(d => d.id === id));
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(() => { try { return +(localStorage.getItem('dcc.docZoom') ?? '') || 1; } catch { return 1; } });
  const editor = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const close = () => useUI.getState().set({ openDoc: null });

  useEffect(() => {
    if (!doc || (doc.kind !== 'pdf' && doc.kind !== 'image' && doc.kind !== 'other')) { setUrl(null); return; }
    let u: string | null = null;
    docUrl(doc).then(x => { u = x; setUrl(x); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Word: load the contents into the editor once when the document opens (not on every save).
  useEffect(() => { if (doc?.kind === 'word' && editor.current) editor.current.innerHTML = doc.html ?? ''; }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement).closest('[contenteditable],textarea')) close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { try { localStorage.setItem('dcc.docZoom', String(zoom)); } catch { /* ignore */ } }, [zoom]);

  if (!id) return null;
  if (!doc) return null;
  const save = (patch: { html?: string; text?: string }) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => useCampaign.getState().set(d => { const x = d.docs.find(y => y.id === doc.id); if (x) Object.assign(x, patch, { editedAt: Date.now() }); }), 400);
  };
  const cmd = (c: string, v?: string) => { document.execCommand(c, false, v); editor.current?.focus(); save({ html: editor.current?.innerHTML ?? '' }); };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  return (
    <div className="doc-viewer" role="dialog" aria-label={doc.name}>
      <header className="dv-head">
        <span className="dv-title">{DOC_ICON[doc.kind]} {doc.name}</span>
        {(doc.kind === 'word' || doc.kind === 'text') && (
          <span className="row gap">
            <button className="btn sm" onClick={() => setZoom(z => Math.max(0.7, +(z - 0.1).toFixed(1)))} title="Smaller text">A−</button>
            <button className="btn sm" onClick={() => setZoom(z => Math.min(2.2, +(z + 0.1).toFixed(1)))} title="Bigger text">A+</button>
          </span>
        )}
        <span className="grow" />
        {doc.editedAt && <small className="muted">Saved {new Date(doc.editedAt).toLocaleTimeString([], { timeStyle: 'short' })}</small>}
        {(doc.kind === 'word' || doc.kind === 'text') && <button className="btn sm" onClick={() => downloadEdited(doc)} title={doc.kind === 'word' ? 'Download with your edits as a Word-compatible .doc' : 'Download with your edits'}>⬇ {doc.kind === 'word' ? 'Download for Word' : 'Download'}</button>}
        <button className="btn sm ghost" onClick={() => downloadOriginal(doc)}>Original</button>
        <button className="btn sm" onClick={fullscreen} title="Browser full screen">⛶</button>
        <button className="btn sm primary" onClick={close}>✕ Back to map</button>
      </header>

      {doc.kind === 'word' && (
        <div className="dv-toolbar">
          {([['bold', 'B', 'Bold'], ['italic', 'I', 'Italic'], ['underline', 'U', 'Underline']] as const).map(([c, l, t]) => <button key={c} className={'btn sm tb-' + c} onMouseDown={e => { e.preventDefault(); cmd(c); }} title={t}>{l}</button>)}
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('formatBlock', 'H1'); }}>Heading</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('formatBlock', 'H2'); }}>Subheading</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('formatBlock', 'P'); }}>Text</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('insertUnorderedList'); }}>• List</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('insertOrderedList'); }}>1. List</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('hiliteColor', '#fde68a'); }} title="Highlight">🖍</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('removeFormat'); }} title="Clear formatting">⌫ fmt</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('undo'); }} title="Undo">↶</button>
          <button className="btn sm" onMouseDown={e => { e.preventDefault(); cmd('redo'); }} title="Redo">↷</button>
        </div>
      )}

      <div className="dv-body">
        {doc.kind === 'pdf' && url && <iframe className="dv-frame" src={url} title={doc.name} />}
        {doc.kind === 'image' && url && <div className="dv-image"><img src={url} alt={doc.name} /></div>}
        {doc.kind === 'word' && (
          <div className="dv-page" style={{ fontSize: `${zoom * 1.12}rem` }}>
            <div ref={editor} className="dv-rich" contentEditable suppressContentEditableWarning spellCheck onInput={e => save({ html: (e.target as HTMLDivElement).innerHTML })} />
          </div>
        )}
        {doc.kind === 'text' && (
          <div className="dv-page" style={{ fontSize: `${zoom * 1.05}rem` }}>
            <textarea key={doc.id} className="dv-text" defaultValue={doc.text ?? ''} spellCheck onChange={e => save({ text: e.target.value })} />
          </div>
        )}
        {doc.kind === 'other' && (
          <div className="dv-empty"><p>This kind of file can't be shown here.</p><button className="btn primary" onClick={() => downloadOriginal(doc)}>Download it</button>
            <p className="hint">Old .doc files: open them in Word and save as .docx, then drop them in again.</p></div>
        )}
      </div>
    </div>
  );
}
