import { useCampaign, creatureOf } from '../store';
import { useUI } from '../ui';
import type { Character, InitEntry, Monster, Token } from '../types';
import { uid } from './id';
import { snapCentre } from './geometry';
import { SIZE_SQUARES, TOKEN_COLORS } from './rules';
import { evaluate, modOf, d20Expr } from './dice';
import { findMonster } from './monsters';
import { roll } from './roll';

const hashColor = (s: string) => TOKEN_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TOKEN_COLORS.length];

// Centre of what the DM is looking at, in map pixels.
export function viewCentre() {
  const st = useCampaign.getState();
  const ui = useUI.getState();
  const cam = ui.camera[st.activeSceneId];
  const sc = st.scene()!;
  if (!cam) return { x: (sc.map?.width ?? 1000) / 2, y: (sc.map?.height ?? 700) / 2 };
  return { x: (ui.viewport.w / 2 - cam.x) / cam.scale, y: (ui.viewport.h / 2 - cam.y) / cam.scale };
}

// Free grid spots spiralling out from a point.
function spots(n: number, size: number, taken: Token[]) {
  const sc = useCampaign.getState().scene()!;
  const g = sc.grid;
  const c = viewCentre();
  const out: { x: number; y: number }[] = [];
  const step = Math.max(1, size) * g.size;
  // Two tokens overlap when their centres are closer than half their combined widths.
  const busy = (x: number, y: number) => [...taken, ...out.map(o => ({ ...o, size }))].some(t =>
    Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) < ((Math.max(t.size, 0.5) + Math.max(size, 0.5)) / 2) * g.size * 0.95);
  for (let ring = 0; out.length < n && ring < 30; ring++) {
    for (let dx = -ring; dx <= ring && out.length < n; dx++) for (let dy = -ring; dy <= ring && out.length < n; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
      const p = snapCentre(c.x + dx * step, c.y + dy * step, size, g);
      if (!busy(p.x, p.y)) out.push(p);
    }
  }
  return out;
}

export function addMonsters(m: Monster, count: number, opts: { hidden: boolean; rollHp: boolean }) {
  const st = useCampaign.getState();
  const sc = st.scene()!;
  const size = SIZE_SQUARES[m.size] ?? 1;
  const nums = sc.tokens.filter(t => t.monsterId === m.id).map(t => parseInt(t.name.match(/(\d+)$/)?.[1] ?? '0', 10));
  let next = Math.max(0, ...nums) + 1;
  const color = hashColor(m.id);
  const places = spots(count, size, sc.tokens);
  const tokens: Token[] = places.map(p => {
    const hp = opts.rollHp && m.hd ? Math.max(1, evaluate(m.hd).total) : m.hp;
    return {
      id: uid(), name: `${m.name} ${next++}`, x: p.x, y: p.y, size, color, kind: 'monster', monsterId: m.id,
      hidden: opts.hidden, hp, maxHp: hp, tempHp: 0, ac: m.ac, conditions: [],
    };
  });
  st.updateScene(sc.id, s => { s.tokens.push(...tokens); });
  // Join a fight that's already running.
  if (st.encounter.active) st.setEntries(e => { tokens.forEach(t => e.push({ id: uid(), name: t.name, tokenIds: [t.id], init: null, dex: modOf(m.abilities.dex), monsterId: m.id })); });
  useUI.getState().set({ selected: tokens.map(t => t.id) });
  return tokens;
}

export function addCharacterToken(c: Character) {
  const st = useCampaign.getState();
  const sc = st.scene()!;
  const existing = sc.tokens.find(t => t.charId === c.id);
  if (existing) { useUI.getState().set({ selected: [existing.id] }); return; }
  const [p] = spots(1, 1, sc.tokens);
  const t: Token = { id: uid(), name: c.name, x: p.x, y: p.y, size: 1, color: c.color, kind: 'pc', charId: c.id, hidden: false, hp: 0, maxHp: 0, tempHp: 0, ac: c.ac, conditions: [] };
  st.updateScene(sc.id, s => { s.tokens.push(t); });
}

export function findToken(id: string) {
  const st = useCampaign.getState();
  for (const s of st.scenes) { const t = s.tokens.find(t => t.id === id); if (t) return { scene: s, token: t }; }
  return null;
}

