import { useCampaign } from '../store';
import { exploreOp } from './vision';

// After tokens move, lights change or a door opens: remember what the players can now see.
// paths: token id -> points along its move, so fog clears along the way too.
export function exploreNow(sceneId: string, paths?: Map<string, { x: number; y: number }[]>) {
  const st = useCampaign.getState();
  const sc = st.scenes.find(s => s.id === sceneId);
  if (!sc) return;
  const op = exploreOp(sc, st.characters, paths);
  if (op) st.updateScene(sceneId, s => { s.fog.ops.push(op); }, false);
}
