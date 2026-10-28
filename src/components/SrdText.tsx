import { useMemo, useState } from 'react';
import { mdToHtml } from '../lib/md';
import { srdItemText, useSrdText, type SrdEntry } from '../lib/srd';
import Modal from './Modal';

// Renders SRD markdown text.
export function SrdBody({ text, highlight, className = '' }: { text: string; highlight?: string; className?: string }) {
  const html = useMemo(() => mdToHtml(text, highlight), [text, highlight]);
  return <div className={'srd-text ' + className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ItemBody({ item, spell }: { item?: SrdEntry; spell?: SrdEntry }) {
  return (
    <>
      {spell && <><h4 className="srd-h">{spell.n}</h4><SrdBody text={spell.d} /></>}
      {item && <>{spell && <h4 className="srd-h">Spell scroll rules</h4>}{item.h && <p className="srd-sub">{item.h}</p>}<SrdBody text={item.d} /></>}
    </>
  );
}

// "Details" toggle under a loot item that shows its full SRD description, when the SRD has one.
export function ItemDetails({ name, refId, cat }: { name: string; refId?: string; cat?: string }) {
  const srd = useSrdText();
  const [open, setOpen] = useState(false);
  const [big, setBig] = useState(false);
  const t = useMemo(() => (srd && cat !== 'coins' ? srdItemText(srd, name, refId, cat) : {}), [srd, name, refId, cat]);
  if (!t.item && !t.spell) return null;
  return (
    <div className="item-details">
      <button className="link-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? '▴ Hide details' : '▾ Details'}</button>
      {open && <button className="link-btn" onClick={() => setBig(true)} title="Read in a larger window">⤢ Larger</button>}
      {open && <div className="item-details-body"><ItemBody {...t} /></div>}
      {big && <Modal title={name} onClose={() => setBig(false)} wide><div className="srd-modal"><ItemBody {...t} /></div></Modal>}
    </div>
  );
}
