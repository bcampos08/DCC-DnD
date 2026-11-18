import { useState } from 'react';
import { useCampaign } from '../store';
import { useUI } from '../ui';
import { ROOM_LABEL, SHOW_TIP, roomId, roomShow, setRoomShow, type RoomShow } from '../lib/borough';
import { floorOf } from '../lib/floors';
import { NewScene } from './panels/ScenesPanel';
import type { Scene } from '../types';

// Card for a dungeon-map room: its GM notes, how players see it, and its battle scene.
export default function RoomCard({ scene }: { scene: Scene }) {
  const id = useUI(s => s.selectedRoom);
  const scenes = useCampaign(s => s.scenes);
  const [making, setMaking] = useState(false);
  const b = scene.borough!;
  const r = b.rooms.find(x => roomId(x) === id);
  if (!r) return null;
  const rid = roomId(r);
  const note = r.key ? b.notes[r.key] : undefined;
  const hood = b.hoods[r.hood];
  const hoodOpen = !(r.hood in b.hoods) || b.shownHoods.includes(r.hood);
  const show = roomShow(b, r);
  const st = useCampaign.getState();
  const set = (s: RoomShow) => st.updateScene(scene.id, x => { setRoomShow(x.borough!, r, s); });
  const close = () => useUI.getState().set({ selectedRoom: null });
  const title = `${r.key ? `${r.key} · ` : ''}${note?.name ?? ROOM_LABEL[r.type]}`;
  // Battle scene for this room
  const linked = b.links?.[rid] ? scenes.find(s => s.id === b.links![rid]) : undefined;
  const link = (sceneId: string | null) => st.updateScene(scene.id, x => { const l = (x.borough!.links ??= {}); if (sceneId) l[rid] = sceneId; else delete l[rid]; }, false);
  const open = (sceneId: string) => { st.set(d => { d.activeSceneId = sceneId; }); useUI.getState().set({ selected: [] }); };
  const choices = scenes.filter(s => !s.borough && floorOf(s) === floorOf(scene));
  const plainOk = r.type !== 'filler';

  return (
    <div className="token-card room-card">
      <div className="row gap">
        <b className="grow rc-title">{title}</b>
        <button className="icon-btn" onClick={close} aria-label="Close">✕</button>
      </div>
      <div className="muted sm">{ROOM_LABEL[r.type]} · {hood ? hood.name : 'Thoroughfare'} · {r.w}×{r.h} squares{r.door ? ` · door on the ${{ N: 'north', S: 'south', E: 'east', W: 'west' }[r.side ?? 'N']}` : ''}</div>

      <div className="room-vis">
        <span className="sm">{hoodOpen ? `Players: ${SHOW_TIP[show].replace(/^Players see /, '')}` : `🔒 ${hood?.name} is locked for players`}</span>
        <div className="seg">
          <button className={show === 'hidden' ? 'on' : ''} onClick={() => set('hidden')} title="Players don't see it">🙈 Hidden</button>
          {plainOk && <button className={show === 'plain' ? 'on' : ''} disabled={!hoodOpen} onClick={() => set('plain')} title="Players see an ordinary tan building with no label">🏠 As a building</button>}
          <button className={show === 'full' ? 'on' : ''} disabled={!hoodOpen} onClick={() => set('full')} title="Players see its colour and label">👁 Revealed</button>
        </div>
      </div>

      <div className="room-battle">
        <b className="sm">⚔ Battle scene</b>
        {linked ? (
          <div className="row gap wrap">
            <button className="btn sm primary" onClick={() => open(linked.id)}>Open “{linked.name}”</button>
            <button className="btn sm ghost" onClick={() => link(null)} title="Unlink (the scene itself stays)">Unlink</button>
          </div>
        ) : (
          <div className="row gap wrap">
            <button className="btn sm" onClick={() => setMaking(true)}>＋ New battle scene</button>
            {!!choices.length && (
              <select value="" onChange={e => e.target.value && link(e.target.value)} aria-label="Link an existing scene">
                <option value="">Link an existing scene…</option>
                {choices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {note?.notes && <div className="room-notes">{note.notes.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>}
      {!note && r.type === 'filler' && <p className="hint">A building with no notes. Reveal it if the players explore it.</p>}
      {making && <NewScene title={`Battle scene for ${title}`} defaultName={title} onClose={() => setMaking(false)} onCreated={sid => link(sid)} />}
    </div>
  );
}
