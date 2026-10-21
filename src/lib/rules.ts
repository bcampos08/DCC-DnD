export const CONDITIONS: { id: string; label: string; short: string; color: string; desc: string }[] = [
  { id: 'blinded', label: 'Blinded', short: 'Bl', color: '#6b7280', desc: "Can't see; auto-fails sight checks. Attacks against it have advantage; its attacks have disadvantage." },
  { id: 'charmed', label: 'Charmed', short: 'Ch', color: '#ec4899', desc: "Can't attack the charmer. Charmer has advantage on social checks against it." },
  { id: 'deafened', label: 'Deafened', short: 'De', color: '#9ca3af', desc: "Can't hear; auto-fails hearing checks." },
  { id: 'frightened', label: 'Frightened', short: 'Fr', color: '#a855f7', desc: "Disadvantage on checks and attacks while it can see the source. Can't move closer to it." },
  { id: 'grappled', label: 'Grappled', short: 'Gr', color: '#d97706', desc: 'Speed is 0.' },
  { id: 'incapacitated', label: 'Incapacitated', short: 'In', color: '#78716c', desc: "Can't take actions or reactions." },
  { id: 'invisible', label: 'Invisible', short: 'Iv', color: '#38bdf8', desc: 'Attacks against it have disadvantage; its attacks have advantage.' },
  { id: 'paralyzed', label: 'Paralyzed', short: 'Pa', color: '#eab308', desc: 'Incapacitated, can’t move or speak. Fails Str and Dex saves. Hits within 5 ft are crits.' },
  { id: 'petrified', label: 'Petrified', short: 'Pe', color: '#a8a29e', desc: 'Turned to stone. Incapacitated, resistant to all damage, immune to poison and disease.' },
  { id: 'poisoned', label: 'Poisoned', short: 'Po', color: '#22c55e', desc: 'Disadvantage on attack rolls and ability checks.' },
  { id: 'prone', label: 'Prone', short: 'Pr', color: '#b45309', desc: 'Crawls. Disadvantage on attacks. Melee attacks against it have advantage, ranged have disadvantage.' },
  { id: 'restrained', label: 'Restrained', short: 'Re', color: '#f97316', desc: 'Speed 0. Disadvantage on attacks and Dex saves. Attacks against it have advantage.' },
  { id: 'stunned', label: 'Stunned', short: 'St', color: '#facc15', desc: 'Incapacitated, can’t move, speaks falteringly. Fails Str and Dex saves. Attacks against it have advantage.' },
  { id: 'unconscious', label: 'Unconscious', short: 'Un', color: '#1f2937', desc: 'Incapacitated, prone, drops what it holds. Fails Str and Dex saves. Hits within 5 ft are crits.' },
  { id: 'exhaustion', label: 'Exhaustion', short: 'Ex', color: '#7c2d12', desc: 'Levels 1–6: disadvantage on checks, half speed, disadvantage on attacks and saves, half max HP, speed 0, death.' },
  { id: 'blessed', label: 'Blessed', short: 'Bs', color: '#fde047', desc: '+1d4 to attack rolls and saving throws.' },
  { id: 'hasted', label: 'Hasted', short: 'Ha', color: '#0ea5e9', desc: '+2 AC, double speed, advantage on Dex saves, one extra limited action.' },
  { id: 'hexed', label: 'Hexed / Marked', short: 'Hx', color: '#7e22ce', desc: 'Takes extra damage from the caster; maybe disadvantage on one ability.' },
  { id: 'dodging', label: 'Dodging', short: 'Do', color: '#14b8a6', desc: 'Attacks against it have disadvantage; advantage on Dex saves.' },
];
export const COND = Object.fromEntries(CONDITIONS.map(c => [c.id, c]));

export const SIZE_SQUARES: Record<string, number> = { Tiny: 0.5, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 };

export const crText = (cr: number) => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr));

// Monster colours stay warm/earthy so they don't look like the party's blue/green tokens.
export const TOKEN_COLORS = ['#b91c1c', '#c2410c', '#a16207', '#7c2d12', '#6d28d9', '#a21caf', '#be123c', '#334155', '#57534e', '#4d7c0f'];
export const PC_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#65a30d', '#ca8a04'];
