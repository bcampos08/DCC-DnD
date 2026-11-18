import { Shape } from 'react-konva';
import type { Borough, BoroughCorridor, BoroughRoom } from '../types';
import { asSeen, roomId, roomShow, roomVisible } from '../lib/borough';

// Draws a borough (neighborhoods, thoroughfares, corridors, rooms) straight from its data, styled
// after the handoff SVG. On the DM screen, things players can't see are marked; the table copy
// already has them removed (see tableBorough).

const PAL: Record<string, { bg: string; fill: string }> = {
  residential: { bg: '#f4ead2', fill: '#efdfbd' },
  city: { bg: '#e9e5df', fill: '#d8d2c8' },
  industrial: { bg: '#e6e0d2', fill: '#cfc5b0' },
  park: { bg: '#e2ebcd', fill: '#e9e3c6' },
};
const palOf = (kind: string) => {
  const k = kind.toLowerCase();
  return k.includes('resid') ? PAL.residential : k.includes('city') || k.includes('block') ? PAL.city : k.includes('indus') ? PAL.industrial : k.includes('park') || k.includes('civic') ? PAL.park : PAL.residential;
};
const ROOM: Record<string, [string, string]> = {
  boss: ['#f4cfc8', '#a3271c'], safe: ['#cfe8c6', '#2f6e2b'], guild: ['#d8d3f3', '#3f3794'], stairs: ['#f6de86', '#8a6200'],
  lair: ['#f7d7b0', '#a5541a'], feature: ['#f2ebbd', '#7d6d14'], wc: ['#d2ecf1', '#2b7586'],
};
// [outer colour, outer width, inner colour, inner width] in squares
const CORR: Record<BoroughCorridor['kind'], [string, number, string, number]> = {
  hall: ['#3b3226', 0.42, '#f7f0de', 0.24],
  path: ['#b39a6c', 0.4, '#ece2c2', 0.26],
  rail: ['#5a4d3b', 0.3, '#8c7b62', 0.12],
  culvert: ['#2b5f7a', 0.42, '#9cc8dc', 0.24],
  bridge: ['#6b4a14', 0.5, '#c9a25a', 0.32],
};

export default function BoroughMap({ b, S, dm, selected, preview }: { b: Borough; S: number; dm: boolean; selected?: string | null; preview?: boolean }) {
  return (
    <Shape listening={false} perfectDrawEnabled={false} sceneFunc={kctx => {
      const c = kctx._context as CanvasRenderingContext2D;
      draw(c, b, S, dm && !preview, dm && !!preview, selected ?? null);
    }} />
  );
}

