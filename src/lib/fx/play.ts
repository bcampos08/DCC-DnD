import { useCampaign, creatureOf } from '../../store';
import { useUI, type Pick as TargetPick } from '../../ui';
import { send } from '../sync';
import { uid } from '../id';
import { rollAttack } from '../roll';
import { classifyAttack, elementOf, timeline, type Element, type FxEvent, type Missile, type Weapon } from './core';
import { playFxSound } from './sound';
import type { AreaTemplate, LastingFx, Token } from '../../types';
import { cubeRect } from '../geometry';

// DM-side: decides when an effect plays, sends it to the table screen and plays its sound.

export const fxOn = () => useCampaign.getState().settings.fx !== false;

// Returns false when nothing was sent to the table screen.
export function playFx(e: Omit<FxEvent, 'id' | 'at' | 'grid' | 'sceneId'>, sceneId = useCampaign.getState().activeSceneId): boolean {
  const c = useCampaign.getState();
  if (!fxOn() || sceneId !== c.tableSceneId) return false; // only on the scene players are looking at
  const sc = c.scenes.find(s => s.id === sceneId);
  if (!sc) return false;
  const fx: FxEvent = { ...e, id: uid(), at: Date.now() + 80, grid: sc.grid.size, sceneId };
  send({ type: 'fx', fx });
  if (sceneId === c.activeSceneId) useUI.getState().set(u => ({ fx: [...u.fx.slice(-30), fx] })); // the DM sees it too
  if (c.settings.fxSound !== false) playFxSound(fx, c.settings.fxVolume ?? 0.7);
  return true;
}

const makePublic = { label: 'Make rolls public', run: () => useUI.getState().set({ rollHidden: false }) };

function tokenOnScene(id: string) {
  const c = useCampaign.getState();
  return c.scenes.find(s => s.id === c.activeSceneId)?.tokens.find(t => t.id === id);
}

export function startTargeting(hint: string, allowPoint: boolean, onPick: (p: TargetPick) => boolean | void, onCancel?: () => void, rolls = false) {
  const ui = useUI.getState();
  ui.set({
    targeting: {
      hint, allowPoint, onCancel, rolls,
      onPick: p => { if (onPick(p) !== false) useUI.getState().set({ targeting: null }); },
    },
  });
}

// ----- attacks rolled from stat blocks and character sheets -----
export interface AttackSpec {
  name: string; who: string; toHit: number; dmg: { dice: string; type: string }[]; desc?: string;
  attackerId?: string; monsterId?: string; charId?: string;
}

// Who is making the attack: the token given, the selected matching token, or the closest matching one.
function attackerFor(spec: AttackSpec, target: Token): Token | undefined {
  const c = useCampaign.getState();
  const toks = c.scenes.find(s => s.id === c.activeSceneId)?.tokens ?? [];
  if (spec.attackerId) { const t = toks.find(t => t.id === spec.attackerId); if (t) return t; }
  const sel = useUI.getState().selected.map(id => toks.find(t => t.id === id)).filter(Boolean) as Token[];
  const match = (t: Token) => (spec.monsterId && t.monsterId === spec.monsterId) || (spec.charId && t.charId === spec.charId);
  const s = sel.find(t => match(t) && t.id !== target.id);
  if (s) return s;
  return toks.filter(t => match(t) && t.id !== target.id).sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0];
}

export function attack(spec: AttackSpec) {
  if (!fxOn()) { rollAttack(spec.name, spec.who, spec.toHit, spec.dmg); return; }
  startTargeting(
    `🎯 Click the target of ${spec.who}'s ${spec.name}. Esc rolls without a target.`,
    false,
    p => { if (!p.tokenId) return false; resolveAttack(spec, p.tokenId); },
    () => rollAttack(spec.name, spec.who, spec.toHit, spec.dmg),
    true,
  );
}

