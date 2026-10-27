import { useCampaign } from '../store';
import { useUI } from '../ui';
import { getAssetBlob, saveAsset } from './assets';
import { uid } from './id';
import type { Doc } from '../types';

// Documents dropped into the Docs tab: PDFs and images are shown as-is; Word and text files
// are also turned into editable content.

export function kindOf(f: { name: string; type: string }): Doc['kind'] {
  const n = f.name.toLowerCase();
  if (f.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.docx') || f.type.includes('wordprocessingml')) return 'word';
  if (f.type.startsWith('text/') || /\.(txt|md|markdown|csv|log|json|rtf)$/.test(n)) return 'text';
  if (f.type.startsWith('image/')) return 'image';
  return 'other';
}

export async function importDocs(files: FileList | File[]) {
  const added: Doc[] = [];
  for (const f of Array.from(files)) {
    try {
      const kind = kindOf(f);
      const doc: Doc = { id: uid(), name: f.name, kind, mime: f.type, size: f.size, asset: await saveAsset(f), addedAt: Date.now() };
      if (kind === 'text') doc.text = await f.text();
      if (kind === 'word') {
        const mammoth = await import('mammoth');
        const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
        doc.html = res.value || '<p></p>';
      }
      added.push(doc);
    } catch {
      useUI.getState().toast(`Couldn't read ${f.name}`);
    }
  }
  if (!added.length) return [];
  useCampaign.getState().set(d => { d.docs = [...added, ...(d.docs ?? [])]; });
  useUI.getState().toast(added.length === 1 ? `Added ${added[0].name}` : `Added ${added.length} documents`);
  return added;
}

export async function docUrl(doc: Doc) {
  const blob = await getAssetBlob(doc.asset);
  return blob ? URL.createObjectURL(blob) : null;
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function downloadOriginal(doc: Doc) {
  const blob = await getAssetBlob(doc.asset);
  if (blob) download(blob, doc.name);
}

const base = (n: string) => n.replace(/\.[^.]+$/, '');

// Edited Word documents download as a Word-compatible .doc (Word opens it with formatting).
export function downloadEdited(doc: Doc) {
  if (doc.kind === 'text') { download(new Blob([doc.text ?? ''], { type: 'text/plain' }), doc.name); return; }
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${base(doc.name)}</title></head><body>${doc.html ?? ''}</body></html>`;
  download(new Blob(['﻿', html], { type: 'application/msword' }), `${base(doc.name)} (edited).doc`);
}

export const sizeText = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