// Damage eats temp HP first; asks for a concentration save when needed.
export function changeHp(target: { tokenId?: string; charId?: string }, amount: number, kind: 'damage' | 'heal' | 'temp') {
  const st = useCampaign.getState();
  let charId = target.charId;
  let tokenRef = target.tokenId ? findToken(target.tokenId) : null;
  if (tokenRef?.token.charId) charId = tokenRef.token.charId;
  const cur = charId ? st.characters.find(c => c.id === charId) : tokenRef?.token;
  if (!cur || !amount) return;
  let { hp, tempHp } = cur;
  const max = cur.maxHp;
  if (kind === 'heal') hp = Math.min(max || Infinity, hp + amount);
  else if (kind === 'temp') tempHp = Math.max(tempHp, amount);
  else {
    const fromTemp = Math.min(tempHp, amount);
    tempHp -= fromTemp;
    hp = Math.max(0, hp - (amount - fromTemp));
  }
  if (charId) st.updateChar(charId, { hp, tempHp });
  else if (tokenRef) st.updateToken(tokenRef.scene.id, tokenRef.token.id, { hp, tempHp });

  const name = charId ? st.characters.find(c => c.id === charId)!.name : tokenRef!.token.name;
  if (kind === 'damage' && cur.concentrating) {
    const dc = Math.max(10, Math.floor(amount / 2));
    const m = tokenRef?.token.monsterId ? findMonster(tokenRef.token.monsterId) : undefined;
    if (m) {
      const save = m.saves.find(s => s.ab === 'con')?.bonus ?? modOf(m.abilities.con);
      useUI.getState().toast(`${name} is concentrating — DC ${dc} Con save`, { label: 'Roll save', run: () => { const r = roll(d20Expr(save), `Concentration (DC ${dc})`, name); useUI.getState().toast(r.total >= dc ? `${name} keeps concentration (${r.total})` : `${name} loses concentration (${r.total})`); if (r.total < dc && tokenRef) st.updateToken(tokenRef.scene.id, tokenRef.token.id, { concentrating: false }); } });
    } else useUI.getState().toast(`${name} is concentrating — DC ${dc} Constitution save`);
  }
  if (kind === 'damage' && hp === 0 && max > 0) useUI.getState().toast(`${name} drops to 0 HP`);
}

// ----- initiative -----
export function initDex(e: Pick<InitEntry, 'monsterId' | 'charId'>) {
  if (e.charId) return useCampaign.getState().characters.find(c => c.id === e.charId)?.initBonus ?? 0;
  const m = findMonster(e.monsterId);
  return m ? modOf(m.abilities.dex) : 0;
}

export function startCombat() {
  const st = useCampaign.getState();
  const sc = st.scene()!;
  const entries: InitEntry[] = [];
  for (const c of st.characters) entries.push({ id: uid(), name: c.name, tokenIds: sc.tokens.filter(t => t.charId === c.id).map(t => t.id), charId: c.id, init: null, dex: c.initBonus });
  for (const t of sc.tokens.filter(t => !t.charId)) {
    const m = findMonster(t.monsterId);
    entries.push({ id: uid(), name: t.name, tokenIds: [t.id], init: null, dex: m ? modOf(m.abilities.dex) : 0, monsterId: t.monsterId });
  }
  st.set(d => { d.encounter = { active: true, round: 1, turn: 0, entries }; });
}

export function sortEntries() {
  useCampaign.getState().set(d => {
    // Before anyone has acted, sorting starts at the top of the order.
    const fresh = d.encounter.round === 1 && d.encounter.turn === 0;
    const cur = fresh ? undefined : d.encounter.entries[d.encounter.turn]?.id;
    d.encounter.entries.sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || b.dex - a.dex || a.name.localeCompare(b.name));
    const i = d.encounter.entries.findIndex(e => e.id === cur);
    d.encounter.turn = Math.max(0, i);
  });
}

export function rollInitFor(entryId: string) {
  const st = useCampaign.getState();
  const e = st.encounter.entries.find(x => x.id === entryId);
  if (!e) return;
  const r = roll(d20Expr(e.dex), 'Initiative', e.name);
  st.setEntries(list => { const x = list.find(y => y.id === entryId); if (x) x.init = r.total; });
}

export function groupMonsters(monsterId: string, group: boolean) {
  const st = useCampaign.getState();
  st.setEntries(list => {
    const mine = list.filter(e => e.monsterId === monsterId && !e.charId);
    if (!mine.length) return;
    const idx = list.indexOf(mine[0]);
    const rest = list.filter(e => !mine.includes(e));
    let replaced: InitEntry[];
    if (group) {
      const m = findMonster(monsterId);
      replaced = [{ id: uid(), name: `${m?.name ?? mine[0].name} ×${mine.flatMap(e => e.tokenIds).length}`, tokenIds: mine.flatMap(e => e.tokenIds), init: mine[0].init, dex: mine[0].dex, monsterId }];
    } else {
      const sc = st.scene()!;
      replaced = mine.flatMap(e => e.tokenIds).map(tid => ({ id: uid(), name: sc.tokens.find(t => t.id === tid)?.name ?? 'Monster', tokenIds: [tid], init: mine[0].init, dex: mine[0].dex, monsterId }));
    }
    rest.splice(Math.min(idx, rest.length), 0, ...replaced);
    list.splice(0, list.length, ...rest);
  });
}

export function nextTurn(dir = 1) {
  const st = useCampaign.getState();
  st.set(d => {
    const n = d.encounter.entries.length;
    if (!n) return;
    let t = d.encounter.turn + dir;
    if (t >= n) { t = 0; d.encounter.round++; }
    if (t < 0) { if (d.encounter.round > 1) { t = n - 1; d.encounter.round--; } else t = 0; }
    d.encounter.turn = t;
  });
  const e = useCampaign.getState().encounter;
  const cur = e.entries[e.turn];
  if (cur) useUI.getState().set({ selected: cur.tokenIds });
}

export const creatureForToken = (t: Token) => creatureOf(t, useCampaign.getState().characters);
