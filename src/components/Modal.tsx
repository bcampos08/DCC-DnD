import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  // One listener for the modal's lifetime. Re-adding it on every render could drop the
  // Escape press when another key handler re-renders the page mid-event.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <div className="modal-scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
