import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce, type Draft } from 'immer';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Campaign, Scene, Token, Character, RollResult, LootItem, Monster, InitEntry } from './types';
import { uid } from './lib/id';
import { BUILTIN_MAPS } from './lib/builtinMaps';

export const newScene = (name = 'New scene', map?: Scene['map'], gridSize = 70): Scene => ({
  id: uid(), name, map,
  grid: { show: true, size: gridSize, offsetX: 0, offsetY: 0, color: '#000000', opacity: 0.35, snap: true, feet: 5 },
  tokens: [], drawings: [], templates: [],
  fog: { enabled: false, ops: [] },
});

function defaultCampaign(): Campaign {
  const m = BUILTIN_MAPS[0];
  const s = newScene(m.name, { src: m.src, width: m.width, height: m.height }, m.grid);
  return {
    name: 'My Campaign', scenes: [s], activeSceneId: s.id, tableSceneId: s.id,
    characters: [], encounter: { active: false, round: 1, turn: 0, entries: [] },
    rolls: [], partyLoot: [], customMonsters: [],
    settings: { diagonal: '5', showMonsterNames: true, partyLevel: 1 },
    monsterNotes: {}, notes: [], sceneFolders: [], docs: [], docFolders: [],
  };
}

interface Actions {
  set: (fn: (d: Draft<Campaign>) => void) => void;
  scene: (id?: string) => Scene | undefined;
  updateScene: (id: string, fn: (s: Draft<Scene>) => void, undoable?: boolean) => void;
  updateToken: (sceneId: string, tokenId: string, patch: Partial<Token>) => void;
  updateChar: (id: string, patch: Partial<Character>) => void;
  addRoll: (r: RollResult) => void;
  addLoot: (items: LootItem[]) => void;
  undo: () => void;
  replaceAll: (c: Campaign) => void;
  saveMonster: (m: Monster) => void;
  setEntries: (fn: (e: Draft<InitEntry>[]) => void) => void;
}

type Store = Campaign & Actions;

// A character's token looks the same in every scene: changes to these on one scene's token
// copy to that character's tokens everywhere. Position and hidden stay per scene.
const SHARED_TOKEN_KEYS = ['size', 'color', 'image', 'light', 'lightDim', 'note', 'fxPick'] as const;
function syncCharTokens(scenes: Scene[], before: Scene, after: Scene): Scene[] {
  if (before.tokens === after.tokens) return scenes;
  const old = new Map(before.tokens.map(t => [t.id, t]));
  const changes = new Map<string, Partial<Token>>(); // charId -> changed fields
  for (const t of after.tokens) {
    const o = old.get(t.id);
    if (!t.charId || !o || o === t) continue;
    for (const k of SHARED_TOKEN_KEYS) if (t[k] !== o[k]) (changes.get(t.charId) ?? changes.set(t.charId, {}).get(t.charId)!)[k] = t[k] as never;
  }
  if (!changes.size) return scenes;
  return scenes.map(sc => (sc.id === after.id || !sc.tokens.some(t => t.charId && changes.has(t.charId)) ? sc
    : produce(sc, d => { for (const t of d.tokens) { const p = t.charId && changes.get(t.charId); if (p) Object.assign(t, p); } })));
}

// Undo keeps recent scene snapshots in memory only.
const history: { sceneId: string; scene: Scene }[] = [];

const idbStorage = {
  getItem: async (k: string) => (await idbGet<string>(k)) ?? null,
  setItem: (k: string, v: string) => idbSet(k, v),
  removeItem: (k: string) => idbDel(k),
};

export const useCampaign = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultCampaign(),
      set: fn => set(s => produce(s, d => { fn(d as Draft<Campaign>); })),
      scene: id => get().scenes.find(s => s.id === (id ?? get().activeSceneId)),
      updateScene: (id, fn, undoable = true) => set(s => {
        const cur = s.scenes.find(x => x.id === id);
        if (!cur) return s;
        if (undoable) { history.push({ sceneId: id, scene: cur }); if (history.length > 80) history.shift(); }
        const next = produce(cur, fn);
        return { scenes: syncCharTokens(s.scenes.map(x => (x.id === id ? next : x)), cur, next) };
      }),
      updateToken: (sceneId, tokenId, patch) => get().updateScene(sceneId, sc => {
        const t = sc.tokens.find(t => t.id === tokenId);
        if (t) Object.assign(t, patch);
      }),
      updateChar: (id, patch) => get().set(d => {
        const c = d.characters.find(c => c.id === id);
        if (c) Object.assign(c, patch);
      }),
      addRoll: r => set(s => ({ rolls: [r, ...s.rolls].slice(0, 300) })),
      addLoot: items => set(s => ({ partyLoot: [...items, ...s.partyLoot] })),
      undo: () => {
        const h = history.pop();
        if (!h) return;
        set(s => ({ scenes: s.scenes.map(x => (x.id === h.sceneId ? h.scene : x)) }));
      },
      replaceAll: c => set(() => ({ ...defaultCampaign(), ...c })),
      saveMonster: m => set(s => ({ customMonsters: [...s.customMonsters.filter(x => x.id !== m.id), { ...m, custom: true }] })),
      setEntries: fn => get().set(d => { fn(d.encounter.entries); }),
    }),
    {
      name: 'dcc-campaign-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: s => {
        const { set: _a, scene: _b, updateScene: _c, updateToken: _d, updateChar: _e, addRoll: _f, addLoot: _g, undo: _h, replaceAll: _i, saveMonster: _j, setEntries: _k, ...data } = s;
        return data as Campaign;
      },
    },
  ),
);

export const canUndo = () => history.length > 0;
export const campaignData = (): Campaign => {
  const s = useCampaign.getState();
  return {
    name: s.name, scenes: s.scenes, activeSceneId: s.activeSceneId, tableSceneId: s.tableSceneId, characters: s.characters,
    encounter: s.encounter, rolls: s.rolls, partyLoot: s.partyLoot, customMonsters: s.customMonsters, settings: s.settings,
    monsterNotes: s.monsterNotes, notes: s.notes, sceneFolders: s.sceneFolders, docs: s.docs, docFolders: s.docFolders,
  };
};

// Creature view of a token: PCs read HP/AC/conditions from their character.
export function creatureOf(t: Token, chars: Character[]) {
  if (t.charId) {
    const c = chars.find(c => c.id === t.charId);
    if (c) return { name: c.name, hp: c.hp, maxHp: c.maxHp, tempHp: c.tempHp, ac: c.ac, conditions: c.conditions, concentrating: !!c.concentrating, portrait: c.image || c.portrait, deathSaves: c.deathSaves, speed: c.speed };
  }
  return { name: t.name, hp: t.hp, maxHp: t.maxHp, tempHp: t.tempHp, ac: t.ac, conditions: t.conditions, concentrating: !!t.concentrating, portrait: undefined as string | undefined, deathSaves: undefined as Character['deathSaves'], speed: undefined as string | undefined };
}
