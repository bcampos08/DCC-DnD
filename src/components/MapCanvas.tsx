import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KImage, Rect, Shape, Line, Circle, Group, Text, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { AreaTemplate, Camera, Drawing, FogOp, Scene, Token } from '../types';
import { useImage } from '../lib/useImage';
import { COND } from '../lib/rules';
import { cubeRect, gridFeet, snapCentre, snapCorner, templateCells, CONE_HALF } from '../lib/geometry';
import type { Measure, Ping } from '../lib/sync';
import type { Tool } from '../ui';

export interface CreatureLook { name: string; hp: number; maxHp: number; tempHp: number; conditions: string[]; concentrating: boolean; portrait?: string; ac?: number; deathSaves?: { success: number; fail: number } }

interface Props {
  mode: 'dm' | 'table';
  scene: Scene;
  width: number;
  height: number;
  camera: Camera;
  onCamera: (c: Camera) => void;
  creature: (t: Token) => CreatureLook;
  activeTokenIds: Set<string>;
  showNames: (t: Token) => boolean;
  measure?: Measure | null;
  pings?: Ping[];
  // DM only
  tool?: Tool;
  selected?: string[];
  selectedTemplate?: string | null;
  diagonal?: '5' | '5-10';
  drawStyle?: { color: string; width: number; fill: boolean; dmOnly: boolean; brush: number; tplColor: string };
  onSelect?: (ids: string[], additive: boolean) => void;
  onSelectTemplate?: (id: string | null) => void;
  onMoveTokens?: (moves: { id: string; x: number; y: number }[]) => void;
  onFog?: (op: FogOp) => void;
  onDraw?: (d: Drawing) => void;
  onRemoveDrawing?: (id: string) => void;
  onTemplate?: (t: AreaTemplate) => void;
  onMoveTemplate?: (id: string, x: number, y: number) => void;
  onRemoveTemplate?: (id: string) => void;
  onGridAlign?: (x: number, y: number, w: number, h: number) => void;
  onMeasure?: (m: Measure | null) => void;
  onPing?: (x: number, y: number) => void;
  onTokenDblClick?: (id: string) => void;
  onAskText?: (x: number, y: number) => void;
  vision?: { x: number; y: number; r: number }[] | null; // dark scenes: current sight circles
}

type Draft =
  | { k: 'pan'; sx: number; sy: number; cx: number; cy: number; moved: boolean }
  | { k: 'box'; x0: number; y0: number; x1: number; y1: number }
  | { k: 'measure'; x0: number; y0: number; x1: number; y1: number }
  | { k: 'fogrect'; mode: 'reveal' | 'hide'; x0: number; y0: number; x1: number; y1: number }
  | { k: 'brush'; mode: 'reveal' | 'hide'; pts: number[] }
  | { k: 'pen'; pts: number[] }
  | { k: 'shape'; t: 'line' | 'rect' | 'circle'; x0: number; y0: number; x1: number; y1: number }
  | { k: 'tpl'; t: AreaTemplate }
  | { k: 'align'; x0: number; y0: number; x1: number; y1: number };

