import { useCampaign } from '../store';
import { useUI } from '../ui';
import { ROOM_LABEL, roomId, roomVisible, setRoomShown } from '../lib/borough';
import type { Scene } from '../types';

// Card for a dungeon-map room: its GM notes, and whether players can see it.
export default function RoomCard({ scene }: { scene: Scene }) {
  const id = useUI(s => s.selectedRoom);
  const b = scene.borough!;
  const r = b.rooms.find(x => roomId(x) === id);
  if (!r) return null;
  const note = r.key ? b.notes[r.key] : undefined;
  const hood = b.hoods[r.hood];
  const hoodOpen = !(r.hood in b.hoods) || b.shownHoods.includes(r.hood);
  const shown = roomVisible(b, r);
  const set = (show: boolean) => useCampaign.getState().updateScene(scene.id, s => { setRoomShown(s.borough!, r, show); });
  const close = () => useUI.getState().set({ selectedRoom: null });
  return (
    <div className="token-card room-card">
      <div className="row gap">
        <b className="grow rc-title">{r.key ? `${r.key} · ` : ''}{note?.name ?? ROOM_LABEL[r.type]}</b>
        <button className="icon-btn" onClick={close} aria-label="Close">✕</button>
      </div>
      <div className="muted sm">{ROOM_LABEL[r.type]} · {hood ? hood.name : 'Thoroughfare'} · {r.w}×{r.h} squares{r.door ? ` · door on the ${{ N: 'north', S: 'south', E: 'east', W: 'west' }[r.side ?? 'N']}` : ''}</div>
      <div className={'room-vis' + (shown ? ' on' : '')}>
        {shown ? '👁 Players can see this room' : hoodOpen ? '🙈 Hidden from players' : `🔒 Hidden: ${hood?.name} is locked`}
        <button className={'btn sm' + (shown ? '' : ' primary')} onClick={() => set(!shown)} disabled={!hoodOpen && !shown}>{shown ? 'Hide from players' : 'Reveal to players'}</button>
      </div>
      {note?.notes && <div className="room-notes">{note.notes.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>}
      {!note && r.type === 'filler' && <p className="hint">A building with no notes. Reveal it if the players explore it.</p>}
    </div>
  );
}
