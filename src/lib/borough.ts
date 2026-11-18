import type { Borough, BoroughFeature, BoroughRoom, BoroughRoomType } from '../types';

// Dungeon maps drawn from data: a borough handoff (JSON of rooms and corridors, plus an optional
// SVG for the pond, trees, start point and street names). See the Floor 2 handoff README.

export const roomId = (r: Pick<BoroughRoom, 'x' | 'y'>) => `${r.x},${r.y}`;

// Players always see corridors and these; anything else only once you reveal it.
export const SHOWN_BY_DEFAULT: BoroughRoomType[] = ['safe', 'guild', 'wc'];

export const ROOM_LABEL: Record<BoroughRoomType, string> = {
  boss: 'Boss chamber', safe: 'Saferoom', guild: 'Tutorial guild', wc: 'Bathroom', stairs: 'Stairwell', lair: 'Mob lair / hazard', feature: 'Loot / feature', filler: 'Building',
};

// Neighborhood that holds a square (thoroughfares belong to none).
export function hoodAt(b: Pick<Borough, 'hoods' | 'hoodSize'>, x: number, y: number): string | null {
  for (const [id, h] of Object.entries(b.hoods)) if (x >= h.origin[0] && x < h.origin[0] + b.hoodSize && y >= h.origin[1] && y < h.origin[1] + b.hoodSize) return id;
  return null;
}

// How players see a room: not at all, as an ordinary building, or as what it really is.
export type RoomShow = 'hidden' | 'plain' | 'full';
export function roomShow(b: Borough, r: BoroughRoom): RoomShow {
  const id = roomId(r);
  if (r.hood in b.hoods && !b.shownHoods.includes(r.hood)) return 'hidden'; // neighborhood still locked
  if (b.plain?.includes(id)) return 'plain';
  if (b.revealed.includes(id)) return 'full';
  return SHOWN_BY_DEFAULT.includes(r.type) && !b.hiddenRooms.includes(id) ? 'full' : 'hidden';
}
export const roomVisible = (b: Borough, r: BoroughRoom) => roomShow(b, r) !== 'hidden';
// A room as players see it: shown-as-a-building rooms lose their type and label.
export const asSeen = (b: Borough, r: BoroughRoom): BoroughRoom => (roomShow(b, r) === 'plain' ? { ...r, type: 'filler', key: undefined } : r);

// What the table screen gets: only unlocked neighborhoods, visible rooms, and no GM notes.
export function tableBorough(b: Borough): Borough {
  const shown = new Set(b.shownHoods);
  const featureShown = (f: BoroughFeature) => f.t === 'label' || (() => { const h = hoodAt(b, Math.floor(f.x), Math.floor(f.y)); return !h || shown.has(h); })();
  return {
    ...b,
    hoods: Object.fromEntries(Object.entries(b.hoods).map(([k, h]) => [k, { name: h.name, kind: h.kind, origin: h.origin }])),
    rooms: b.rooms.filter(r => roomVisible(b, r)).map(r => asSeen(b, r)).map(r => ({ ...r, key: r.type === 'filler' || r.type === 'wc' ? undefined : r.key })),
    corridors: b.corridors.filter(c => !(c.hood in b.hoods) || shown.has(c.hood)),
    features: b.features.filter(featureShown),
    notes: {},
    revealed: [], hiddenRooms: [], plain: [], links: {},
  };
}

// ---------- import ----------
type RawRoom = { hood: string; key?: string; type: BoroughRoomType; x: number; y: number; w: number; h: number; door_corridor_square?: [number, number]; door_side?: 'N' | 'S' | 'E' | 'W' };
type RawData = {
  about?: string;
  neighborhoods: Record<string, { name: string; kind: string; origin: [number, number]; mob?: string; feel?: string; travel?: string }>;
  rooms: RawRoom[];
  corridors: { hood: string; kind: Borough['corridors'][number]['kind']; squares: [number, number][] }[];
  points_of_interest?: Record<string, { name: string; type: string; notes: string }>;
};