export default function MapCanvas(p: Props) {
  const { scene, mode, camera } = p;
  const g = scene.grid;
  const mapImg = useImage(scene.map?.src);
  const W = scene.map?.width ?? 30 * g.size;
  const H = scene.map?.height ?? 20 * g.size;
  const stageRef = useRef<Konva.Stage>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const dragStart = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [dragPos, setDragPos] = useState<Map<string, { x: number; y: number }> | null>(null);
  const dm = mode === 'dm';
  const tool = p.tool ?? 'select';
  const space = useRef(false);

  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement).closest('input,textarea')) space.current = e.type === 'keydown'; };
    window.addEventListener('keydown', d); window.addEventListener('keyup', d);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', d); };
  }, []);

  const toMap = () => {
    const pos = stageRef.current!.getPointerPosition()!;
    return { x: (pos.x - camera.x) / camera.scale, y: (pos.y - camera.y) / camera.scale };
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const pos = stageRef.current!.getPointerPosition()!;
    const k = Math.exp(-e.evt.deltaY * (e.evt.ctrlKey ? 0.01 : 0.0015));
    const scale = Math.min(6, Math.max(0.08, camera.scale * k));
    const mx = (pos.x - camera.x) / camera.scale, my = (pos.y - camera.y) / camera.scale;
    p.onCamera({ scale, x: pos.x - mx * scale, y: pos.y - my * scale });
  };

  const onDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const btn = 'button' in e.evt ? e.evt.button : 0;
    const shift = 'shiftKey' in e.evt && e.evt.shiftKey;
    const onEmpty = e.target === e.target.getStage() || e.target.name() === 'bg' || e.target.name() === 'mapimg';
    const pos = stageRef.current!.getPointerPosition()!;
    if (!dm || btn === 1 || btn === 2 || space.current) {
      setDraft({ k: 'pan', sx: pos.x, sy: pos.y, cx: camera.x, cy: camera.y, moved: false });
      return;
    }
    const m = toMap();
    if (tool === 'select') {
      if (!onEmpty) return;
      if (shift) setDraft({ k: 'box', x0: m.x, y0: m.y, x1: m.x, y1: m.y });
      else setDraft({ k: 'pan', sx: pos.x, sy: pos.y, cx: camera.x, cy: camera.y, moved: false });
      return;
    }
    if (tool === 'ruler') {
      const c = snapCentre(m.x, m.y, 1, g);
      setDraft({ k: 'measure', x0: c.x, y0: c.y, x1: c.x, y1: c.y });
    } else if (tool === 'fog-reveal-rect' || tool === 'fog-hide-rect') {
      const c = g.snap ? snapCorner(m.x, m.y, g) : m;
      setDraft({ k: 'fogrect', mode: tool === 'fog-reveal-rect' ? 'reveal' : 'hide', x0: c.x, y0: c.y, x1: c.x, y1: c.y });
    } else if (tool === 'fog-reveal-brush' || tool === 'fog-hide-brush') {
      setDraft({ k: 'brush', mode: tool === 'fog-reveal-brush' ? 'reveal' : 'hide', pts: [m.x, m.y, m.x + 0.1, m.y] });
    } else if (tool === 'pen') {
      setDraft({ k: 'pen', pts: [m.x, m.y] });
    } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      setDraft({ k: 'shape', t: tool, x0: m.x, y0: m.y, x1: m.x, y1: m.y });
    } else if (tool === 'text') {
      p.onAskText?.(m.x, m.y);
    } else if (tool === 'ping') {
      p.onPing?.(m.x, m.y);
    } else if (tool === 'grid-align') {
      setDraft({ k: 'align', x0: m.x, y0: m.y, x1: m.x, y1: m.y });
    } else if (tool.startsWith('tpl-')) {
      const shape = tool.slice(4) as AreaTemplate['shape'];
      const o = shape === 'cone' || shape === 'line' ? (g.snap ? snapCorner(m.x, m.y, g) : m) : g.snap ? snapCorner(m.x, m.y, g) : m;
      setDraft({ k: 'tpl', t: { id: Math.random().toString(36).slice(2), shape, x: o.x, y: o.y, angle: 0, feet: g.feet, color: p.drawStyle?.tplColor ?? '#f97316' } });
    }
  };

  const onMove = () => {
    if (!draft) return;
    const pos = stageRef.current!.getPointerPosition();
    if (!pos) return;
    const m = toMap();
    switch (draft.k) {
      case 'pan': {
        const dx = pos.x - draft.sx, dy = pos.y - draft.sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) draft.moved = true;
        p.onCamera({ ...camera, x: draft.cx + dx, y: draft.cy + dy });
        return;
      }
      case 'measure': {
        const c = snapCentre(m.x, m.y, 1, g);
        const nd = { ...draft, x1: c.x, y1: c.y };
        setDraft(nd);
        p.onMeasure?.({ ax: nd.x0, ay: nd.y0, bx: nd.x1, by: nd.y1, feet: gridFeet(nd.x0, nd.y0, nd.x1, nd.y1, g, p.diagonal ?? '5') });
        return;
      }
      case 'fogrect': case 'align': case 'box': case 'shape': {
        const c = draft.k === 'fogrect' && g.snap ? snapCorner(m.x, m.y, g) : m;
        setDraft({ ...draft, x1: c.x, y1: c.y });
        return;
      }
      case 'brush': case 'pen': {
        const pts = draft.pts;
        const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (Math.hypot(m.x - lx, m.y - ly) > 3 / camera.scale) setDraft({ ...draft, pts: [...pts, m.x, m.y] });
        return;
      }
      case 'tpl': {
        const t = draft.t;
        const dx = m.x - t.x, dy = m.y - t.y;
        const dist = Math.hypot(dx, dy);
        const sq = Math.max(1, Math.round(dist / g.size));
        setDraft({ k: 'tpl', t: { ...t, angle: dist > 2 ? Math.atan2(dy, dx) : t.angle, feet: sq * g.feet } });
        return;
      }
    }
  };

  const onUp = () => {
    const d = draft;
    setDraft(null);
    if (!d) return;
    switch (d.k) {
      case 'pan': if (!d.moved && dm && tool === 'select') { p.onSelect?.([], false); p.onSelectTemplate?.(null); } return;
      case 'measure': p.onMeasure?.(null); return;
      case 'box': {
        const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
        p.onSelect?.(scene.tokens.filter(t => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h).map(t => t.id), true);
        return;
      }
      case 'fogrect': {
        const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
        if (w > 2 && h > 2) p.onFog?.({ t: 'rect', mode: d.mode, x, y, w, h });
        return;
      }
      case 'brush': p.onFog?.({ t: 'brush', mode: d.mode, r: (p.drawStyle?.brush ?? 1.5) * g.size, pts: d.pts }); return;
      case 'pen': if (d.pts.length > 4) p.onDraw?.({ id: uidLocal(), t: 'pen', pts: d.pts, color: p.drawStyle!.color, width: p.drawStyle!.width, dmOnly: p.drawStyle!.dmOnly }); return;
      case 'shape': {
        const s = p.drawStyle!;
        if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) < 4) return;
        if (d.t === 'line') p.onDraw?.({ id: uidLocal(), t: 'line', pts: [d.x0, d.y0, d.x1, d.y1], color: s.color, width: s.width, dmOnly: s.dmOnly });
        if (d.t === 'rect') p.onDraw?.({ id: uidLocal(), t: 'rect', x: Math.min(d.x0, d.x1), y: Math.min(d.y0, d.y1), w: Math.abs(d.x1 - d.x0), h: Math.abs(d.y1 - d.y0), color: s.color, width: s.width, fill: s.fill, dmOnly: s.dmOnly });
        if (d.t === 'circle') p.onDraw?.({ id: uidLocal(), t: 'circle', x: d.x0, y: d.y0, r: Math.hypot(d.x1 - d.x0, d.y1 - d.y0), color: s.color, width: s.width, fill: s.fill, dmOnly: s.dmOnly });
        return;
      }
      case 'tpl': p.onTemplate?.(d.t); return;
      case 'align': {
        const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
        if (w > 8 && h > 8) p.onGridAlign?.(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), w, h);
        return;
      }
    }
  };

  // ----- token dragging (DM) -----
  const onTokenDragStart = (t: Token) => {
    const ids = p.selected?.includes(t.id) ? p.selected : [t.id];
    if (!p.selected?.includes(t.id)) p.onSelect?.([t.id], false);
    dragStart.current = new Map(scene.tokens.filter(x => ids.includes(x.id)).map(x => [x.id, { x: x.x, y: x.y }]));
  };
  const onTokenDragMove = (t: Token, e: Konva.KonvaEventObject<DragEvent>) => {
    const s = dragStart.current.get(t.id);
    if (!s) return;
    const dx = e.target.x() - s.x, dy = e.target.y() - s.y;
    const next = new Map<string, { x: number; y: number }>();
    dragStart.current.forEach((v, k) => next.set(k, { x: v.x + dx, y: v.y + dy }));
    setDragPos(next);
    const sc = snapCentre(e.target.x(), e.target.y(), t.size, g);
    const allHidden = scene.tokens.filter(x => dragStart.current.has(x.id)).every(x => x.hidden);
    p.onMeasure?.({ ax: s.x, ay: s.y, bx: sc.x, by: sc.y, feet: gridFeet(s.x, s.y, sc.x, sc.y, g, p.diagonal ?? '5'), dmOnly: allHidden });
  };
  const onTokenDragEnd = (t: Token, e: Konva.KonvaEventObject<DragEvent>) => {
    const s = dragStart.current.get(t.id);
    if (!s) return;
    const dx = e.target.x() - s.x, dy = e.target.y() - s.y;
    const moves: { id: string; x: number; y: number }[] = [];
    dragStart.current.forEach((v, k) => {
      const tok = scene.tokens.find(x => x.id === k)!;
      let nx = v.x + dx, ny = v.y + dy;
      if (g.snap) ({ x: nx, y: ny } = snapCentre(nx, ny, tok.size, g));
      moves.push({ id: k, x: nx, y: ny });
    });
    p.onMoveTokens?.(moves);
    setDragPos(null);
    p.onMeasure?.(null);
    dragStart.current.clear();
  };

  const draggingTokens = tool === 'select' && dm;
  const sel = new Set(p.selected ?? []);
  const visibleDrawings = scene.drawings;
  const tokensSorted = useMemo(() => [...scene.tokens].sort((a, b) => b.size - a.size), [scene.tokens]);
  const measure = draft?.k === 'measure' ? null : p.measure;

  return (
    <Stage
      ref={stageRef}
      width={p.width}
      height={p.height}
      x={camera.x}
      y={camera.y}
      scaleX={camera.scale}
      scaleY={camera.scale}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={() => draft && (draft.k === 'pan' || draft.k === 'measure') && onUp()}
      onTouchStart={onDown}
      onTouchMove={onMove}
      onTouchEnd={onUp}
      onContextMenu={e => e.evt.preventDefault()}
      style={{ cursor: cursorFor(tool, dm, draft) }}
    >
      <Layer>
        <Rect name="bg" x={-20000} y={-20000} width={40000} height={40000} fill={mode === 'table' ? '#000' : '#14110f'} />
        {mapImg ? <KImage name="mapimg" image={mapImg} width={W} height={H} /> : <Rect name="mapimg" width={W} height={H} fill="#e8dcc0" />}
        {g.show && (
          <Shape
            listening={false}
            sceneFunc={ctx => {
              ctx.beginPath();
              const x0 = ((g.offsetX % g.size) + g.size) % g.size, y0 = ((g.offsetY % g.size) + g.size) % g.size;
              for (let x = x0; x <= W; x += g.size) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
              for (let y = y0; y <= H; y += g.size) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
              ctx.strokeStyle = g.color; ctx.globalAlpha = g.opacity; ctx.lineWidth = 1.5 / Math.max(camera.scale, 0.5);
              ctx.stroke();
            }}
          />
        )}
      </Layer>

      <Layer>
        {visibleDrawings.map(d => <DrawingNode key={d.id} d={d} erase={dm && tool === 'erase'} onRemove={() => p.onRemoveDrawing?.(d.id)} />)}
        {scene.templates.map(t => (
          <TemplateNode key={t.id} t={t} scene={scene} W={W} H={H} dm={dm} tool={tool} selected={p.selectedTemplate === t.id}
            onSelect={() => p.onSelectTemplate?.(t.id)} onMove={(x, y) => p.onMoveTemplate?.(t.id, x, y)} onRemove={() => p.onRemoveTemplate?.(t.id)} />
        ))}
        {draft?.k === 'tpl' && <TemplateNode t={draft.t} scene={scene} W={W} H={H} dm={dm} tool={tool} selected preview />}
        {draft?.k === 'pen' && <Line points={draft.pts} stroke={p.drawStyle!.color} strokeWidth={p.drawStyle!.width} lineCap="round" lineJoin="round" tension={0.3} listening={false} />}
        {draft?.k === 'shape' && draft.t === 'line' && <Line points={[draft.x0, draft.y0, draft.x1, draft.y1]} stroke={p.drawStyle!.color} strokeWidth={p.drawStyle!.width} lineCap="round" listening={false} />}
        {draft?.k === 'shape' && draft.t === 'rect' && <Rect x={Math.min(draft.x0, draft.x1)} y={Math.min(draft.y0, draft.y1)} width={Math.abs(draft.x1 - draft.x0)} height={Math.abs(draft.y1 - draft.y0)} stroke={p.drawStyle!.color} strokeWidth={p.drawStyle!.width} fill={p.drawStyle!.fill ? p.drawStyle!.color + '55' : undefined} listening={false} />}
        {draft?.k === 'shape' && draft.t === 'circle' && <Circle x={draft.x0} y={draft.y0} radius={Math.hypot(draft.x1 - draft.x0, draft.y1 - draft.y0)} stroke={p.drawStyle!.color} strokeWidth={p.drawStyle!.width} fill={p.drawStyle!.fill ? p.drawStyle!.color + '55' : undefined} listening={false} />}
      </Layer>

      <Layer>
        {tokensSorted.map(t => {
          const dp = dragPos?.get(t.id);
          return (
            <TokenNode key={t.id} t={t} g={scene.grid.size} c={p.creature(t)} dm={dm} selected={sel.has(t.id)} active={p.activeTokenIds.has(t.id)}
              showName={p.showNames(t)} draggable={draggingTokens} x={dp?.x ?? t.x} y={dp?.y ?? t.y}
              onDown={e => { if (dm && tool === 'select') { e.cancelBubble = true; const add = 'shiftKey' in e.evt && e.evt.shiftKey; if (add || !sel.has(t.id)) p.onSelect?.([t.id], add); } }}
              onDragStart={() => onTokenDragStart(t)} onDragMove={e => onTokenDragMove(t, e)} onDragEnd={e => onTokenDragEnd(t, e)}
              onDbl={() => p.onTokenDblClick?.(t.id)} />
          );
        })}
      </Layer>

      {scene.fog.enabled && p.vision && (
        // Explored but not currently seen: dimmed. Clear only inside current sight or areas the DM revealed by hand.
        <Layer listening={false} opacity={dm ? 0.3 : 0.62}>
          <FogShape ops={scene.fog.ops.filter(o => !o.auto)} cut={p.vision} />
        </Layer>
      )}
      {scene.fog.enabled && (
        <Layer listening={false} opacity={dm ? 0.5 : 1}>
          <FogShape ops={draft?.k === 'brush' ? [...scene.fog.ops, { t: 'brush', mode: draft.mode, r: (p.drawStyle?.brush ?? 1.5) * g.size, pts: draft.pts }] : scene.fog.ops} />
        </Layer>
      )}

      <Layer listening={false}>
        {draft?.k === 'fogrect' && <Rect x={Math.min(draft.x0, draft.x1)} y={Math.min(draft.y0, draft.y1)} width={Math.abs(draft.x1 - draft.x0)} height={Math.abs(draft.y1 - draft.y0)} stroke={draft.mode === 'reveal' ? '#fde68a' : '#94a3b8'} dash={[10, 6]} strokeWidth={3 / camera.scale} fill={draft.mode === 'reveal' ? 'rgba(253,230,138,.15)' : 'rgba(0,0,0,.35)'} />}
        {draft?.k === 'brush' && dm && null}
        {draft?.k === 'box' && <Rect x={Math.min(draft.x0, draft.x1)} y={Math.min(draft.y0, draft.y1)} width={Math.abs(draft.x1 - draft.x0)} height={Math.abs(draft.y1 - draft.y0)} stroke="#60a5fa" dash={[8, 5]} strokeWidth={2 / camera.scale} fill="rgba(96,165,250,.12)" />}
        {draft?.k === 'align' && <Rect x={Math.min(draft.x0, draft.x1)} y={Math.min(draft.y0, draft.y1)} width={Math.abs(draft.x1 - draft.x0)} height={Math.abs(draft.y1 - draft.y0)} stroke="#22d3ee" strokeWidth={2 / camera.scale} fill="rgba(34,211,238,.15)" />}
        {draft?.k === 'measure' && <MeasureNode m={{ ax: draft.x0, ay: draft.y0, bx: draft.x1, by: draft.y1, feet: gridFeet(draft.x0, draft.y0, draft.x1, draft.y1, g, p.diagonal ?? '5') }} scale={camera.scale} />}
        {measure && <MeasureNode m={measure} scale={camera.scale} />}
        {(p.pings ?? []).map(pg => <PingNode key={pg.at} p={pg} scale={camera.scale} />)}
      </Layer>
    </Stage>
  );
}