function resolveAttack(spec: AttackSpec, targetId: string, fxLook?: Pick<FxEvent, 'kind' | 'weapon' | 'missile' | 'element' | 'radius'>) {
  const c = useCampaign.getState();
  const target = tokenOnScene(targetId);
  if (!target) return;
  const look = creatureOf(target, c.characters);
  const ac = look.ac;
  let outcome: 'hit' | 'miss' | 'crit' = 'miss';
  const r = rollAttack(spec.name, spec.who, spec.toHit, spec.dmg, {
    annotate: roll => {
      const hit = roll.crit || (!roll.fumble && roll.total >= ac);
      outcome = roll.crit ? 'crit' : hit ? 'hit' : 'miss';
      roll.label = `${spec.name} → ${look.name}: ${outcome === 'crit' ? 'CRIT' : outcome === 'hit' ? 'HIT' : 'MISS'} (AC ${ac})`;
    },
  });
  const dmg = (r.parts ?? []).reduce((s, p) => s + p.total, 0);
  if (outcome !== 'miss' && dmg > 0) {
    useUI.getState().toast(`${spec.name} hits ${look.name} for ${dmg}${r.crit ? ' (crit)' : ''}`, {
      label: `Apply ${dmg} damage`,
      run: () => import('../actions').then(a => a.changeHp({ tokenId: targetId }, dmg, 'damage')),
    });
  } else if (outcome === 'miss') useUI.getState().toast(`${spec.name} misses ${look.name} (${r.total} vs AC ${ac})`);

  // Hidden rolls never animate. Say so, so a missing animation isn't a mystery.
  if (r.hidden) { useUI.getState().toast('🙈 That roll was hidden, so nothing played on the TV.', makePublic); return; }
  if (c.activeSceneId !== c.tableSceneId) { useUI.getState().toast('No animation: the players are looking at a different scene.'); return; }
  const from = attackerFor(spec, target);
  if (!from) { useUI.getState().toast(`No animation: couldn't find ${spec.who}'s token on this scene.`); return; }
  const distSq = Math.hypot(from.x - target.x, from.y - target.y) / (c.scenes.find(s => s.id === c.activeSceneId)?.grid.size ?? 70);
  const look2 = fxLook ?? classifyAttack(spec.name, spec.desc ?? '', spec.dmg[0]?.type, distSq);
  playFx({ ...look2, from: { x: from.x, y: from.y }, to: { x: target.x, y: target.y }, result: outcome });
}

// ----- effects the DM plays by hand from the token card -----
export type ManualFx =
  | { kind: 'melee'; weapon: Weapon }
  | { kind: 'missile'; missile: Missile }
  | { kind: 'spell'; missile: 'orb' | 'ray' | 'lightning' | 'darts'; radiusFt?: number; linger?: string }
  | { kind: 'burst'; radiusFt: number }
  | { kind: 'heal' }
  | { kind: 'poof' }
  | { kind: 'wall' }
  | { kind: 'cone' };

// With `roll` filled in, the effect is a real attack: rolled against the target's AC, with hit/miss and damage.
export function manualFx(sourceId: string, m: ManualFx, element: Element, roll?: { toHit: number; dice: string; label: string }) {
  const src = tokenOnScene(sourceId);
  if (!src) return;
  if (roll && (m.kind === 'melee' || m.kind === 'missile' || m.kind === 'spell')) {
    const c = useCampaign.getState();
    const who = creatureOf(src, c.characters).name;
    const spec: AttackSpec = { name: roll.label, who, toHit: roll.toHit, dmg: roll.dice ? [{ dice: roll.dice, type: element === 'physical' ? 'damage' : element }] : [], attackerId: src.id };
    const look = { kind: m.kind === 'melee' ? 'melee' : 'missile', weapon: m.kind === 'melee' ? m.weapon : undefined, missile: m.kind === 'melee' ? undefined : m.missile, element } as Pick<FxEvent, 'kind' | 'weapon' | 'missile' | 'element'>;
    const g = c.scene()?.grid;
    if (m.kind === 'spell' && m.radiusFt && g) (look as FxEvent).radius = (m.radiusFt / g.feet) * g.size;
    startTargeting(`🎯 Click the target of ${who}'s ${roll.label}. Esc rolls without a target.`, false,
      p => { if (!p.tokenId) return false; resolveAttack(spec, p.tokenId, look); if (m.kind === 'spell') lingerAfter(src, p, m, element); },
      () => rollAttack(spec.name, spec.who, spec.toHit, spec.dmg), true);
    return;
  }
  if (m.kind === 'poof') { playFx({ kind: 'poof', to: { x: src.x, y: src.y }, element: 'physical' }); return; }
  const what = m.kind === 'heal' ? 'who gets healed' : m.kind === 'burst' ? 'where it explodes' : 'the target';
  startTargeting(`🎬 Click ${what}${m.kind === 'heal' || m.kind === 'burst' ? '' : ' (hold Shift for a miss)'}. Esc to cancel.`, m.kind === 'burst' || m.kind === 'spell', p => {
    const to = { x: p.x, y: p.y };
    const result = m.kind === 'heal' || m.kind === 'burst' ? undefined : p.shift ? 'miss' : 'hit';
    const g = useCampaign.getState().scene()?.grid;
    if (m.kind === 'melee') playFx({ kind: 'melee', weapon: m.weapon, from: src, to, element, result });
    else if (m.kind === 'missile') playFx({ kind: 'missile', missile: m.missile, from: src, to, element, result });
    else if (m.kind === 'spell') { playFx({ kind: 'missile', missile: m.missile, from: src, to, element, result, radius: m.radiusFt && g ? (m.radiusFt / g.feet) * g.size : undefined }); lingerAfter(src, to, m, element); }
    else if (m.kind === 'burst') playFx({ kind: 'burst', from: src, to, element, radius: g ? (m.radiusFt / g.feet) * g.size : 280 });
    else if (m.kind === 'heal') playFx({ kind: 'heal', to, element: 'radiant' });
  });
}