export function parseBorough(json: string, svg?: string): Borough {
  const d = JSON.parse(json) as RawData;
  if (!d.rooms || !d.corridors || !d.neighborhoods) throw new Error('This file has no rooms, corridors and neighborhoods. Is it the borough data JSON?');
  const about = d.about ?? '';
  const size = +(about.match(/Grid (\d+)\s*x\s*(\d+)/i)?.[1] ?? 0);
  const maxX = Math.max(...d.rooms.map(r => r.x + r.w), ...d.corridors.flatMap(c => c.squares.map(p => p[0] + 1)));
  const maxY = Math.max(...d.rooms.map(r => r.y + r.h), ...d.corridors.flatMap(c => c.squares.map(p => p[1] + 1)));
  const cols = Math.max(size, maxX + 2), rows = Math.max(+(about.match(/Grid \d+\s*x\s*(\d+)/i)?.[1] ?? 0), maxY + 2);
  const hoodSize = +(about.match(/each (\d+)x\d+/i)?.[1] ?? 40);
  const bandTxt = about.match(/Thoroughfares occupy columns\/rows ([\d\-, ]+)/i)?.[1];
  const bands: number[] = [];
  if (bandTxt) for (const part of bandTxt.split(',')) { const [a, b2] = part.trim().split('-').map(Number); for (let i = a; i <= (b2 ?? a); i++) bands.push(i); }
  else for (let i = 0; i < cols; i++) if (!Object.values(d.neighborhoods).some(h => (i >= h.origin[0] && i < h.origin[0] + hoodSize) || (i >= h.origin[1] && i < h.origin[1] + hoodSize))) bands.push(i);
  const title = (about.split(/\.\s/)[0] || 'Dungeon map').replace(/\.$/, '').replace(/,\s*/, ' — ');
  const b: Borough = {
    title, cols, rows, hoodSize, bands, feet: +(about.match(/1 square\s*=\s*([\d,]+)\s*ft/i)?.[1]?.replace(/,/g, '') ?? 5),
    hoods: Object.fromEntries(Object.entries(d.neighborhoods).map(([k, h]) => [k, { name: h.name, kind: h.kind, origin: h.origin, mob: h.mob, feel: h.feel, travel: h.travel }])),
    rooms: d.rooms.map(r => ({ hood: r.hood, key: r.key || undefined, type: r.type, x: r.x, y: r.y, w: r.w, h: r.h, door: r.door_corridor_square, side: r.door_side })),
    corridors: d.corridors.map(c => ({ hood: c.hood, kind: c.kind, squares: c.squares })),
    features: svg ? svgFeatures(svg, cols, rows) : [],
    notes: d.points_of_interest ?? {},
    shownHoods: [], revealed: [], hiddenRooms: [], plain: [], links: {},
  };
  return b;
}