let localN = 0;
const uidLocal = () => Date.now().toString(36) + (localN++).toString(36);

function cursorFor(tool: Tool, dm: boolean, draft: Draft | null) {
  if (draft?.k === 'pan') return 'grabbing';
  if (!dm) return 'grab';
  if (tool === 'select') return 'default';
  if (tool === 'erase') return 'not-allowed';
  if (tool === 'text') return 'text';
  return 'crosshair';
}

// ---------- tokens ----------
function TokenNode(props: {
  t: Token; g: number; c: CreatureLook; dm: boolean; selected: boolean; active: boolean; showName: boolean; draggable: boolean; x: number; y: number;
  onDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart: () => void; onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void; onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void; onDbl: () => void;
}) {
  const { t, g, c, dm } = props;
  const img = useImage(t.image || c.portrait);
  const r = (Math.max(t.size, 0.5) * g) / 2 * 0.9;
  const isPc = t.kind === 'pc';
  const ds = c.deathSaves ?? { success: 0, fail: 0 };
  // Monsters die at 0 HP; players are dying until they fail three death saves.
  const down = c.maxHp > 0 && c.hp <= 0;
  const dead = down && (!isPc || ds.fail >= 3);
  const dying = down && isPc && !dead;
  const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 1;
  const barColor = frac > 0.5 ? '#22c55e' : frac > 0.25 ? '#eab308' : '#ef4444';
  const label = t.kind === 'monster' ? (t.name.match(/(\d+)$/)?.[1] ?? initials(t.name)) : initials(t.name);
  const fontSize = Math.max(10, r * 0.75);

  // Concentration and conditions sit evenly spaced in a ring on the token's edge.
  const ring: { key: string; text: string; color: string }[] = [
    ...(c.concentrating ? [{ key: 'conc', text: 'C', color: '#7c3aed' }] : []),
    ...c.conditions.map(id => ({ key: id, text: COND[id]?.short ?? id.slice(0, 2), color: COND[id]?.color ?? '#555' })),
  ];
  const crMax = Math.max(8, g * 0.14);
  const R = r + crMax * 0.3;
  const cr = ring.length ? Math.min(crMax, (Math.PI * R / ring.length) * 0.92) : 0;
  const below = r + (ring.length ? cr * 0.9 : 0) + 4; // first free spot under the token
  const barH = Math.max(6, g * 0.1);
  const acR = Math.max(8, r * 0.3);

  return (
    <Group x={props.x} y={props.y} draggable={props.draggable} opacity={dm && t.hidden ? 0.45 : 1}
      onMouseDown={props.onDown} onTouchStart={props.onDown} onDragStart={props.onDragStart} onDragMove={props.onDragMove} onDragEnd={props.onDragEnd} onDblClick={props.onDbl} onDblTap={props.onDbl}>
      {props.active && <Circle radius={r + 9} stroke="#fbbf24" strokeWidth={6} shadowColor="#fbbf24" shadowBlur={20} />}
      <Circle radius={r + 2} fill="rgba(0,0,0,.45)" offsetY={-3} />
      <Circle radius={r} fill={t.color} stroke={props.selected ? '#60a5fa' : isPc ? '#e5e7eb' : '#111'} strokeWidth={props.selected ? 5 : 3} dash={dm && t.hidden ? [6, 4] : undefined} />
      {img ? (
        <Group clipFunc={ctx => { ctx.arc(0, 0, r - 2, 0, Math.PI * 2); }}>
          <KImage image={img} x={-r} y={-r} width={r * 2} height={r * 2} />
        </Group>
      ) : (
        <Text text={label} fontSize={fontSize} fontStyle="bold" fill="#fff" width={r * 2} height={r * 2} x={-r} y={-r - (c.ac ? r * 0.18 : 0)} align="center" verticalAlign="middle" listening={false} />
      )}
      {img && t.kind === 'monster' && /\d+$/.test(t.name) && (
        <Group x={-r * 0.62} y={r * 0.62}><Circle radius={Math.max(9, r * 0.3)} fill="#111" stroke="#fff" strokeWidth={1.5} /><Text text={label} fontSize={Math.max(10, r * 0.32)} fill="#fff" fontStyle="bold" x={-20} y={-Math.max(10, r * 0.32) / 2} width={40} align="center" /></Group>
      )}
      {(dead || dying) && <Circle radius={r} fill={dead ? 'rgba(20,20,20,.6)' : 'rgba(60,10,10,.45)'} listening={false} />}
      {dead && (
        <Group listening={false}>
          <Line points={[-r * 0.6, -r * 0.6, r * 0.6, r * 0.6]} stroke="#ef4444" strokeWidth={Math.max(3, r * 0.15)} lineCap="round" />
          <Line points={[r * 0.6, -r * 0.6, -r * 0.6, r * 0.6]} stroke="#ef4444" strokeWidth={Math.max(3, r * 0.15)} lineCap="round" />
        </Group>
      )}
      {!!c.ac && !dead && (
        <Group y={r * 0.58} listening={false}>
          <Line points={[-acR, -acR * 0.9, acR, -acR * 0.9, acR, -acR * 0.1, 0, acR, -acR, -acR * 0.1]} closed fill="#1e293b" stroke="#e2e8f0" strokeWidth={1.5} />
          <Text text={String(c.ac)} fontSize={acR * 1.05} fill="#fff" fontStyle="bold" width={acR * 3} x={-acR * 1.5} y={-acR * 0.62} align="center" />
        </Group>
      )}
      {c.maxHp > 0 && !down && (
        <Group y={below} listening={false}>
          <Rect x={-r} width={r * 2} height={barH} fill="#111" cornerRadius={3} stroke="#000" strokeWidth={1} />
          <Rect x={-r} width={r * 2 * frac} height={barH} fill={barColor} cornerRadius={3} />
          {c.tempHp > 0 && <Rect x={-r} y={-3} width={r * 2 * Math.min(1, c.tempHp / c.maxHp)} height={3} fill="#38bdf8" />}
        </Group>
      )}
      {dying && (
        <Group y={below + 6} listening={false}>
          <Rect x={-Math.max(r, 40)} y={-8} width={Math.max(r, 40) * 2} height={16} fill="rgba(0,0,0,.75)" cornerRadius={8} />
          {[0, 1, 2].map(i => <Circle key={'s' + i} x={-34 + i * 11} radius={4.5} fill={i < ds.success ? '#22c55e' : 'transparent'} stroke="#22c55e" strokeWidth={1.5} />)}
          {[0, 1, 2].map(i => <Circle key={'f' + i} x={12 + i * 11} radius={4.5} fill={i < ds.fail ? '#ef4444' : 'transparent'} stroke="#ef4444" strokeWidth={1.5} />)}
        </Group>
      )}
      {ring.map((it, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length;
        return (
          <Group key={it.key} x={Math.cos(a) * R} y={Math.sin(a) * R} listening={false}>
            <Circle radius={cr} fill={it.color} stroke="#fff" strokeWidth={1.5} />
            <Text text={it.text} fontSize={cr * (it.text.length > 1 ? 1.0 : 1.2)} fill="#fff" fontStyle="bold" width={cr * 2} x={-cr} y={-cr * 0.5} align="center" />
          </Group>
        );
      })}
      {props.showName && (
        <Group y={below + (dying ? 18 : c.maxHp > 0 ? barH + 3 : 0)} listening={false}>
          <Text text={t.name} fontSize={Math.max(11, g * 0.2)} fill="#fff" stroke="#000" strokeWidth={0.6} fontStyle="bold" width={g * 4} x={-g * 2} align="center" shadowColor="#000" shadowBlur={4} />
        </Group>
      )}
    </Group>
  );
}
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

