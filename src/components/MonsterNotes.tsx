import { useCampaign } from '../store';
import { findMonster } from '../lib/monsters';

// Collapsible DM notes. Monster notes are shared by every copy of that monster in every scene;
// token notes belong to one token only. Players never see either.
export default function MonsterNotes({ monsterId, token }: { monsterId?: string; token?: { sceneId: string; id: string; note?: string } }) {
  const note = useCampaign(s => (monsterId ? s.monsterNotes[monsterId] ?? '' : ''));
  const name = monsterId ? findMonster(monsterId)?.name ?? 'this monster' : '';
  const setMonsterNote = (v: string) => useCampaign.getState().set(d => {
    if (v.trim()) d.monsterNotes[monsterId!] = v; else delete d.monsterNotes[monsterId!];
  });
  const setTokenNote = (v: string) => useCampaign.getState().updateScene(token!.sceneId, s => {
    const t = s.tokens.find(t => t.id === token!.id);
    if (t) t.note = v || undefined;
  }, false);
  const count = (note.trim() ? 1 : 0) + (token?.note?.trim() ? 1 : 0);
  return (
    <details className="notes-box" open={count > 0}>
      <summary>📝 Notes{count ? <span className="tag">{count}</span> : null}</summary>
      {monsterId && (
        <label className="field">For every {name}
          <textarea rows={3} value={note} onChange={e => setMonsterNote(e.target.value)} placeholder="e.g. Bump bite damage to 2d6+4, uses pack tactics" />
        </label>
      )}
      {token && (
        <label className="field">This token only
          <textarea rows={2} value={token.note ?? ''} onChange={e => setTokenNote(e.target.value)} placeholder="e.g. Carries the cellar key" />
        </label>
      )}
    </details>
  );
}
