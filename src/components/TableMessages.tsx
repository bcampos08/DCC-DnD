import { useEffect, useRef, useState } from 'react';
import type { TableMessage } from '../types';
import { TYPING_MS } from '../lib/messages';

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Players' screen: a phone-style text thread down the left side. New messages show "typing…" first.
export default function TableMessages({ messages }: { messages: TableMessage[] }) {
  const seen = useRef<Set<string> | null>(null);
  const [typing, setTyping] = useState<Map<string, TableMessage>>(new Map());
  const list = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!seen.current) { seen.current = new Set(messages.map(m => m.id)); return; } // already there when the screen opened
    const fresh = messages.filter(m => !seen.current!.has(m.id) && Date.now() - m.at < 15000);
    for (const m of messages) seen.current.add(m.id);
    if (!fresh.length) return;
    setTyping(t => { const n = new Map(t); fresh.forEach(m => n.set(m.id, m)); return n; });
    // Each message finishes "typing" on its own timer, so a newer message doesn't hold up older ones.
    for (const m of fresh) timers.current.push(window.setTimeout(() => setTyping(t => { const n = new Map(t); n.delete(m.id); return n; }), Math.max(300, TYPING_MS - (Date.now() - m.at))));
  }, [messages]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing]);

  if (!messages.length) return null;
  const shown = messages.filter(m => !typing.has(m.id));
  const typers = [...new Set([...typing.values()].map(m => m.from))];
  return (
    <div className="tv-msgs">
      <div className="tv-msgs-head"><span className="dot" /> Messages</div>
      <div className="tv-msgs-list" ref={list}>
        {shown.map((m, i) => {
          const first = i === 0 || shown[i - 1].from !== m.from || m.at - shown[i - 1].at > 5 * 60000;
          return (
            <div key={m.id} className={'tv-msg' + (first ? ' first' : '')} style={{ ['--h' as string]: hue(m.from) }}>
              {first && <div className="tv-msg-from"><span className="av">{m.from.slice(0, 1).toUpperCase()}</span>{m.from}<small>{time(m.at)}</small></div>}
              <div className="bubble">{m.text}</div>
            </div>
          );
        })}
        {typers.map(f => (
          <div key={'typing-' + f} className="tv-msg first" style={{ ['--h' as string]: hue(f) }}>
            <div className="tv-msg-from"><span className="av">{f.slice(0, 1).toUpperCase()}</span>{f}</div>
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
