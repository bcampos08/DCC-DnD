import { useCampaign } from '../store';
import { useUI } from '../ui';
import { makeRoll, critDice, type Adv } from './dice';
import { send } from './sync';
import type { RollResult } from '../types';

interface Opts { hidden?: boolean; adv?: Adv }

function publish(r: RollResult) {
  useCampaign.getState().addRoll(r);
  if (!r.hidden) send({ type: 'popup', p: { kind: 'roll', roll: r, at: Date.now() } });
  return r;
}

const opts = (o?: Opts) => {
  const ui = useUI.getState();
  const adv = o?.adv ?? ui.adv;
  if (ui.adv !== 'normal' && !o?.adv) ui.set({ adv: 'normal' }); // advantage applies to one roll
  return { hidden: o?.hidden ?? ui.rollHidden, adv };
};

export function roll(expr: string, label: string, who = 'DM', o?: Opts) {
  const { hidden, adv } = opts(o);
  return publish(makeRoll(expr, label, who, hidden, /d20/i.test(expr) ? adv : 'normal'));
}

// Attack roll plus damage in one log entry; damage dice double on a natural 20.
export function rollAttack(name: string, who: string, toHit: number, dmg: { dice: string; type: string }[], o?: Opts) {
  const { hidden, adv } = opts(o);
  const atk = makeRoll(`1d20${toHit >= 0 ? '+' : '-'}${Math.abs(toHit)}`, `${name} attack`, who, hidden, adv);
  const parts = dmg.map(d => makeRoll(atk.crit ? critDice(d.dice) : d.dice, `${d.type || 'damage'}`.toLowerCase(), who, hidden));
  atk.parts = parts;
  return publish(atk);
}
