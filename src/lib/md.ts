// Small markdown-to-HTML renderer for SRD text: headings, bold/italic, lists, tables, line breaks.
// Text is escaped first, so it's safe to put in innerHTML.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s: string) => esc(s)
  .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1<i>$2</i>')
  .replace(/(^|\W)_(?!\s)(.+?)_(?!\w)/g, '$1<i>$2</i>')
  .replace(/ {2}\n/g, '<br>');

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

export function mdToHtml(src: string, highlight?: string): string {
  const blocks = src.replace(/\r/g, '').split(/\n{2,}/);
  const out: string[] = [];
  for (const raw of blocks) {
    const b = raw.replace(/^\n+|\n+$/g, '');
    if (!b.trim()) continue;
    const lines = b.split('\n');
    const h = /^(#{1,6})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) { const n = Math.min(6, h[1].length + 2); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    if (lines.every(l => l.trim().startsWith('|'))) {
      const isSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
      const sep = lines.findIndex(isSep);
      const head = sep > 0 ? lines.slice(0, sep) : [];
      const body = lines.slice(sep > 0 ? sep + 1 : 0).filter(l => !isSep(l));
      out.push('<table>' + (head.length ? '<thead>' + head.map(r => '<tr>' + cells(r).map(c => `<th>${inline(c)}</th>`).join('') + '</tr>').join('') + '</thead>' : '')
        + '<tbody>' + body.map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (lines.every(l => /^\s*([-*]|\d+\.)\s+/.test(l) || /^\s{2,}\S/.test(l))) {
      const ordered = /^\s*\d+\./.test(lines[0]);
      const items: string[] = [];
      for (const l of lines) { if (/^\s*([-*]|\d+\.)\s+/.test(l)) items.push(l.replace(/^\s*([-*]|\d+\.)\s+/, '')); else items[items.length - 1] += ' ' + l.trim(); }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(i => `<li>${inline(i)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (h) { const n = Math.min(6, h[1].length + 2); out.push(`<h${n}>${inline(h[2])}</h${n}>`); lines.shift(); }
    out.push(`<p>${inline(lines.join('\n')).replace(/\n/g, ' ')}</p>`);
  }
  let html = out.join('');
  if (highlight && highlight.length > 1) {
    const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    html = html.replace(/>([^<]+)</g, (_, t: string) => '>' + t.replace(re, '<mark>$1</mark>') + '<');
  }
  return html;
}
