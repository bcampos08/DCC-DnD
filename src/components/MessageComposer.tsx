import { useEffect, useRef, useState } from 'react';
import { useCampaign } from '../store';
import { sendMessage } from '../lib/messages';

const NONE: never[] = [];
// Top-bar button that opens a box for texting the players' screen, as any character you like.
export default function MessageComposer() {
  const [open, setOpen] = useState(false);
  const senders = useCampaign(s => s.messageSenders) ?? NONE;
  const messages = useCampaign(s => s.messages) ?? NONE;
  const hidden = useCampaign(s => !!s.messagesHidden);
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const [adding, setAdding] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const st = useCampaign.getState();
  const sender = senders.includes(from) ? from : senders[0] ?? '';

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', down); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); };
  }, [open]);

  const addSender = () => {
    const n = adding.trim();
    if (!n) return;
    if (!senders.includes(n)) st.set(d => { d.messageSenders = [...(d.messageSenders ?? []), n]; });
    setFrom(n); setAdding('');
  };
  const send = () => {
    if (!sender || !text.trim()) return;
    sendMessage(sender, text);
    setText('');
  };

  return (
    <div className="msg-wrap" ref={box}>
      <button className={'btn sm' + (open ? ' on' : '')} onClick={() => setOpen(!open)} title="Send a text message to the players' screen">💬 Message</button>
      {open && (
        <div className="msg-pop">
          <div className="row gap"><b className="grow">Text the table</b>
            <label className="check" title="Show the message thread on the players' screen"><input type="checkbox" checked={!hidden} onChange={e => st.set(d => { d.messagesHidden = !e.target.checked; })} /> On TV</label>
          </div>
          <div className="msg-senders">
            {senders.map(n => (
              <span key={n} className={'msg-sender' + (n === sender ? ' on' : '')}>
                <button onClick={() => setFrom(n)}>{n}</button>
                <button className="x" title={`Remove ${n} from the list`} onClick={() => st.set(d => { d.messageSenders = (d.messageSenders ?? []).filter(x => x !== n); })}>✕</button>
              </span>
            ))}
            <form className="msg-add" onSubmit={e => { e.preventDefault(); addSender(); }}>
              <input value={adding} onChange={e => setAdding(e.target.value)} placeholder={senders.length ? 'Add a name' : 'Who is texting? Add a name'} aria-label="Add a sender name" />
              <button className="btn sm" disabled={!adding.trim()}>Add</button>
            </form>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} autoFocus placeholder={sender ? `Message from ${sender}… (Enter sends, Shift+Enter for a new line)` : 'Add a sender name first'}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Message" />
          <div className="row gap">
            <span className="muted sm grow">{sender ? <>From <b>{sender}</b></> : 'Pick who it’s from'}</span>
            <button className="btn sm primary" disabled={!sender || !text.trim()} onClick={send}>Send ➤</button>
          </div>
          {!!messages.length && (
            <div className="msg-history">
              <div className="row gap"><small className="muted grow">Sent ({messages.length}) · the TV shows the latest 8</small>
                <button className="btn sm ghost" onClick={() => { if (confirm('Clear all messages from the players’ screen?')) st.set(d => { d.messages = []; }); }}>Clear all</button>
              </div>
              <ul>
                {messages.slice(-12).reverse().map(m => (
                  <li key={m.id}>
                    <b>{m.from}</b> <span className="grow">{m.text}</span>
                    <button className="icon-btn" title="Delete this message" onClick={() => st.set(d => { d.messages = (d.messages ?? []).filter(x => x.id !== m.id); })}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
