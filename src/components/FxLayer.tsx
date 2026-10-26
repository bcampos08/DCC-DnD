import { useEffect, useRef } from 'react';
import { Layer, Shape } from 'react-konva';
import type Konva from 'konva';
import type { FogOp, Scene } from '../types';
import { drawFx, type Light } from '../lib/fx/draw';
import { timeline, type FxEvent } from '../lib/fx/core';

// Table screen only: draws running effects every frame. In dark scenes effects only show where
// players can see (current sight, DM-lit areas, or light the effects give off themselves).
export default function FxLayer({ fx, scene, vision, lightsRef, fogLayers, onDone }: {
  fx: FxEvent[];
  scene: Scene;
  vision: { x: number; y: number; r: number }[] | null;
  lightsRef: React.MutableRefObject<Light[]>;
  fogLayers: React.RefObject<Konva.Layer | null>[];
  onDone: (id: string) => void;
}) {
  const layer = useRef<Konva.Layer>(null);
  const live = useRef(fx); live.current = fx;
  const visionRef = useRef(vision); visionRef.current = vision;
  const done = useRef(onDone); done.current = onDone;
  const mask = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!fx.length) return;
    let raf = 0;
    const tick = () => {
      layer.current?.batchDraw();
      if (visionRef.current) fogLayers.forEach(l => l.current?.batchDraw());
      const now = Date.now();
      for (const f of live.current) if (now - f.at > timeline(f).total + 100) done.current(f.id);
      if (live.current.length) raf = requestAnimationFrame(tick);
      else { lightsRef.current = []; fogLayers.forEach(l => l.current?.batchDraw()); layer.current?.batchDraw(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fx.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const W = scene.map?.width ?? 30 * scene.grid.size, H = scene.map?.height ?? 20 * scene.grid.size;

  return (
    <Layer ref={layer} listening={false}>
      <Shape
        sceneFunc={kctx => {
          const c = kctx._context as CanvasRenderingContext2D;
          const now = Date.now();
          const lights: Light[] = [];
          for (const f of live.current) {
            const t = now - f.at;
            if (t < 0 || t > timeline(f).total) continue;
            drawFx(c, f, t, lights);
          }
          const v = visionRef.current;
          lightsRef.current = v ? lights : [];
          if (!v) return;
          // Keep only what players could see: build a visibility mask and cut everything else away.
          const k = Math.min(0.5, 1400 / Math.max(W, H));
          const m = (mask.current ??= document.createElement('canvas'));
          m.width = Math.ceil(W * k); m.height = Math.ceil(H * k);
          const mc = m.getContext('2d')!;
          mc.setTransform(k, 0, 0, k, 0, 0);
          mc.fillStyle = '#fff'; mc.strokeStyle = '#fff';
          for (const op of scene.fog.ops) if (!op.auto) paintOp(mc, op);
          mc.globalCompositeOperation = 'source-over';
          for (const s of [...v, ...lights]) { mc.beginPath(); mc.arc(s.x, s.y, s.r, 0, Math.PI * 2); mc.fill(); }
          c.save();
          c.globalCompositeOperation = 'destination-in';
          c.drawImage(m, 0, 0, W, H);
          c.restore();
        }}
      />
    </Layer>
  );
}

function paintOp(c: CanvasRenderingContext2D, op: FogOp) {
  c.globalCompositeOperation = op.mode === 'reveal' ? 'source-over' : 'destination-out';
  if (op.t === 'all') c.fillRect(-1e5, -1e5, 2e5, 2e5);
  else if (op.t === 'rect') c.fillRect(op.x, op.y, op.w, op.h);
  else {
    c.lineWidth = op.r * 2; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(op.pts[0], op.pts[1]);
    for (let i = 2; i < op.pts.length; i += 2) c.lineTo(op.pts[i], op.pts[i + 1]);
    c.stroke();
  }
}
