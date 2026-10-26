// Shared description of an on-screen effect. The DM window builds these and sends them to the
// table window, which draws them; the DM window plays the matching sounds on the same timeline.

export type Element = 'physical' | 'fire' | 'cold' | 'lightning' | 'acid' | 'poison' | 'necrotic' | 'radiant' | 'force' | 'thunder' | 'psychic';
export type Weapon = 'sword' | 'scimitar' | 'axe' | 'club' | 'dagger' | 'spear' | 'bite' | 'claw' | 'slam' | 'touch';
export type Missile = 'arrow' | 'bolt' | 'stone' | 'thrown' | 'boulder' | 'orb' | 'ray' | 'lightning' | 'darts';
export type Result = 'hit' | 'miss' | 'crit';
export type FxKind = 'melee' | 'missile' | 'burst' | 'cone' | 'line' | 'heal' | 'poof';

export interface Pt { x: number; y: number }
export interface FxEvent {
  id: string;
  sceneId: string;
  at: number; // Date.now() when it starts
  kind: FxKind;
  from?: Pt;
  to: Pt;
  weapon?: Weapon;
  missile?: Missile;
  element: Element;
  result?: Result; // attacks only
  radius?: number; // burst radius in px
  angle?: number; // cone/line direction (radians)
  length?: number; // cone/line length in px
  grid: number; // px per square, for sizing
}

// Fire, lightning, radiant and force give off light in dark scenes.
export const EMITS_LIGHT: Element[] = ['fire', 'lightning', 'radiant', 'force'];

export const ELEMENT_COLOR: Record<Element, [string, string]> = {
  physical: ['#ffffff', '#ef4444'],
  fire: ['#fff3b0', '#f97316'],
  cold: ['#e0f7ff', '#38bdf8'],
  lightning: ['#ffffff', '#60a5fa'],
  acid: ['#ecfccb', '#84cc16'],
  poison: ['#d9f99d', '#16a34a'],
  necrotic: ['#e9d5ff', '#6b21a8'],
  radiant: ['#fffbeb', '#facc15'],
  force: ['#f5f3ff', '#8b5cf6'],
  thunder: ['#f1f5f9', '#94a3b8'],
  psychic: ['#fce7f3', '#ec4899'],
};

export const ELEMENTS: { id: Element; label: string }[] = [
  { id: 'fire', label: 'Fire' }, { id: 'cold', label: 'Cold' }, { id: 'lightning', label: 'Lightning' }, { id: 'acid', label: 'Acid' },
  { id: 'poison', label: 'Poison' }, { id: 'necrotic', label: 'Necrotic' }, { id: 'radiant', label: 'Radiant' }, { id: 'force', label: 'Force' },
  { id: 'thunder', label: 'Thunder' }, { id: 'psychic', label: 'Psychic' },
];

export function elementOf(damageType?: string): Element {
  const t = (damageType ?? '').toLowerCase();
  for (const e of ELEMENTS) if (t.includes(e.id)) return e.id;
  return 'physical';
}

// Speeds in squares per second.
const SPEED: Record<Missile, number> = { arrow: 24, bolt: 28, stone: 18, thrown: 13, boulder: 9, orb: 12, ray: 40, lightning: 200, darts: 12 };

// Timeline of an effect in ms: when it lands and when it's finished.
export function timeline(fx: FxEvent): { impact: number; total: number; travel: number } {
  const dist = fx.from ? Math.hypot(fx.to.x - fx.from.x, fx.to.y - fx.from.y) / fx.grid : 0;
  switch (fx.kind) {
    case 'melee': return { travel: 420, impact: 440, total: 1150 };
    case 'missile': {
      const travel = Math.max(120, (dist / SPEED[fx.missile ?? 'arrow']) * 1000);
      return { travel, impact: travel, total: travel + (fx.missile === 'orb' && fx.radius ? 1600 : fx.result === 'miss' ? 450 : 900) };
    }
    case 'burst': {
      const travel = fx.from ? Math.max(150, (dist / SPEED.orb) * 1000) : 0;
      return { travel, impact: travel, total: travel + 1500 };
    }
    case 'cone': return { travel: 0, impact: 120, total: 1300 };
    case 'line': return { travel: 0, impact: 60, total: 1100 };
    case 'heal': return { travel: 0, impact: 0, total: 1400 };
    case 'poof': return { travel: 0, impact: 0, total: 900 };
  }
}

// Works out what an attack looks like from its name, description and damage type.
export function classifyAttack(name: string, desc: string, damageType: string | undefined, distanceSq: number): Pick<FxEvent, 'kind' | 'weapon' | 'missile' | 'element'> {
  const n = name.toLowerCase(), d = desc.toLowerCase();
  const element = elementOf(damageType);
  const spell = /spell attack/.test(d) || (element !== 'physical' && !/weapon attack/.test(d) && !/bite|claw|slam|sting/.test(n));
  const rangedOnly = /ranged (weapon|spell) attack/.test(d) && !/melee or ranged/.test(d);
  const either = /melee or ranged/.test(d) || /javelin|dagger|handaxe|spear|trident|hammer|dart/.test(n);
  const ranged = rangedOnly || /bow|sling|crossbow|blowgun|rock|boulder|spit|spike|spine|eldritch|bolt|ray|missile/.test(n) || (either && distanceSq > 1.6) || (!/melee/.test(d) && distanceSq > 2.5);

  if (spell) {
    if (/lightning|shock|thunderbolt/.test(n) || element === 'lightning') return { kind: ranged ? 'missile' : 'melee', missile: 'lightning', weapon: 'touch', element: 'lightning' };
    if (/magic missile/.test(n)) return { kind: 'missile', missile: 'darts', element: 'force' };
    if (/ray|beam|eldritch/.test(n)) return { kind: ranged ? 'missile' : 'melee', missile: 'ray', weapon: 'touch', element: element === 'physical' ? 'force' : element };
    return ranged || distanceSq > 1.6 ? { kind: 'missile', missile: 'orb', element: element === 'physical' ? 'force' : element } : { kind: 'melee', weapon: 'touch', element: element === 'physical' ? 'force' : element };
  }
  if (ranged) {
    const missile: Missile = /crossbow|bolt/.test(n) ? 'bolt' : /sling|stone/.test(n) ? 'stone' : /rock|boulder/.test(n) ? 'boulder' : /bow|blowgun|spine|spike|dart/.test(n) ? 'arrow' : /javelin|dagger|axe|spear|hammer|trident/.test(n) ? 'thrown' : 'arrow';
    return { kind: 'missile', missile, element };
  }
  const weapon: Weapon =
    /scimitar|sickle|katana/.test(n) ? 'scimitar'
      : /sword|blade|rapier|saber/.test(n) ? 'sword'
        : /axe/.test(n) ? 'axe'
          : /dagger|knife|shiv/.test(n) ? 'dagger'
            : /spear|pike|lance|trident|glaive|halberd|javelin|horn|gore|tusk|sting|stinger/.test(n) ? 'spear'
              : /bite|jaws|beak|fangs/.test(n) ? 'bite'
                : /claw|talon|rake/.test(n) ? 'claw'
                  : /mace|club|hammer|maul|flail|morningstar|staff|greatclub|cudgel/.test(n) ? 'club'
                    : /slam|fist|unarmed|punch|tentacle|tail|hoof|hooves|kick|headbutt|ram/.test(n) ? 'slam'
                      : damageType?.toLowerCase().includes('slash') ? 'sword' : damageType?.toLowerCase().includes('pierc') ? 'spear' : 'club';
  return { kind: 'melee', weapon, element };
}