// ---------- fog ----------
function FogShape({ ops, cut }: { ops: FogOp[]; cut?: { x: number; y: number; r: number }[] }) {
  return (
    <Shape
      sceneFunc={ctx => {
        const c = ctx._context;
        c.save();
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#000';
        c.fillRect(-20000, -20000, 40000, 40000);
        for (const op of ops) {
          c.globalCompositeOperation = op.mode === 'reveal' ? 'destination-out' : 'source-over';
          c.fillStyle = '#000'; c.strokeStyle = '#000';
          if (op.t === 'all') c.fillRect(-20000, -20000, 40000, 40000);
          else if (op.t === 'rect') c.fillRect(op.x, op.y, op.w, op.h);
          else if (op.t === 'brush') {
            c.lineWidth = op.r * 2; c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(op.pts[0], op.pts[1]);
            for (let i = 2; i < op.pts.length; i += 2) c.lineTo(op.pts[i], op.pts[i + 1]);
            c.stroke();
          }
        }
        if (cut?.length) {
          c.globalCompositeOperation = 'destination-out';
          for (const v of cut) { c.beginPath(); c.arc(v.x, v.y, v.r, 0, Math.PI * 2); c.fill(); }
        }
        c.restore();
      }}
    />
  );
}

// ---------- drawings ----------
function DrawingNode({ d, erase, onRemove }: { d: Drawing; erase: boolean; onRemove: () => void }) {
  const common = { onClick: erase ? onRemove : undefined, onTap: erase ? onRemove : undefined, listening: erase, dash: d.dmOnly ? [10, 6] : undefined, hitStrokeWidth: 16 };
  if (d.t === 'pen') return <Line {...common} points={d.pts} stroke={d.color} strokeWidth={d.width} lineCap="round" lineJoin="round" tension={0.3} />;
  if (d.t === 'line') return <Line {...common} points={d.pts} stroke={d.color} strokeWidth={d.width} lineCap="round" />;
  if (d.t === 'rect') return <Rect {...common} x={d.x} y={d.y} width={d.w} height={d.h} stroke={d.color} strokeWidth={d.width} fill={d.fill ? d.color + '55' : undefined} />;
  if (d.t === 'circle') return <Circle {...common} x={d.x} y={d.y} radius={d.r} stroke={d.color} strokeWidth={d.width} fill={d.fill ? d.color + '55' : undefined} />;
  return <Text onClick={erase ? onRemove : undefined} listening={erase} x={d.x} y={d.y} text={d.text} fontSize={d.size} fill={d.color} fontStyle="bold" stroke="#000" strokeWidth={d.size / 30} opacity={d.dmOnly ? 0.7 : 1} />;
}

