import type { Monster, MonsterAction } from '../types';
import { ABILITIES } from '../types';
import { fmtMod, modOf, d20Expr } from '../lib/dice';
import { crText } from '../lib/rules';
import { roll } from '../lib/roll';
import { attack } from '../lib/fx/play';
import DiceText from './DiceText';

const AB_LABEL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' } as const;

export default function StatBlock({ m, who, attackerId }: { m: Monster; who?: string; attackerId?: string }) {
  const name = who ?? m.name;
  const Section = ({ title, list }: { title: string; list?: MonsterAction[] }) =>
    list && list.length ? (
      <>
        <h4 className="sb-h">{title}</h4>
        {list.map((a, i) => (
          <div key={i} className="sb-act">
            <b>{a.name}.</b>{' '}
            {a.atk != null && (
              <button className="roll-chip" title="Roll attack and damage" onClick={() => attack({ name: a.name, who: name, toHit: a.atk!, dmg: a.dmg ?? [], desc: a.desc, monsterId: m.id, attackerId })}>
                🎲 {fmtMod(a.atk)}{a.dmg?.length ? ` · ${a.dmg.map(d => d.dice).join(' + ')}` : ''}
              </button>
            )}{' '}
            <DiceText text={a.desc} who={name} label={a.name} />
          </div>
        ))}
      </>
    ) : null;
  return (
    <div className="statblock">
      <div className="sb-name">{m.name}{m.custom && <span className="tag">Custom</span>}</div>
      <div className="sb-sub">{m.size} {m.type}, {m.alignment}</div>
      <hr />
      <div><b>Armor Class</b> {m.ac}{m.acNote ? ` (${m.acNote})` : ''}</div>
      <div><b>Hit Points</b> {m.hp} {m.hd && <>(<button className="dice-link" onClick={() => roll(m.hd, 'Hit points', name)}>{m.hd}</button>)</>}</div>
      <div><b>Speed</b> {m.speed}</div>
      <hr />
      <div className="sb-abilities">
        {ABILITIES.map(a => {
          const mod = modOf(m.abilities[a]);
          return (
            <button key={a} onClick={() => roll(d20Expr(mod), `${AB_LABEL[a]} check`, name)} title={`Roll ${AB_LABEL[a]} check`}>
              <span>{AB_LABEL[a]}</span><b>{m.abilities[a]}</b><small>{fmtMod(mod)}</small>
            </button>
          );
        })}
      </div>
      <hr />
      <div className="sb-line"><b>Saving Throws</b>{' '}
        {ABILITIES.map(a => {
          const s = m.saves.find(x => x.ab === a);
          const b = s ? s.bonus : modOf(m.abilities[a]);
          return <button key={a} className={'roll-chip sm' + (s ? ' prof' : '')} onClick={() => roll(d20Expr(b), `${AB_LABEL[a]} save`, name)}>{AB_LABEL[a]} {fmtMod(b)}</button>;
        })}
      </div>
      {m.skills.length > 0 && (
        <div className="sb-line"><b>Skills</b>{' '}
          {m.skills.map(s => <button key={s.name} className="roll-chip sm prof" onClick={() => roll(d20Expr(s.bonus), s.name, name)}>{s.name} {fmtMod(s.bonus)}</button>)}
        </div>
      )}
      {m.vuln && <div><b>Damage Vulnerabilities</b> {m.vuln}</div>}
      {m.res && <div><b>Damage Resistances</b> {m.res}</div>}
      {m.imm && <div><b>Damage Immunities</b> {m.imm}</div>}
      {m.condImm && <div><b>Condition Immunities</b> {m.condImm}</div>}
      <div><b>Senses</b> {[m.senses, `passive Perception ${m.pp}`].filter(Boolean).join(', ')}</div>
      <div><b>Languages</b> {m.languages || '—'}</div>
      <div><b>Challenge</b> {crText(m.cr)} ({m.xp.toLocaleString()} XP)</div>
      <hr />
      {m.traits.map((a, i) => <div key={i} className="sb-act"><b>{a.name}.</b> <DiceText text={a.desc} who={name} label={a.name} /></div>)}
      <Section title="Actions" list={m.actions} />
      <Section title="Reactions" list={m.reactions} />
      <Section title="Legendary Actions" list={m.legendary} />
    </div>
  );
}