// ----- area templates -----
export function templateFx(t: AreaTemplate, element: Element, casterId?: string) {
  const sc = useCampaign.getState().scene();
  if (!sc) return;
  const L = (t.feet / sc.grid.feet) * sc.grid.size;
  const caster = casterId ? tokenOnScene(casterId) : undefined;
  if (t.shape === 'circle') playFx({ kind: 'burst', from: caster ? { x: caster.x, y: caster.y } : undefined, to: { x: t.x, y: t.y }, radius: L, element });
  else if (t.shape === 'cube') { const q = cubeRect(t, sc.grid); playFx({ kind: 'burst', to: { x: q.x + q.w / 2, y: q.y + q.h / 2 }, radius: L / 2, element }); }
  else if (t.shape === 'cone') playFx({ kind: 'cone', to: { x: t.x, y: t.y }, angle: t.angle, length: L, element });
  else playFx({ kind: 'line', to: { x: t.x, y: t.y }, angle: t.angle, length: L, element });
}

// A player character's weapon attack, e.g. { name: 'Longbow', toHit: 5, damage: '1d8+3', notes: 'Piercing · 150/600 ft' }.
export function pcAttack(c: { id: string; name: string }, a: { name: string; toHit?: number; damage?: string; notes?: string }, attackerId?: string) {
  const type = (a.notes ?? '').split('·')[0].trim();
  attack({
    name: a.name, who: c.name, toHit: a.toHit ?? 0, charId: c.id, attackerId,
    dmg: a.damage ? [{ dice: a.damage.replace(/\s/g, ''), type: type || 'damage' }] : [],
    desc: /\d+\/\d+ ?ft/.test(a.notes ?? '') ? 'Ranged Weapon Attack' : '',
  });
}

// ----- lasting effects -----
export const DURATIONS: { id: string; label: string }[] = [
  { id: 'instant', label: 'Instant' },
  { id: 's5', label: '5 seconds' }, { id: 's10', label: '10 seconds' }, { id: 's30', label: '30 seconds' }, { id: 's60', label: '1 minute (real time)' },
  { id: 'r1', label: '1 round' }, { id: 'r2', label: '2 rounds' }, { id: 'r3', label: '3 rounds' }, { id: 'r10', label: '10 rounds (1 minute)' },
  { id: 'manual', label: 'Until I end it' },
];

// Rounds count down during combat; outside combat they last until ended by hand.
export function addLasting(e: Omit<LastingFx, 'id' | 'startedAt' | 'endsAt' | 'endsRound'>, duration: string, sceneId = useCampaign.getState().activeSceneId) {
  if (duration === 'instant') return;
  const c = useCampaign.getState();
  const fx: LastingFx = { ...e, id: uid(), startedAt: Date.now() };
  if (duration.startsWith('s')) fx.endsAt = Date.now() + parseInt(duration.slice(1), 10) * 1000;
  if (duration.startsWith('r') && c.encounter.active) fx.endsRound = c.encounter.round + parseInt(duration.slice(1), 10);
  c.updateScene(sceneId, s => { s.effects = [...(s.effects ?? []), fx]; }, false);
  if (fxOn() && sceneId === c.tableSceneId && c.settings.fxSound !== false) {
    const sc = c.scenes.find(s => s.id === sceneId)!;
    const el = (e.element as Element) ?? 'fire';
    const start = { id: fx.id, at: Date.now(), grid: sc.grid.size, sceneId, element: el, to: { x: e.x, y: e.y } };
    playFxSound(e.kind === 'wall' ? { ...start, kind: 'line', angle: e.angle, length: e.length } : e.kind === 'cone' ? { ...start, kind: 'cone' } : { ...start, kind: 'burst', radius: e.r }, c.settings.fxVolume ?? 0.7);
  }
}