// ---------- templates ----------
function TemplateNode({ t, scene, W, H, dm, tool, selected, preview, onSelect, onMove, onRemove }: {
  t: AreaTemplate; scene: Scene; W: number; H: number; dm: boolean; tool: Tool; selected?: boolean; preview?: boolean;
  onSelect?: () => void; onMove?: (x: number, y: number) => void; onRemove?: () => void;
}) {
  const g = scene.grid;
  const L = (t.feet / g.feet) * g.size;
  const cells = useMemo(() => templateCells(t, g, W, H), [t, g, W, H]);
  const fill = t.color + '33';
  let shape: React.ReactNode = null;
  if (t.shape === 'circle') shape = <Circle radius={L} stroke={t.color} strokeWidth={3} fill={fill} />;
  else if (t.shape === 'cone') {
    const a1 = t.angle - CONE_HALF, a2 = t.angle + CONE_HALF, l = L / Math.cos(CONE_HALF);
    shape = <Line points={[0, 0, Math.cos(a1) * l, Math.sin(a1) * l, Math.cos(a2) * l, Math.sin(a2) * l]} closed stroke={t.color} strokeWidth={3} fill={fill} />;
  } else if (t.shape === 'line') {
    shape = <Rect x={0} y={-g.size / 2} width={L} height={g.size} rotation={(t.angle * 180) / Math.PI} stroke={t.color} strokeWidth={3} fill={fill} />;
  } else if (t.shape === 'cube') {
    const q = cubeRect(t, g);
    shape = <Rect x={q.x - t.x} y={q.y - t.y} width={q.w} height={q.h} stroke={t.color} strokeWidth={3} fill={fill} />;
  }
  const canDrag = dm && tool === 'select' && !preview;
  return (
    <>
      {cells.map(([c, r]) => <Rect key={c + ',' + r} listening={false} x={c * g.size + g.offsetX} y={r * g.size + g.offsetY} width={g.size} height={g.size} fill={t.color} opacity={0.22} />)}
      <Group x={t.x} y={t.y} draggable={canDrag} listening={dm && !preview && (tool === 'select' || tool === 'erase')}
        onMouseDown={e => { if (tool === 'select') { e.cancelBubble = true; onSelect?.(); } }}
        onClick={() => tool === 'erase' && onRemove?.()}
        onDblClick={() => onRemove?.()}
        onDragEnd={e => { const s = g.snap ? snapCorner(e.target.x(), e.target.y(), g) : { x: e.target.x(), y: e.target.y() }; e.target.position({ x: t.x, y: t.y }); onMove?.(s.x, s.y); }}>
        {shape}
        <Circle radius={6} fill={t.color} stroke={selected ? '#fff' : '#000'} strokeWidth={2} />
        <Text text={`${t.feet} ft`} fontSize={Math.max(14, g.size * 0.28)} fill="#fff" stroke="#000" strokeWidth={0.8} fontStyle="bold" x={10} y={-26} />
      </Group>
    </>
  );
}

