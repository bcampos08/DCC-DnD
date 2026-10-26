import { useEffect, useRef, useState } from 'react';
import MapCanvas from '../components/MapCanvas';
import RollCard from '../components/RollCard';
import { channel, send, type LootReveal, type Measure, type Msg, type Ping, type Reveal, type TableState } from '../lib/sync';
import type { Camera, Token } from '../types';
import { fitCamera } from './DMView';
import type { FxEvent } from '../lib/fx/core';
import { COND } from '../lib/rules';
import { RNAME } from '../loot/engine';

// The players' screen: map, revealed fog, tokens with HP bars, turn order, public rolls.
export default function TableView() {
  const [state, setState] = useState<TableState | null>(null);
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [popups, setPopups] = useState<(Reveal | LootReveal)[]>([]);
  const [fx, setFx] = useState<FxEvent[]>([]);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [camera, setCamera] = useState<Camera | null>(null);
  const lastNonce = useRef(-1);
  const lastScene = useRef<string | null>(null);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    document.title = 'Table view';
    const onMsg = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === 'state') setState(m.state);
      if (m.type === 'measure') setMeasure(m.m);
      if (m.type === 'fx') setFx(list => [...list.slice(-30), m.fx]);
      if (m.type === 'ping') setPings(ps => [...ps.filter(p => Date.now() - p.at < 2500), m.p]);
      if (m.type === 'popup') {
        setPopups(ps => [...ps.slice(-3), m.p]);
        setTimeout(() => setPopups(ps => ps.filter(p => p !== m.p)), m.p.kind === 'loot' ? 20000 : 7000);
      }
    };
    channel?.addEventListener('message', onMsg);
    send({ type: 'hello' });
    const bye = () => send({ type: 'bye' });
    window.addEventListener('beforeunload', bye);
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => { channel?.removeEventListener('message', onMsg); window.removeEventListener('beforeunload', bye); window.removeEventListener('resize', onResize); };
  }, []);

  // Hide the cursor and buttons when the mouse rests.
  useEffect(() => {
    let t = 0;
    const wake = () => { setIdle(false); clearTimeout(t); t = window.setTimeout(() => setIdle(true), 2500); };
    window.addEventListener('mousemove', wake);
    wake();
    return () => { window.removeEventListener('mousemove', wake); clearTimeout(t); };
  }, []);

  // Fit to the map when the scene changes, and follow the DM's "send my view".
  useEffect(() => {
    if (!state?.scene) return;
    const sc = state.scene;
    if (lastScene.current !== sc.id || state.cameraNonce !== lastNonce.current || !camera) {
      const sceneChanged = lastScene.current !== sc.id;
      lastScene.current = sc.id;
      const nonceChanged = state.cameraNonce !== lastNonce.current;
      lastNonce.current = state.cameraNonce;
      if (state.camera && nonceChanged && !sceneChanged) {
        const scale = size.w / state.camera.viewW;
        setCamera({ scale, x: size.w / 2 - state.camera.cx * scale, y: size.h / 2 - state.camera.cy * scale });
      } else setCamera(fitCamera(sc, size.w, size.h));
    }
  }, [state, size]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <div className="table-wait"><h1>Table view</h1><p>Waiting for the DM screen… Keep the DM tab open in this same browser.</p></div>;
  if (!state.scene || !camera) return <div className="table-wait"><h1>No scene</h1></div>;

  const chars = new Map(state.chars.map(c => [c.id, c]));
  const creature = (t: Token) => {
    const c = t.charId ? chars.get(t.charId) : undefined;
    if (c) return { name: c.name, hp: c.hp, maxHp: c.maxHp, tempHp: c.tempHp, conditions: c.conditions, concentrating: !!c.concentrating, portrait: c.portrait, ac: c.ac, deathSaves: c.deathSaves };
    // Monster AC is blanked in the players' copy, so no badge shows.
    return { name: t.name, hp: t.hp, maxHp: t.maxHp, tempHp: 0, conditions: t.conditions, concentrating: !!t.concentrating, ac: t.ac };
  };
  const enc = state.encounter;
  const current = enc.active && enc.turn >= 0 ? enc.entries[enc.turn] : undefined;
  const activeIds = new Set(current?.tokenIds ?? []);
  const label = (e: TableState['encounter']['entries'][number]) => (e.charId || state.showMonsterNames ? e.name : 'Enemy');

  return (
    <div className={'table' + (idle ? ' idle' : '')}>
      <MapCanvas mode="table" scene={state.scene} width={size.w} height={size.h} camera={camera} onCamera={setCamera}
        creature={creature} activeTokenIds={activeIds} showNames={t => t.kind === 'pc' || state.showMonsterNames}
        measure={measure} pings={pings} vision={state.vision}
        fx={fx.filter(f => f.sceneId === state.scene!.id)} onFxDone={id => setFx(list => list.filter(f => f.id !== id))} />
      {enc.active && (
        <div className="turn-strip">
          <span className="round">Round {enc.round}</span>
          {enc.entries.map((e, i) => {
            const c = e.charId ? chars.get(e.charId) : undefined;
            return (
              <span key={e.id} className={'turn' + (i === enc.turn ? ' now' : '') + (e.charId ? ' pc' : '')} style={c ? { ['--pc' as string]: c.color } : undefined}>
                {c?.portrait && <img src={c.portrait} alt="" />}{label(e)}
                {c?.conditions.length ? <small>{c.conditions.map(x => COND[x]?.short).join(' ')}</small> : null}
              </span>
            );
          })}
        </div>
      )}
      {current && <div className="now-up">{label(current)}’s turn</div>}
      <div className="table-popups">
        {popups.map(p => p.kind === 'roll'
          ? <div key={p.at} className="popup"><RollCard r={p.roll} big /></div>
          : (
            <div key={p.at} className="popup loot-pop">
              <h3>✨ {p.title}</h3>
              <ul>{p.items.map(it => <li key={it.id}><b>{it.name}{it.q > 1 ? ` ×${it.q}` : ''}</b> <span className={`rar r-${it.rarity}`}>{it.cat === 'coins' ? '' : RNAME[it.rarity as keyof typeof RNAME]}</span></li>)}</ul>
            </div>
          ))}
      </div>
      <div className="table-ctrls">
        <button className="btn sm" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>⛶ Fullscreen</button>
        <button className="btn sm" onClick={() => setCamera(fitCamera(state.scene!, size.w, size.h))}>Fit map</button>
      </div>
    </div>
  );
}
