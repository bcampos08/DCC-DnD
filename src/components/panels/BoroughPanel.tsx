import { useState } from 'react';
import { useCampaign } from '../../store';
import { useUI } from '../../ui';
import { ROOM_LABEL, roomId, roomVisible, setRoomShown } from '../../lib/borough';
import type { BoroughRoom, Scene } from '../../types';

// Controls for a dungeon map scene: which neighborhoods players can see, stairwells,
// and every keyed location with its reveal switch.
export default function BoroughPanel({ scene }: { scene: Scene }) {
  const b = scene.borough!;
  const preview = useUI(s => s.boroughPreview);
  const [openHood, setOpenHood] = useState<string | null>(null);
  const st = useCampaign.getState();
  const upd = (fn: (s: Scene) => void) => st.updateScene(scene.id, fn);
  const setHood = (id: string, on: boolean) => upd(s => { const x = s.borough!; x.shownHoods = on ? [...new Set([...x.shownHoods, id])] : x.shownHoods.filter(h => h !== id); });
  const setRoom = (r: BoroughRoom, on: boolean) => upd(s => { setRoomShown(s.borough!, r, on); });

  // Centre your view on a room and open its card.
  const goTo = (r: BoroughRoom) => {
    const ui = useUI.getState();
    const cam = ui.camera[scene.id] ?? { x: 0, y: 0, scale: 1 };
    const scale = Math.max(cam.scale, 0.6);
    const S = scene.grid.size, cx = (r.x + r.w / 2) * S, cy = (r.y + r.h / 2) * S;
    ui.set({ selectedRoom: roomId(r), camera: { ...ui.camera, [scene.id]: { scale, x: ui.viewport.w / 2 - cx * scale, y: ui.viewport.h / 2 - cy * scale } } });
  };

  const keyed = b.rooms.filter(r => r.key);
  const stairs = keyed.filter(r => r.type === 'stairs');
  const revealedCount = b.revealed.length;

  return (
    <div className="borough-panel">
      <div className="row gap"><h3 className="h grow">Dungeon map</h3>
        <label className="check" title="See the map exactly as players see it"><input type="checkbox" checked={preview} onChange={e => useUI.getState().set({ boroughPreview: e.target.checked })} /> Player view</label>
      </div>
      <p className="hint">Players see corridors, saferooms, tutorial guilds and bathrooms in unlocked neighborhoods. Click any room on the map to read its notes or reveal it.</p>

      <h4 className="sb-h">Neighborhoods players can see</h4>
      <ul className="bp-list">
        {Object.entries(b.hoods).map(([id, h]) => {
          const on = b.shownHoods.includes(id);
          return (
            <li key={id} className={on ? 'on' : ''}>
              <label className="check grow"><input type="checkbox" checked={on} onChange={e => setHood(id, e.target.checked)} /> <b>{id}</b> {h.name} <small className="muted">{h.kind}</small></label>
              <button className="icon-btn" title="Neighborhood notes" onClick={() => setOpenHood(openHood === id ? null : id)} aria-expanded={openHood === id}>{openHood === id ? '▾' : 'ℹ'}</button>
              {openHood === id && (
                <div className="bp-hood">
                  {h.mob && <p><b>Mob:</b> {h.mob}</p>}
                  {h.feel && <p><b>Feel:</b> {h.feel}</p>}
                  {h.travel && <p><b>Crossing:</b> {h.travel}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!!stairs.length && (
        <>
          <h4 className="sb-h">Stairwells</h4>
          <div className="row gap wrap">
            {stairs.map(r => {
              const on = roomVisible(b, r);
              return <button key={roomId(r)} className={'btn sm' + (on ? ' on' : '')} onClick={() => setRoom(r, !on)} title={b.notes[r.key!]?.name}>{on ? '👁' : '🙈'} {r.key}</button>;
            })}
            <button className="btn sm" onClick={() => upd(s => { for (const r of s.borough!.rooms) if (r.type === 'stairs') setRoomShown(s.borough!, r, true); })}>Reveal both</button>
          </div>
          <p className="hint">Hidden until you reveal them (B9's tower reveals both).</p>
        </>
      )}

      <h4 className="sb-h">Keyed locations <small className="muted">({revealedCount} revealed)</small></h4>
      {Object.entries(b.hoods).concat([['X', { name: 'Thoroughfares', kind: '', origin: [0, 0] }]]).map(([id, h]) => {
        const list = keyed.filter(r => r.hood === id);
        if (!list.length) return null;
        return (
          <details key={id} className="bp-group" open={id !== 'X'}>
            <summary>{h.name}</summary>
            <ul className="bp-keys">
              {list.map(r => {
                const on = roomVisible(b, r);
                return (
                  <li key={roomId(r)}>
                    <button className="bp-go" onClick={() => goTo(r)} title="Show on the map and open its notes">
                      <span className={`bp-type t-${r.type}`}>{r.key}</span>
                      <span className="grow">{b.notes[r.key!]?.name ?? ROOM_LABEL[r.type]}</span>
                    </button>
                    <button className={'icon-btn' + (on ? ' on' : '')} onClick={() => setRoom(r, !on)} title={on ? 'Players can see it. Click to hide.' : 'Hidden from players. Click to reveal.'}>{on ? '👁' : '🙈'}</button>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
      {revealedCount > 0 && <button className="btn sm ghost" onClick={() => { if (confirm('Hide every room you revealed on this map?')) upd(s => { s.borough!.revealed = []; }); }}>Hide all revealed rooms</button>}
    </div>
  );
}
