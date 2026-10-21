import { useState } from 'react';
import Modal from './Modal';
import DiceText from './DiceText';
import { useCampaign } from '../store';
import { roll } from '../lib/roll';
import { d20Expr, fmtMod, modOf } from '../lib/dice';
import { ABILITIES } from '../types';
import type { Character, DdbSheet } from '../types';

type Tab = 'overview' | 'actions' | 'spells' | 'features' | 'inventory' | 'bio';
const ORD = ['Cantrips', '1st level', '2nd level', '3rd level', '4th level', '5th level', '6th level', '7th level', '8th level', '9th level'];

// Full read-only sheet for a character imported from D&D Beyond. Slots and limited uses can be
// ticked here to track them at the table; the next Sync replaces them with D&D Beyond's numbers.
export default function CharacterSheet({ charId, onClose }: { charId: string; onClose: () => void }) {
  const c = useCampaign(s => s.characters.find(x => x.id === charId));
  const allLoot = useCampaign(s => s.partyLoot);
  const loot = allLoot.filter(l => l.to === charId);
  const [tab, setTab] = useState<Tab>('overview');
  const [preparedOnly, setPreparedOnly] = useState(true);
  if (!c) return null;
  const sh = c.sheet;
  const setSheet = (fn: (s: DdbSheet) => void) => useCampaign.getState().set(d => { const x = d.characters.find(x => x.id === charId); if (x?.sheet) fn(x.sheet as DdbSheet); });
  const who = c.name;

  const tabs: [Tab, string][] = [['overview', 'Overview'], ['actions', 'Actions'], ['spells', 'Spells'], ['features', 'Features'], ['inventory', 'Inventory'], ['bio', 'Background & notes']];

  return (
    <Modal title={c.name} onClose={onClose} wide>
      <div className="sheet-head">
        {c.portrait && <img className="portrait big" src={c.portrait} alt="" />}
        <div className="grow">
          <div>{c.summary}</div>
          <small className="muted">{[sh?.alignment, sh?.background?.name, c.player && `Player: ${c.player}`, sh?.xp != null && `${sh.xp.toLocaleString()} XP`].filter(Boolean).join(' · ')}</small>
        </div>
        <div className="sheet-stats">
          <span><b>{c.ac}</b>AC</span>
          <span><b>{c.hp}/{c.maxHp}</b>HP{c.tempHp ? ` +${c.tempHp}` : ''}</span>
          <span><b>{fmtMod(c.initBonus)}</b>Init</span>
          <span><b>{c.speed ?? '–'}</b>Speed</span>
          <span><b>{c.passivePerception ?? '–'}</b>Passive Perc.</span>
        </div>
      </div>
      {!sh && <p className="callout">This character has only the basics. Press <b>Sync</b> (D&D Beyond characters) to pull in spells, features and the rest.</p>}
      <nav className="sheet-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>

      {tab === 'overview' && (
        <div className="sheet-sec">
          {c.abilities && (
            <div className="sb-abilities">
              {ABILITIES.map(a => (
                <button key={a} onClick={() => roll(d20Expr(modOf(c.abilities![a])), `${a.toUpperCase()} check`, who)}>
                  <span>{a.toUpperCase()}</span><b>{c.abilities![a]}</b><small>{fmtMod(modOf(c.abilities![a]))}</small>
                </button>
              ))}
            </div>
          )}
          <div className="two-col">
            <div>
              <h4 className="sb-h">Saving throws</h4>
              <div className="chip-wrap">{ABILITIES.map(a => <button key={a} className="roll-chip sm" onClick={() => roll(d20Expr(c.saves?.[a] ?? 0), `${a.toUpperCase()} save`, who)}>{a.toUpperCase()} {fmtMod(c.saves?.[a] ?? 0)}</button>)}</div>
              <h4 className="sb-h">Skills</h4>
              <div className="skill-grid">{(c.skills ?? []).map(s => <button key={s.name} className="skill" onClick={() => roll(d20Expr(s.bonus), s.name, who)}><span>{s.name}</span><b>{fmtMod(s.bonus)}</b></button>)}</div>
            </div>
            <div>
              {sh && (
                <>
                  <Facts rows={[
                    ['Senses', [...sh.senses, `Passive Perception ${c.passivePerception ?? 10}`].join(', ')],
                    ['Other speeds', sh.speeds.join(', ')],
                    ['Hit dice', sh.hitDice.map(h => `${h.total - h.used}/${h.total} ${h.die}`).join(', ')],
                    ['Death saves', sh.deathSaves && (sh.deathSaves.success || sh.deathSaves.fail) ? `${sh.deathSaves.success} successes, ${sh.deathSaves.fail} failures` : ''],
                    ['Inspiration', sh.inspiration ? 'Yes' : ''],
                    ['Resistances', sh.defenses.resist.join(', ')],
                    ['Immunities', [...sh.defenses.immune, ...sh.defenses.condImmune].join(', ')],
                    ['Vulnerabilities', sh.defenses.vuln.join(', ')],
                    ['Armor', sh.proficiencies.armor.join(', ')],
                    ['Weapons', sh.proficiencies.weapons.join(', ')],
                    ['Tools', sh.proficiencies.tools.join(', ')],
                    ['Languages', sh.proficiencies.languages.join(', ')],
                    ['Other', sh.proficiencies.other.join(', ')],
                  ]} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div className="sheet-sec">
          <h4 className="sb-h">Attacks</h4>
          {!c.attacks?.length && <p className="hint">No equipped weapons.</p>}
          {c.attacks?.map(a => (
            <div key={a.name} className="sheet-row">
              <b className="grow">{a.name}</b>
              {a.toHit != null && <button className="roll-chip" onClick={() => roll(d20Expr(a.toHit!), `${a.name} attack`, who)}>{fmtMod(a.toHit)} to hit</button>}
              {a.damage && <button className="roll-chip" onClick={() => roll(a.damage!, `${a.name} damage`, who)}>{a.damage}</button>}
              <small className="muted">{a.notes}</small>
            </div>
          ))}
          {!!sh?.spellcasting.length && (
            <>
              <h4 className="sb-h">Spell attacks</h4>
              {sh.spellcasting.map(sc => (
                <div key={sc.cls} className="sheet-row">
                  <b className="grow">{sc.cls} ({sc.ability})</b>
                  <span className="ac-badge">Save DC {sc.dc}</span>
                  <button className="roll-chip" onClick={() => roll(d20Expr(sc.attack), `${sc.cls} spell attack`, who)}>{fmtMod(sc.attack)} to hit</button>
                </div>
              ))}
            </>
          )}
          {!!sh?.actions.length && (
            <>
              <h4 className="sb-h">Features you use</h4>
              {sh.actions.map((a, i) => (
                <details key={i} className="sheet-detail">
                  <summary>
                    <b>{a.name}</b> <small className="muted">{a.source}</small>
                    {a.uses && <Pips max={a.uses.max} used={a.uses.used} label={a.uses.reset && `per ${a.uses.reset}`} onChange={u => setSheet(s => { s.actions[i].uses!.used = u; })} />}
                  </summary>
                  <div className="desc"><DiceText text={a.desc} who={who} label={a.name} /></div>
                </details>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'spells' && (
        <div className="sheet-sec">
          {!sh?.spells.length && <p className="hint">No spells.</p>}
          {sh && sh.spellcasting.length > 0 && (
            <div className="chip-wrap">
              {sh.spellcasting.map(sc => <span key={sc.cls} className="ac-badge">{sc.cls}: DC {sc.dc} · {fmtMod(sc.attack)} to hit</span>)}
            </div>
          )}
          {sh && (sh.slots.length > 0 || sh.pact) && (
            <div className="slots">
              {sh.slots.map((s, i) => <div key={s.level} className="slot-row"><span>{ORD[s.level]}</span><Pips max={s.max} used={s.used} onChange={u => setSheet(x => { x.slots[i].used = u; })} /></div>)}
              {sh.pact && <div className="slot-row"><span>Pact ({ORD[sh.pact.level]})</span><Pips max={sh.pact.max} used={sh.pact.used} onChange={u => setSheet(x => { x.pact!.used = u; })} /></div>}
            </div>
          )}
          {!!sh?.spells.length && <label className="check"><input type="checkbox" checked={preparedOnly} onChange={e => setPreparedOnly(e.target.checked)} /> Prepared and known only</label>}
          {sh && ORD.map((label, lvl) => {
            const list = sh.spells.filter(s => s.level === lvl && (!preparedOnly || s.prepared));
            if (!list.length) return null;
            return (
              <div key={lvl}>
                <h4 className="sb-h">{label}</h4>
                {list.map((s, i) => (
                  <details key={s.name + i} className={'sheet-detail' + (s.prepared ? '' : ' dim')}>
                    <summary>
                      <b>{s.name}</b>
                      {s.concentration && <span className="tag" title="Concentration">C</span>}
                      {s.ritual && <span className="tag" title="Ritual">R</span>}
                      {s.always && <span className="tag">always</span>}
                      {!s.prepared && <span className="tag">not prepared</span>}
                      <small className="muted"> {[s.source, s.time, s.range].filter(Boolean).join(' · ')}</small>
                    </summary>
                    <div className="desc">
                      <small className="muted block">{[s.school, s.components && `Components: ${s.components}`, s.duration && `Duration: ${s.duration}`].filter(Boolean).join(' · ')}</small>
                      <DiceText text={s.desc} who={who} label={s.name} />
                    </div>
                  </details>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'features' && (
        <div className="sheet-sec">
          {!sh?.features.length && <p className="hint">No features recorded.</p>}
          {sh && [...new Set(sh.features.map(f => f.source ?? 'Other'))].map(src => (
            <div key={src}>
              <h4 className="sb-h">{src}</h4>
              {sh.features.filter(f => (f.source ?? 'Other') === src).map((f, i) => (
                <details key={f.name + i} className="sheet-detail">
                  <summary><b>{f.name}</b>{f.level ? <small className="muted"> level {f.level}</small> : null}</summary>
                  <div className="desc"><DiceText text={f.desc} who={who} label={f.name} /></div>
                </details>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="sheet-sec">
          {sh && (
            <div className="coins-row">
              {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).map(k => <span key={k} className={'coin c-' + k}><b>{sh.currency[k]}</b> {k}</span>)}
            </div>
          )}
          {loot.length > 0 && (
            <>
              <h4 className="sb-h">Given at the table</h4>
              {loot.map(it => <div key={it.id} className="sheet-row"><b className="grow">{it.name}{it.q > 1 ? ` ×${it.q}` : ''}</b><small className="muted">{it.desc}</small></div>)}
            </>
          )}
          <h4 className="sb-h">On D&D Beyond</h4>
          {!sh?.inventory.length && <p className="hint">Nothing recorded.</p>}
          {sh?.inventory.map((it, i) => (
            <details key={it.name + i} className="sheet-detail">
              <summary>
                <b>{it.name}</b>{it.q > 1 ? ` ×${it.q}` : ''}
                {it.equipped && <span className="tag">equipped</span>}
                {it.attuned && <span className="tag">attuned</span>}
                {it.rarity && <span className="tag">{it.rarity}</span>}
                <small className="muted"> {it.type}{it.weight ? ` · ${it.weight * it.q} lb` : ''}</small>
              </summary>
              {it.desc && <div className="desc"><DiceText text={it.desc} who={who} label={it.name} /></div>}
            </details>
          ))}
        </div>
      )}

      {tab === 'bio' && (
        <div className="sheet-sec">
          {sh?.background && (<><h4 className="sb-h">Background: {sh.background.name}</h4><p className="desc">{sh.background.desc}</p></>)}
          {sh?.bio.length ? <Facts rows={sh.bio.map(b => [b.label, b.value])} /> : null}
          {sh?.traits.map(t => (<div key={t.label}><h4 className="sb-h">{t.label}</h4><p className="desc">{t.text}</p></div>))}
          {sh?.notes.map(t => (<div key={t.label}><h4 className="sb-h">{t.label}</h4><p className="desc">{t.text}</p></div>))}
          {sh && !sh.background && !sh.traits.length && !sh.notes.length && !sh.bio.length && <p className="hint">Nothing written yet.</p>}
        </div>
      )}
    </Modal>
  );
}

function Facts({ rows }: { rows: [string, string | undefined | false][] }) {
  return <dl className="facts">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

// Click a pip to mark it used; click the last used pip to clear it.
function Pips({ max, used, onChange, label }: { max: number; used: number; onChange: (u: number) => void; label?: string | false }) {
  return (
    <span className="pips" onClick={e => e.preventDefault()}>
      {Array.from({ length: max }, (_, i) => (
        <button key={i} className={'pip' + (i < used ? ' used' : '')} aria-label={`${i < used ? 'Used' : 'Available'} ${i + 1} of ${max}`}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(i < used ? i : i + 1); }} />
      ))}
      {label && <small className="muted">{label}</small>}
    </span>
  );
}

export const hasSheet = (c: Character) => !!c.sheet;
