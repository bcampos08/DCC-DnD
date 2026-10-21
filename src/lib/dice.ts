import type { RollResult } from '../types';
import { uid } from './id';

// Supports expressions like 1d20+5, 2d6 + 1d4 - 1, 2d20kh1, 4d6kl3, d100.
const TERM = /([+-])?\s*(?:(\d*)d(\d+|%)(?:(kh|kl)(\d+))?|(\d+))/gi;

export const rnd = (sides: number) => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] % sides) + 1;
};

export function isDiceExpr(s: string) {
  return /^\s*([+-]?\s*(\d*d(\d+|%)((kh|kl)\d+)?|\d+)\s*)+$/i.test(s) && /d/i.test(s);
}

export interface Rolled { total: number; breakdown: string; d20?: number; natMax?: boolean; natMin?: boolean }

export function evaluate(expr: string): Rolled {
  let total = 0;
  const bits: string[] = [];
  let d20: number | undefined;
  let m: RegExpExecArray | null;
  TERM.lastIndex = 0;
  const src = expr.replace(/\s+/g, '');
  while ((m = TERM.exec(src))) {
    if (!m[0]) { TERM.lastIndex++; continue; }
    const sign = m[1] === '-' ? -1 : 1;
    const signTxt = bits.length ? (sign < 0 ? ' − ' : ' + ') : sign < 0 ? '−' : '';
    if (m[3]) {
      const n = Math.min(parseInt(m[2] || '1', 10), 200);
      const sides = m[3] === '%' ? 100 : parseInt(m[3], 10);
      const rolls = Array.from({ length: n }, () => rnd(sides));
      let kept = rolls.map(() => true);
      if (m[4]) {
        const k = Math.min(parseInt(m[5], 10), n);
        const order = rolls.map((v, i) => [v, i]).sort((a, b) => (m![4].toLowerCase() === 'kh' ? b[0] - a[0] : a[0] - b[0]));
        kept = rolls.map(() => false);
        order.slice(0, k).forEach(([, i]) => (kept[i] = true));
      }
      const sum = rolls.reduce((s, v, i) => s + (kept[i] ? v : 0), 0);
      total += sign * sum;
      if (sides === 20 && d20 === undefined) d20 = rolls.find((_, i) => kept[i]);
      bits.push(`${signTxt}[${rolls.map((v, i) => (kept[i] ? v : `~${v}~`)).join(', ')}]`);
    } else if (m[6]) {
      const v = parseInt(m[6], 10);
      total += sign * v;
      bits.push(`${signTxt}${v}`);
    }
  }
  return { total, breakdown: bits.join(''), d20, natMax: d20 === 20, natMin: d20 === 1 };
}

export type Adv = 'normal' | 'adv' | 'dis';
export function withAdv(expr: string, adv: Adv) {
  if (adv === 'normal') return expr;
  return expr.replace(/(^|[^\d])1?d20(?!\d)/i, `$12d20${adv === 'adv' ? 'kh1' : 'kl1'}`);
}

export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
export const modOf = (score: number) => Math.floor((score - 10) / 2);
export const d20Expr = (mod: number) => `1d20${mod >= 0 ? '+' : '-'}${Math.abs(mod)}`;

export function makeRoll(expr: string, label: string, who: string, hidden: boolean, adv: Adv = 'normal'): RollResult {
  const e = withAdv(expr, adv);
  const r = evaluate(e);
  return {
    id: uid(), at: Date.now(), label: label + (adv === 'adv' ? ' (adv)' : adv === 'dis' ? ' (dis)' : ''), who, expr: e,
    total: r.total, breakdown: r.breakdown, hidden, crit: r.natMax, fumble: r.natMin,
  };
}

// Doubles the dice in a damage expression for critical hits.
export const critDice = (expr: string) => expr.replace(/(\d*)d(\d+)/gi, (_, n, s) => `${(parseInt(n || '1', 10)) * 2}d${s}`);
