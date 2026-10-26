import { useCampaign, creatureOf } from '../../store';
import { useUI, type Pick } from '../../ui';
import { send } from '../sync';
import { uid } from '../id';
import { rollAttack } from '../roll';
import { classifyAttack, elementOf, type Element, type FxEvent, type Missile, type Weapon } from './core';
import { playFxSound } from './sound';
import type { AreaTemplate, Token } from '../../types';
import { cubeRect } from '../geometry';

// DM-side: decides when an effect plays, sends it to the table screen and plays its sound.

export const fxOn = () => useCampaign.getState().settings.fx !== false;

export function playFx(e: Omit<FxEvent, 'id' | 'at' | 'grid' | 'sceneId'>, sceneId = useCampaign.getState().activeSceneId) {
  const c = useCampaign.getState();
  if (!fxOn() || sceneId !== c.tableSceneId) return; // only on the scene players are looking at
  const sc = c.scenes.find(s => s.id === sceneId);
  if (!sc) return;
  const fx: FxEvent = { ...e, id: uid(), at: Date.now() + 80, grid: sc.grid.size, sceneId };
  send({ type: 'fx', fx });
  if (c.settings.fxSound !== false) playFxSound(fx, c.settings.fxVolume ?? 0.7);
}

function tokenOnScene(id: string) {
  const c = useCampaign.getState();
  return c.scenes.find(s => s.id === c.activeSceneId)?.tokens.find(t => t.id === id);
}

export function startTargeting(hint: string, allowPoint: boolean, onPick: (p: Pick) => boolean | void, onCancel?: () => void) {
  const ui = useUI.getState();
  ui.set({
    targeting: {
      hint, allowPoint, onCancel,
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
  );
}

function resolveAttack(spec: AttackSpec, targetId: string) {
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

  // Hidden rolls never animate.
  if (r.hidden) return;
  const from = attackerFor(spec, target);
  if (!from) return;
  const distSq = Math.hypot(from.x - target.x, from.y - target.y) / (c.scenes.find(s => s.id === c.activeSceneId)?.grid.size ?? 70);
  const look2 = classifyAttack(spec.name, spec.desc ?? '', spec.dmg[0]?.type, distSq);
  playFx({ ...look2, from: { x: from.x, y: from.y }, to: { x: target.x, y: target.y }, result: outcome });
}

// ----- effects the DM plays by hand from the token card -----
export type ManualFx =
  | { kind: 'melee'; weapon: Weapon }
  | { kind: 'missile'; missile: Missile }
  | { kind: 'spell'; missile: 'orb' | 'ray' | 'lightning' | 'darts' }
  | { kind: 'burst'; radiusFt: number }
  | { kind: 'heal' }
  | { kind: 'poof' };

export function manualFx(sourceId: string, m: ManualFx, element: Element) {
  const src = tokenOnScene(sourceId);
  if (!src) return;
  if (m.kind === 'poof') { playFx({ kind: 'poof', to: { x: src.x, y: src.y }, element: 'physical' }); return; }
  const what = m.kind === 'heal' ? 'who gets healed' : m.kind === 'burst' ? 'where it explodes' : 'the target';
  startTargeting(`🎬 Click ${what}${m.kind === 'heal' || m.kind === 'burst' ? '' : ' (hold Shift for a miss)'}. Esc to cancel.`, m.kind === 'burst' || m.kind === 'spell', p => {
    const to = { x: p.x, y: p.y };
    const result = m.kind === 'heal' || m.kind === 'burst' ? undefined : p.shift ? 'miss' : 'hit';
    const g = useCampaign.getState().scene()?.grid;
    if (m.kind === 'melee') playFx({ kind: 'melee', weapon: m.weapon, from: src, to, element, result });
    else if (m.kind === 'missile') playFx({ kind: 'missile', missile: m.missile, from: src, to, element, result });
    else if (m.kind === 'spell') playFx({ kind: 'missile', missile: m.missile, from: src, to, element, result });
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
export function pcAttack(c: { id: string; name: string }, a: { name: string; toHit?: number; damage?: string; notes?: string }) {
  const type = (a.notes ?? '').split('·')[0].trim();
  attack({
    name: a.name, who: c.name, toHit: a.toHit ?? 0, charId: c.id,
    dmg: a.damage ? [{ dice: a.damage.replace(/\s/g, ''), type: type || 'damage' }] : [],
    desc: /\d+\/\d+ ?ft/.test(a.notes ?? '') ? 'Ranged Weapon Attack' : '',
  });
}

export { elementOf };
