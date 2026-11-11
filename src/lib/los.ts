import type { Scene } from '../types';

// Line of sight against walls. A wall is a polyline; closed doors block, open doors don't.
export type Seg = [number, number, number, number];

export function wallSegs(scene: Pick<Scene, 'walls'>): Seg[] {
  const out: Seg[] = [];
  for (const w of scene.walls ?? []) {
    if (w.door && w.open) continue;
    for (let i = 0; i + 3 < w.pts.length; i += 2) out.push([w.pts[i], w.pts[i + 1], w.pts[i + 2], w.pts[i + 3]]);
  }
  return out;
}

// Does the straight line from A to B cross a wall? Touching a wall's end doesn't count.
export function blocked(ax: number, ay: number, bx: number, by: number, segs: Seg[]) {
  const rx = bx - ax, ry = by - ay;
  for (const [cx, cy, dx, dy] of segs) {
    const sx = dx - cx, sy = dy - cy;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
    const u = ((cx - ax) * ry - (cy - ay) * rx) / den;
    if (t > 1e-6 && t < 1 - 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) return true;
  }
  return false;
}

// Everything visible from (x, y) out to radius R, as a polygon [x0, y0, x1, y1, ...].
// Rays go to every wall corner (and just either side of it) plus evenly round the circle.
export function visPoly(x: number, y: number, R: number, all: Seg[], steps = 72): number[] {
  const segs = all.filter(s => segDist(x, y, s) < R);
  const angles: number[] = [];
  for (let i = 0; i < steps; i++) angles.push((i / steps) * Math.PI * 2 - Math.PI);
  for (const [ax, ay, bx, by] of segs) {
    for (const [px, py] of [[ax, ay], [bx, by]]) {
      if (Math.hypot(px - x, py - y) > R) continue;
      const a = Math.atan2(py - y, px - x);
      angles.push(a - 1e-4, a, a + 1e-4);
    }
    // where the wall crosses the edge of sight, so the outline follows the circle exactly
    for (const a of circleHits(x, y, R, ax, ay, bx, by)) angles.push(a - 1e-4, a + 1e-4);
  }
  angles.sort((a, b) => a - b);
  const pts: number[] = [];
  for (const a of angles) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = R;
    for (const [cx, cy, ex, ey] of segs) {
      const sx = ex - cx, sy = ey - cy;
      const den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((cx - x) * sy - (cy - y) * sx) / den;
      const u = ((cx - x) * dy - (cy - y) * dx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    pts.push(x + dx * best, y + dy * best);
  }
  return pts;
}

function segDist(px: number, py: number, [ax, ay, bx, by]: Seg) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const k = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
}

function circleHits(x: number, y: number, R: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, fx = ax - x, fy = ay - y;
  const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - R * R;
  const disc = b * b - 4 * a * c;
  if (!a || disc < 0) return [];
  const s = Math.sqrt(disc), out: number[] = [];
  for (const t of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) if (t >= 0 && t <= 1) out.push(Math.atan2(ay + t * dy - y, ax + t * dx - x));
  return out;
}

// Point inside a set of polygons (each a list of rings), even-odd so holes stay holes.
export function inPolys(polys: number[][][], x: number, y: number) {
  let inside = false;
  for (const poly of polys) for (const ring of poly) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
