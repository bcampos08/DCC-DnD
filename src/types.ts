export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export interface MonsterAction {
  name: string;
  desc: string;
  atk?: number;
  dmg?: { dice: string; type: string }[];
  dc?: { ab?: string; value: number };
}

export interface Monster {
  id: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  acNote: string;
  hp: number;
  hd: string;
  speed: string;
  abilities: Record<Ability, number>;
  saves: { ab: string; bonus: number }[];
  skills: { name: string; bonus: number }[];
  vuln: string;
  res: string;
  imm: string;
  condImm: string;
  senses: string;
  pp: number;
  languages: string;
  cr: number;
  xp: number;
  traits: MonsterAction[];
  actions: MonsterAction[];
  reactions?: MonsterAction[];
  legendary?: MonsterAction[];
  custom?: boolean;
}

export interface Character {
  id: string;
  name: string;
  player?: string;
  summary?: string; // e.g. "Level 3 Wood Elf Ranger"
  portrait?: string; // remote URL
  ac: number;
  maxHp: number;
  hp: number;
  tempHp: number;
  initBonus: number;
  passivePerception?: number;
  speed?: string;
  abilities?: Record<Ability, number>;
  saves?: Partial<Record<Ability, number>>;
  skills?: { name: string; bonus: number }[];
  attacks?: { name: string; toHit?: number; damage?: string; notes?: string }[];
  ddbInventory?: { name: string; q: number; equipped?: boolean }[]; // read-only copy from D&D Beyond
  conditions: string[];
  concentrating?: boolean;
  ddbId?: string;
  syncedAt?: number;
  color: string;
}

export interface Token {
  id: string;
  name: string;
  x: number; // centre, in map pixels
  y: number;
  size: number; // in squares (0.5 tiny, 1 medium, 2 large, 3 huge, 4 gargantuan)
  color: string;
  image?: string; // asset id or URL
  kind: 'monster' | 'pc' | 'npc';
  monsterId?: string;
  charId?: string; // for PCs, HP etc live on the character
  hidden: boolean;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  conditions: string[];
  concentrating?: boolean;
}

export type FogOp =
  | { t: 'rect'; mode: 'reveal' | 'hide'; x: number; y: number; w: number; h: number }
  | { t: 'brush'; mode: 'reveal' | 'hide'; r: number; pts: number[] }
  | { t: 'all'; mode: 'reveal' | 'hide' };

export type Drawing =
  | { id: string; t: 'pen'; pts: number[]; color: string; width: number; dmOnly?: boolean }
  | { id: string; t: 'line'; pts: number[]; color: string; width: number; dmOnly?: boolean }
  | { id: string; t: 'rect'; x: number; y: number; w: number; h: number; color: string; width: number; fill?: boolean; dmOnly?: boolean }
  | { id: string; t: 'circle'; x: number; y: number; r: number; color: string; width: number; fill?: boolean; dmOnly?: boolean }
  | { id: string; t: 'text'; x: number; y: number; text: string; color: string; size: number; dmOnly?: boolean };

export type TemplateShape = 'circle' | 'cone' | 'cube' | 'line';
export interface AreaTemplate {
  id: string;
  shape: TemplateShape;
  x: number; // origin
  y: number;
  angle: number; // radians
  feet: number; // radius / length / side
  color: string;
}

export interface Grid {
  show: boolean;
  size: number; // pixels per square on the map image
  offsetX: number;
  offsetY: number;
  color: string;
  opacity: number;
  snap: boolean;
  feet: number; // feet per square
}

export interface Camera { x: number; y: number; scale: number }

export interface Scene {
  id: string;
  name: string;
  map?: { src: string; width: number; height: number }; // src: asset id ("asset:...") or URL
  grid: Grid;
  tokens: Token[];
  drawings: Drawing[];
  templates: AreaTemplate[];
  fog: { enabled: boolean; ops: FogOp[] };
  tableCamera?: Camera;
}

export interface InitEntry {
  id: string;
  name: string;
  tokenIds: string[]; // more than one = group
  charId?: string;
  init: number | null;
  dex: number; // tie breaker
  monsterId?: string;
}

export interface Encounter {
  active: boolean;
  round: number;
  turn: number;
  entries: InitEntry[];
}

export interface RollPart { dice: string; rolls: number[]; kept: boolean[]; sides: number }
export interface RollResult {
  id: string;
  at: number;
  label: string;
  who: string;
  expr: string;
  total: number;
  breakdown: string;
  hidden: boolean;
  crit?: boolean;
  fumble?: boolean;
  parts?: RollResult[]; // e.g. attack + damage
}

export interface LootItem { id: string; name: string; q: number; rarity: string; desc: string; value?: string; cat: string; to?: string; at: number }

export interface Campaign {
  name: string;
  scenes: Scene[];
  activeSceneId: string;
  tableSceneId: string;
  characters: Character[];
  encounter: Encounter;
  rolls: RollResult[];
  partyLoot: LootItem[];
  customMonsters: Monster[];
  settings: { diagonal: '5' | '5-10'; showMonsterNames: boolean; partyLevel: number };
}
