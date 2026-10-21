import type { AreaTemplate, Grid } from '../types';

export function snapCentre(x: number, y: number, size: number, g: Grid) {
  const s = g.size;
  const step = size < 1 ? s / 2 : s;
  const span = Math.max(size, 0.5) * s;
  const sx = Math.round((x - g.offsetX - span / 2) / step) * step + g.offsetX + span / 2;
  const sy = Math.round((y - g.offsetY - span / 2) / step) * step + g.offsetY + span / 2;
  return { x: sx, y: sy };
}

export function snapCorner(x: number, y: number, g: Grid) {
  return {
    x: Math.round((x - g.offsetX) / g.size) * g.size + g.offsetX,
    y: Math.round((y - g.offsetY) / g.size) * g.size + g.offsetY,
  };
}

export const cellOf = (x: number, y: number, g: Grid) => ({
  c: Math.floor((x - g.offsetX) / g.size),
  r: Math.floor((y - g.offsetY) / g.size),
});

// 5e grid distance between two points, in feet.
export function gridFeet(ax: number, ay: number, bx: number, by: number, g: Grid, rule: '5' | '5-10') {
  const a = cellOf(ax, ay, g), b = cellOf(bx, by, g);
  const dx = Math.abs(a.c - b.c), dy = Math.abs(a.r - b.r);
  const mx = Math.max(dx, dy), mn = Math.min(dx, dy);
  const squares = rule === '5' ? mx : mx + Math.floor(mn / 2);
  return squares * g.feet;
}

export const CONE_HALF = Math.atan(0.5);

// Which grid cells an area template covers (cell centre inside the shape).
export function templateCells(t: AreaTemplate, g: Grid, maxW: number, maxH: number) {
  const L = (t.feet / g.feet) * g.size;
  const cells: [number, number][] = [];
  const ext = L + g.size;
  const c0 = Math.floor((t.x - ext - g.offsetX) / g.size), c1 = Math.ceil((t.x + ext - g.offsetX) / g.size);
  const r0 = Math.floor((t.y - ext - g.offsetY) / g.size), r1 = Math.ceil((t.y + ext - g.offsetY) / g.size);
  const cos = Math.cos(t.angle), sin = Math.sin(t.angle);
  for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
    const cx = (c + 0.5) * g.size + g.offsetX, cy = (r + 0.5) * g.size + g.offsetY;
    if (cx < 0 || cy < 0 || cx > maxW || cy > maxH) continue;
    const dx = cx - t.x, dy = cy - t.y;
    let inside = false;
    if (t.shape === 'circle') inside = Math.hypot(dx, dy) <= L + 0.01;
    else if (t.shape === 'cone') {
      const d = Math.hypot(dx, dy);
      if (d <= L && d > 0) { let a = Math.atan2(dy, dx) - t.angle; a = Math.atan2(Math.sin(a), Math.cos(a)); inside = Math.abs(a) <= CONE_HALF + 0.02; }
    } else if (t.shape === 'line') {
      const along = dx * cos + dy * sin, across = -dx * sin + dy * cos;
      inside = along >= 0 && along <= L && Math.abs(across) <= g.size / 2;
    } else if (t.shape === 'cube') {
      const q = cubeRect(t, g);
      inside = cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h;
    }
    if (inside) cells.push([c, r]);
  }
  return cells;
}

// A cube grows from its origin corner toward the drag direction.
export function cubeRect(t: AreaTemplate, g: Grid) {
  const L = (t.feet / g.feet) * g.size;
  const sx = Math.cos(t.angle) >= 0 ? 1 : -1, sy = Math.sin(t.angle) >= 0 ? 1 : -1;
  return { x: sx > 0 ? t.x : t.x - L, y: sy > 0 ? t.y : t.y - L, w: L, h: L };
}