// ---------- measure + ping ----------
function MeasureNode({ m, scale }: { m: Measure; scale: number }) {
  const fs = 18 / Math.min(scale, 1.4);
  return (
    <Group>
      <Arrow points={[m.ax, m.ay, m.bx, m.by]} stroke="#fde047" fill="#fde047" strokeWidth={4 / Math.min(scale, 1.4)} pointerLength={14 / scale} pointerWidth={14 / scale} dash={[12, 6]} shadowColor="#000" shadowBlur={6} />
      <Circle x={m.ax} y={m.ay} radius={6 / scale} fill="#fde047" />
      <Group x={m.bx + 14 / scale} y={m.by - 30 / scale}>
        <Rect width={fs * 4} height={fs * 1.5} fill="rgba(0,0,0,.8)" cornerRadius={6} />
        <Text text={`${m.feet} ft`} fontSize={fs} fill="#fde047" fontStyle="bold" width={fs * 4} height={fs * 1.5} align="center" verticalAlign="middle" />
      </Group>
    </Group>
  );
}

function PingNode({ p, scale }: { p: Ping; scale: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { tick(x => x + 1); if (Date.now() - p.at < 2000) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [p.at]);
  const age = (Date.now() - p.at) / 2000;
  if (age >= 1) return null;
  return (
    <Group x={p.x} y={p.y}>
      {[0, 0.33, 0.66].map(o => {
        const k = (age * 1.5 + o) % 1;
        return <Circle key={o} radius={(10 + k * 90) / scale} stroke="#f472b6" strokeWidth={5 / scale} opacity={(1 - k) * (1 - age)} />;
      })}
      <Circle radius={8 / scale} fill="#f472b6" opacity={1 - age} />
    </Group>
  );
}
