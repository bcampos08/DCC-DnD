import { newScene, useCampaign } from '../store';
import { uid } from './id';
import type { Borough, Campaign, Floor } from '../types';

// Dungeon floors. Anything without a floor is on Floor 1 (everything made before floors existed).
export const FLOOR1 = 'f1';
export const floorOf = (x: { floorId?: string }) => x.floorId ?? FLOOR1;
export const floorsOf = (c: Pick<Campaign, 'floors'>): Floor[] => (c.floors?.length ? c.floors : [{ id: FLOOR1, name: 'Floor 1' }]);
export const activeFloor = (c: Pick<Campaign, 'activeFloorId'>) => c.activeFloorId ?? FLOOR1;
export const useFloorId = () => useCampaign(s => s.activeFloorId ?? FLOOR1);

// Switch floors: go back to the scene you last used there (or make a first one).
export function switchFloor(id: string) {
  const st = useCampaign.getState();
  st.set(d => {
    const floors = (d.floors ??= [{ id: FLOOR1, name: 'Floor 1' }]);
    const cur = floors.find(f => f.id === (d.activeFloorId ?? FLOOR1));
    if (cur) cur.lastSceneId = d.activeSceneId;
    const to = floors.find(f => f.id === id);
    if (!to) return;
    d.activeFloorId = id;
    const list = d.scenes.filter(s => floorOf(s) === id);
    const next = list.find(s => s.id === to.lastSceneId) ?? list[0];
    if (next) d.activeSceneId = next.id;
    else {
      const s = { id: uid(), name: 'New scene', floorId: id, grid: { show: true, size: 70, offsetX: 0, offsetY: 0, color: '#000000', opacity: 0.35, snap: true, feet: 5 }, tokens: [], drawings: [], templates: [], fog: { enabled: false, ops: [] } };
      d.scenes.push(s);
      d.activeSceneId = s.id;
    }
  });
}

export function addFloor(name: string) {
  const id = uid();
  useCampaign.getState().set(d => { (d.floors ??= [{ id: FLOOR1, name: 'Floor 1' }]).push({ id, name }); });
  switchFloor(id);
  return id;
}

// Adds a dungeon map as a new scene on its floor ("Floor 2" in its title), making the floor if needed.
export function importBoroughScene(b: Borough, folderId?: string) {
  const st = useCampaign.getState();
  const n = b.title.match(/Floor\s+(\d+)/i)?.[1];
  let floorId = activeFloor(st);
  if (n) {
    const f = floorsOf(st).find(f => new RegExp(`^Floor\\s+${n}\\b`, 'i').test(f.name));
    if (f) floorId = f.id;
    else { floorId = uid(); st.set(d => { (d.floors ??= [{ id: FLOOR1, name: 'Floor 1' }]).push({ id: floorId, name: `Floor ${n}` }); }); }
  }
  const S = 40;
  const sc = newScene(b.title.replace(/^Floor\s+\d+\s*[—,-]\s*/i, ''), { src: '', width: b.cols * S, height: b.rows * S }, S);
  sc.grid = { ...sc.grid, feet: b.feet, opacity: 0.1 };
  sc.floorId = floorId;
  sc.borough = b;
  if (folderId && floorId === activeFloor(st)) sc.folderId = folderId;
  st.set(d => { d.scenes.push(sc); });
  switchFloor(floorId);
  st.set(d => { d.activeSceneId = sc.id; });
  return sc;
}