export function endLasting(id: string) {
  const c = useCampaign.getState();
  for (const s of c.scenes) if (s.effects?.some(e => e.id === id)) c.updateScene(s.id, x => { x.effects = (x.effects ?? []).filter(e => e.id !== id); }, false);
}

// Remove effects whose time or rounds have run out.
export function expireLasting() {
  const c = useCampaign.getState(), now = Date.now();
  for (const s of c.scenes) {
    const keep = (s.effects ?? []).filter(e => !(e.endsAt && e.endsAt < now) && !(e.endsRound && c.encounter.active && c.encounter.round >= e.endsRound));
    if (keep.length !== (s.effects ?? []).length) c.updateScene(s.id, x => { x.effects = keep; }, false);
  }
}

// A spell bolt that leaves something burning (or freezing...) where it lands.
function lingerAfter(from: { x: number; y: number }, to: { x: number; y: number }, m: Extract<ManualFx, { kind: 'spell' }>, element: Element) {
  if (!m.linger || m.linger === 'instant') return;
  const g = useCampaign.getState().scene()?.grid;
  if (!g) return;
  const r = Math.max(g.size * 0.5, ((m.radiusFt ?? 0) / g.feet) * g.size);
  const travel = timeline({ id: '', sceneId: '', at: 0, kind: 'missile', missile: m.missile, from, to, element, grid: g.size }).travel;
  const sceneId = useCampaign.getState().activeSceneId;
  setTimeout(() => addLasting({ kind: 'area', label: `${element[0].toUpperCase() + element.slice(1)} (spell)`, element, x: to.x, y: to.y, r }, m.linger!, sceneId), travel);
}

// Turns an area template into a spell effect: instant (explosion, blast, beam) or lasting.
export type TemplateStyle = 'burst' | 'area' | 'ring' | 'blast' | 'cone' | 'beam' | 'wall';
export function templateStyles(shape: AreaTemplate['shape']): { id: TemplateStyle; label: string; lasting: boolean }[] {
  if (shape === 'circle') return [{ id: 'burst', label: 'Explosion', lasting: false }, { id: 'area', label: 'Lingering area (cloud, fire…)', lasting: true }, { id: 'ring', label: 'Ring wall', lasting: true }];
  if (shape === 'cube') return [{ id: 'burst', label: 'Explosion', lasting: false }, { id: 'area', label: 'Lingering area', lasting: true }];
  if (shape === 'cone') return [{ id: 'blast', label: 'Cone blast', lasting: false }, { id: 'cone', label: 'Lasting cone', lasting: true }];
  return [{ id: 'beam', label: 'Beam / bolt', lasting: false }, { id: 'wall', label: 'Wall', lasting: true }];
}

export function playTemplate(t: AreaTemplate, style: TemplateStyle, element: Element, duration: string, casterId?: string, label?: string) {
  const sc = useCampaign.getState().scene();
  if (!sc) return;
  const L = (t.feet / sc.grid.feet) * sc.grid.size;
  const name = label ?? `${element[0].toUpperCase() + element.slice(1)} ${style === 'ring' ? 'ring' : style === 'wall' ? 'wall' : style === 'cone' ? 'cone' : 'area'}`;
  if (style === 'burst' || style === 'blast' || style === 'beam') { templateFx(t, element, casterId); return; }
  if (style === 'wall') addLasting({ kind: 'wall', label: name, element, x: t.x, y: t.y, angle: t.angle, length: L }, duration);
  else if (style === 'cone') addLasting({ kind: 'cone', label: name, element, x: t.x, y: t.y, angle: t.angle, length: L }, duration);
  else if (t.shape === 'cube') { const q = cubeRect(t, sc.grid); addLasting({ kind: 'area', label: name, element, x: q.x + q.w / 2, y: q.y + q.h / 2, r: L * 0.56 }, duration); }
  else addLasting({ kind: style === 'ring' ? 'ring' : 'area', label: name, element, x: t.x, y: t.y, r: L }, duration);
}

export { elementOf };