function draw(c: CanvasRenderingContext2D, b: Borough, S: number, dm: boolean, preview: boolean, selected: string | null) {
  const W = b.cols * S, H = b.rows * S, hs = b.hoodSize * S;
  const shown = new Set(b.shownHoods);
  const playerView = !dm; // table, or DM previewing what players see
  const visible = (r: BoroughRoom) => (preview ? roomVisible(b, r) : true); // the table copy is already filtered
  const hoodOpen = (h: string) => !(h in b.hoods) || shown.has(h);
  c.save();
  // ground and thoroughfares
  c.fillStyle = '#ddd2b8'; c.fillRect(0, 0, W, H);
  for (const [id, h] of Object.entries(b.hoods)) {
    const locked = playerView && !hoodOpen(id);
    c.fillStyle = locked ? '#16130f' : palOf(h.kind).bg;
    c.fillRect(h.origin[0] * S, h.origin[1] * S, hs, hs);
  }
  // dashed centre lines down the thoroughfares
  c.strokeStyle = 'rgba(90,77,59,.45)'; c.lineWidth = Math.max(1, S * 0.06); c.setLineDash([S * 0.5, S * 0.35]);
  const runs = bandRuns(b.bands);
  c.beginPath();
  for (const [a, z] of runs) { const m = ((a + z + 1) / 2) * S; c.moveTo(m, 0); c.lineTo(m, H); c.moveTo(0, m); c.lineTo(W, m); }
  c.stroke(); c.setLineDash([]);

  // park trees, then water
  for (const f of b.features) if (f.t === 'tree' && featureOpen(b, f.x, f.y, playerView, shown)) {
    c.beginPath(); c.arc(f.x * S, f.y * S, Math.max(f.r * S, S * 0.12), 0, Math.PI * 2); c.fillStyle = '#a9c48a'; c.fill(); c.strokeStyle = '#6f8f52'; c.lineWidth = S * 0.04; c.stroke();
  }
  for (const f of b.features) if ((f.t === 'water' || f.t === 'island') && featureOpen(b, f.x, f.y, playerView, shown)) {
    c.beginPath(); c.ellipse(f.x * S, f.y * S, f.rx * S, f.ry * S, 0, 0, Math.PI * 2);
    c.fillStyle = f.t === 'water' ? '#b9d6e3' : '#d8e6b8'; c.fill();
    c.strokeStyle = f.t === 'water' ? '#4f7f96' : '#6b7d3a'; c.lineWidth = S * 0.1; c.stroke();
    if (f.t === 'water') { // a few ripples
      c.strokeStyle = 'rgba(79,127,150,.35)'; c.lineWidth = S * 0.06;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(f.x * S, (f.y + i * f.ry * 0.3) * S, f.rx * S * (0.85 - Math.abs(i) * 0.15), S * 0.12, 0, 0, Math.PI); c.stroke(); }
    }
  }

  // corridors: outlines first, then fills, so crossings join cleanly
  const corrs = b.corridors.filter(k => !preview || hoodOpen(k.hood));
  const doorLinks: { k: BoroughCorridor['kind']; pts: number[] }[] = [];
  for (const r of b.rooms) {
    if (!r.door || !visible(r) || (preview && !hoodOpen(r.hood))) continue;
    const [dx, dy] = r.door;
    const cx = (dx + 0.5) * S, cy = (dy + 0.5) * S;
    const ex = r.side === 'E' ? (r.x + r.w) * S : r.side === 'W' ? r.x * S : cx;
    const ey = r.side === 'S' ? (r.y + r.h) * S : r.side === 'N' ? r.y * S : cy;
    const kind = corrs.find(k => k.squares.some(p => p[0] === dx && p[1] === dy))?.kind ?? 'hall';
    doorLinks.push({ k: kind, pts: [cx, cy, ex, ey] });
  }
  const line = (pts: number[]) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); };
  const centres = (k: BoroughCorridor) => k.squares.flatMap(([x, y]) => [(x + 0.5) * S, (y + 0.5) * S]);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const pass of [0, 1] as const) {
    for (const k of corrs) {
      const st = CORR[k.kind] ?? CORR.hall;
      c.strokeStyle = pass ? st[2] : st[0]; c.lineWidth = (pass ? st[3] : st[1]) * S;
      line(centres(k));
    }
    for (const dl of doorLinks) { const st = CORR[dl.k]; c.strokeStyle = pass ? st[2] : st[0]; c.lineWidth = (pass ? st[3] : st[1]) * S * 0.8; line(dl.pts); }
  }
  // rail ties
  c.strokeStyle = '#5a4d3b'; c.lineWidth = S * 0.06;
  for (const k of corrs) if (k.kind === 'rail') {
    for (const [x, y] of k.squares) for (const o of [0.25, 0.75]) {
      const horiz = k.squares.some(p => p[1] === y && Math.abs(p[0] - x) === 1);
      c.beginPath();
      if (horiz) { c.moveTo((x + o) * S, (y + 0.25) * S); c.lineTo((x + o) * S, (y + 0.75) * S); } else { c.moveTo((x + 0.25) * S, (y + o) * S); c.lineTo((x + 0.75) * S, (y + o) * S); }
      c.stroke();
    }
  }

  // rooms
  for (const r0 of b.rooms) {
    if (preview && (!hoodOpen(r0.hood) || !roomVisible(b, r0))) continue;
    const r = preview ? asSeen(b, r0) : r0; // player view: shown-as-a-building rooms look ordinary
    const hidden = dm && !roomVisible(b, r);
    const [fill, stroke] = r.type === 'filler' ? [palOf(b.hoods[r.hood]?.kind ?? '').fill, '#5a4d3b'] : ROOM[r.type] ?? ROOM.feature;
    const x = r.x * S, y = r.y * S, w = r.w * S, h = r.h * S, inset = S * 0.08;
    c.globalAlpha = hidden ? 0.55 : 1;
    c.fillStyle = fill; c.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
    c.strokeStyle = stroke; c.lineWidth = S * (r.type === 'filler' ? 0.07 : 0.12);
    if (hidden) c.setLineDash([S * 0.25, S * 0.15]);
    c.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
    c.setLineDash([]);
    if (r.type === 'stairs') { // hatching
      c.save(); c.beginPath(); c.rect(x + inset, y + inset, w - inset * 2, h - inset * 2); c.clip();
      c.strokeStyle = 'rgba(138,98,0,.5)'; c.lineWidth = S * 0.05; c.beginPath();
      for (let i = -h; i < w; i += S * 0.3) { c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); }
      c.stroke(); c.restore();
    }
    if (r.type === 'filler' && r.w * r.h >= 6) { // big buildings get a roof line
      c.strokeStyle = 'rgba(90,77,59,.35)'; c.lineWidth = S * 0.04; c.beginPath();
      if (r.w >= r.h) { c.moveTo(x + inset, y + h / 2); c.lineTo(x + w - inset, y + h / 2); } else { c.moveTo(x + w / 2, y + inset); c.lineTo(x + w / 2, y + h - inset); }
      c.stroke();
    }
    // labels
    const label = r.type === 'wc' ? 'WC' : r.key;
    if (label) {
      const fs = Math.min(S * (r.type === 'wc' ? 0.38 : 0.6), (w / Math.max(2, label.length)) * 1.3);
      c.font = `bold ${fs}px "DejaVu Sans", "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = stroke;
      if (r.type === 'boss' && r.h >= 3 && dm) {
        c.fillText(`☠ ${label}`, x + w / 2, y + h / 2 - S * 0.5);
        const n = b.notes[r.key!]?.name;
        if (n) { c.font = `bold ${S * 0.38}px "DejaVu Sans", sans-serif`; fitText(c, n.split(' — ').slice(-1)[0], x + w / 2, y + h / 2 + S * 0.35, w - S * 0.6); }
      } else c.fillText(r.type === 'boss' ? `☠ ${label}` : label, x + w / 2, y + h / 2);
    }
    if (dm) {
      // Your markers: 🏠 players see it as an ordinary building; ⚔ it has a battle scene.
      const badge = (txt: string, bx: number, bg: string) => {
        const bs = Math.min(S * 0.9, w * 0.45);
        c.globalAlpha = 1; c.fillStyle = bg; c.beginPath(); c.arc(bx, y + bs * 0.55, bs * 0.5, 0, Math.PI * 2); c.fill();
        c.font = `${bs * 0.6}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(txt, bx, y + bs * 0.58);
      };
      if (roomShow(b, r) === 'plain') badge('🏠', x + Math.min(S * 0.55, w * 0.3), 'rgba(122,96,56,.92)');
      if (b.links?.[roomId(r)]) badge('⚔', x + w - Math.min(S * 0.55, w * 0.3), 'rgba(163,39,28,.92)');
    }
    if (selected === roomId(r)) { c.strokeStyle = '#3b82f6'; c.lineWidth = S * 0.18; c.strokeRect(x - S * 0.05, y - S * 0.05, w + S * 0.1, h + S * 0.1); }
    c.globalAlpha = 1;
  }

  // locked neighborhoods on the DM screen: hatched
  if (dm) for (const [id, h] of Object.entries(b.hoods)) if (!shown.has(id)) {
    const x = h.origin[0] * S, y = h.origin[1] * S;
    c.save(); c.beginPath(); c.rect(x, y, hs, hs); c.clip();
    c.fillStyle = 'rgba(20,16,12,.08)'; c.fillRect(x, y, hs, hs);
    c.strokeStyle = 'rgba(20,16,12,.09)'; c.lineWidth = S * 0.2; c.beginPath();
    for (let i = -hs; i < hs; i += S * 3) { c.moveTo(x + i, y + hs); c.lineTo(x + i + hs, y); }
    c.stroke();
    // a small tag in the corner, so the map underneath stays readable
    const tag = '🔒 Locked for players', fs = S * 0.75;
    c.font = `bold ${fs}px "DejaVu Sans", sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
    const tw = c.measureText(tag).width;
    c.fillStyle = 'rgba(90,29,20,.85)'; c.fillRect(x + S * 0.4, y + S * 0.4, tw + S * 0.8, fs * 1.6);
    c.fillStyle = '#fff'; c.fillText(tag, x + S * 0.8, y + S * 0.4 + fs * 0.8);
    c.restore();
  }

  // street and neighborhood names
  const labels = b.features.filter(f => f.t === 'label');
  const named = labels.length ? labels : Object.values(b.hoods).map(h => ({ t: 'label' as const, x: h.origin[0] + b.hoodSize / 2, y: h.origin[1] < b.rows / 2 ? 1 : b.rows - 1, rot: 0, text: `${h.name} · ${h.kind}`.toUpperCase() }));
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const f of named) {
    if (f.t !== 'label') continue;
    c.save(); c.translate(f.x * S, f.y * S); c.rotate((f.rot * Math.PI) / 180);
    c.font = `bold ${S * 0.8}px "DejaVu Sans", sans-serif`;
    if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${S * 0.12}px`;
    c.lineWidth = S * 0.3; c.strokeStyle = '#ddd2b8'; c.strokeText(f.text, 0, 0);
    c.fillStyle = '#4a3f30'; c.fillText(f.text, 0, 0);
    c.restore();
  }
  // party start
  for (const f of b.features) if (f.t === 'start' && featureOpen(b, f.x, f.y, playerView, shown)) star(c, f.x * S, f.y * S, S * 0.75);
  // outer frame
  c.strokeStyle = '#3b3226'; c.lineWidth = S * 0.12; c.strokeRect(0, 0, W, H);
  c.restore();
}

function featureOpen(b: Borough, x: number, y: number, playerView: boolean, shown: Set<string>) {
  if (!playerView) return true;
  for (const [id, h] of Object.entries(b.hoods)) if (x >= h.origin[0] && x < h.origin[0] + b.hoodSize && y >= h.origin[1] && y < h.origin[1] + b.hoodSize) return shown.has(id);
  return true;
}

// Consecutive thoroughfare rows/columns: [first, last].
function bandRuns(bands: number[]): [number, number][] {
  const s = [...bands].sort((a, b) => a - b); const out: [number, number][] = [];
  for (const v of s) { const last = out[out.length - 1]; if (last && v === last[1] + 1) last[1] = v; else out.push([v, v]); }
  return out;
}

function fitText(c: CanvasRenderingContext2D, t: string, x: number, y: number, max: number) {
  let txt = t;
  while (txt.length > 3 && c.measureText(txt).width > max) txt = txt.slice(0, -2);
  c.fillText(txt === t ? t : txt + '…', x, y);
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = '#e0218a'; c.fill(); c.strokeStyle = '#5c0b37'; c.lineWidth = r * 0.12; c.stroke();
}