// Pond, island, trees, the party-start star and street names from the handoff SVG. The map sits in a
// group shifted for the title band; inside it every square is a fixed number of pixels (14).
function svgFeatures(svg: string, cols: number, rows: number): BoroughFeature[] {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const g = [...doc.querySelectorAll('g[transform]')].find(x => /translate\(/.test(x.getAttribute('transform') ?? '') && x.querySelector('rect, path'));
  if (!g) return [];
  const viewW = +(doc.documentElement.getAttribute('viewBox')?.split(/\s+/)[2] ?? 0);
  const [tx] = (g.getAttribute('transform')!.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)/) ?? []).slice(1).map(Number);
  // Pixels per square: the map spans the width minus a margin on each side.
  const px = viewW && tx ? (viewW - 2 * tx) / cols : 14;
  const out: BoroughFeature[] = [];
  const num = (el: Element, a: string) => parseFloat(el.getAttribute(a) ?? '0');
  for (const e of g.querySelectorAll('ellipse')) {
    const fill = e.getAttribute('fill') ?? '';
    if (!fill.startsWith('#')) continue;
    const rgb = [1, 3, 5].map(i => parseInt(fill.slice(i, i + 2), 16));
    out.push({ t: rgb[2] > rgb[0] + 20 ? 'water' : 'island', x: num(e, 'cx') / px, y: num(e, 'cy') / px, rx: num(e, 'rx') / px, ry: num(e, 'ry') / px });
  }
  for (const c of g.querySelectorAll('circle')) {
    const fill = (c.getAttribute('fill') ?? '').toLowerCase();
    if (!fill.startsWith('#')) continue;
    const [r, gg, bl] = [1, 3, 5].map(i => parseInt(fill.slice(i, i + 2), 16));
    if (gg > r && gg > bl) out.push({ t: 'tree', x: num(c, 'cx') / px, y: num(c, 'cy') / px, r: num(c, 'r') / px });
  }
  for (const p of g.querySelectorAll('polygon')) {
    const pts = (p.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number);
    if (pts.length < 10) continue;
    let sx = 0, sy = 0; for (let i = 0; i < pts.length; i += 2) { sx += pts[i]; sy += pts[i + 1]; }
    out.push({ t: 'start', x: sx / (pts.length / 2) / px, y: sy / (pts.length / 2) / px });
  }
  // Street names: upper-case labels that sit on a thoroughfare (not room titles).
  for (const t of g.querySelectorAll('text')) {
    const text = (t.textContent ?? '').trim();
    if (!/^[A-Z][A-Z &·'.\-]{4,}$/.test(text)) continue;
    const x = num(t, 'x') / px, y = num(t, 'y') / px;
    const edge = x < 2 || y < 2 || x > cols - 2 || y > rows - 2 || Math.abs(x - cols / 2) < 1.2 || Math.abs(y - rows / 2) < 1.2;
    if (!edge) continue;
    const rot = +(t.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? 0);
    out.push({ t: 'label', x, y, rot, text });
  }
  return out.filter(f => f.x >= -1 && f.y >= -1 && f.x <= cols + 1 && f.y <= rows + 1);
}

// Reads the handoff: a .zip (with the data JSON and map SVG inside), or the JSON (and SVG) picked together.
export async function readBoroughFiles(files: File[]): Promise<Borough> {
  let json: string | undefined, svg: string | undefined;
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      const { unzipSync, strFromU8 } = await import('fflate');
      const all = unzipSync(new Uint8Array(await f.arrayBuffer()));
      for (const [name, data] of Object.entries(all)) {
        if (/data\.json$/i.test(name) || (!json && /\.json$/i.test(name))) json = strFromU8(data);
        if (/map\.svg$/i.test(name) || (!svg && /\.svg$/i.test(name))) svg = strFromU8(data);
      }
    } else if (/\.json$/i.test(f.name)) json = await f.text();
    else if (/\.svg$/i.test(f.name)) svg = await f.text();
  }
  if (!json) throw new Error('No map data found. Pick the handoff .zip, or the *_data.json file.');
  return parseBorough(json, svg);
}

// Show or hide one room on the players' map.
export function setRoomShow(b: Borough, r: BoroughRoom, show: RoomShow) {
  const id = roomId(r);
  b.revealed = b.revealed.filter(x => x !== id);
  b.hiddenRooms = b.hiddenRooms.filter(x => x !== id);
  b.plain = (b.plain ?? []).filter(x => x !== id);
  const byDefault = SHOWN_BY_DEFAULT.includes(r.type);
  if (show === 'plain') b.plain.push(id);
  else if (show === 'full' && !byDefault) b.revealed.push(id);
  else if (show === 'hidden' && byDefault) b.hiddenRooms.push(id);
}
export const setRoomShown = (b: Borough, r: BoroughRoom, show: boolean) => setRoomShow(b, r, show ? 'full' : 'hidden');
// Next state when clicking a room's reveal button: hidden -> as a building -> revealed -> hidden.
export const nextShow = (s: RoomShow): RoomShow => (s === 'hidden' ? 'plain' : s === 'plain' ? 'full' : 'hidden');
export const SHOW_ICON: Record<RoomShow, string> = { hidden: '🙈', plain: '🏠', full: '👁' };
export const SHOW_TIP: Record<RoomShow, string> = { hidden: 'Hidden from players', plain: 'Players see an ordinary building', full: 'Players see what it really is' };
