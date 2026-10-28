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
  image?: string; // uploaded picture ("asset:..."), shown instead of the portrait; kept through D&D Beyond syncs
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
  sheet?: DdbSheet; // everything else read from D&D Beyond
  deathSaves?: { success: number; fail: number }; // tracked at the table while at 0 HP
  darkvision?: number; // feet
  // Hand-made characters: what saves and skills are worked out from
  level?: number;
  saveProf?: Ability[];
  skillProf?: Record<string, number>; // 1 proficient, 2 expertise
  notes?: string;
  fxPick?: FxPick; // last effect chosen for this character (follows them across scenes)
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
  note?: string; // DM-only note for this one token
  light?: number; // feet of light this token carries (torch 40, lantern 60)
  fxPick?: FxPick; // last effect chosen in the token card's Play an effect
}

// auto: cleared by a player token moving (counts as "explored"); otherwise drawn by the DM.
export type FogOp =
  | { t: 'rect'; mode: 'reveal' | 'hide'; x: number; y: number; w: number; h: number; auto?: boolean }
  | { t: 'brush'; mode: 'reveal' | 'hide'; r: number; pts: number[]; auto?: boolean }
  | { t: 'all'; mode: 'reveal' | 'hide'; auto?: boolean };

// tf: moved/rotated/resized with the select tool (applied on top of the original shape)
export interface DrawTf { x: number; y: number; rot: number; sx: number; sy: number }
export type Drawing = { tf?: DrawTf } & (
  | { id: string; t: 'pen'; pts: number[]; color: string; width: number; dmOnly?: boolean }
  | { id: string; t: 'line'; pts: number[]; color: string; width: number; dmOnly?: boolean }
  | { id: string; t: 'rect'; x: number; y: number; w: number; h: number; color: string; width: number; fill?: boolean; dmOnly?: boolean }
  | { id: string; t: 'circle'; x: number; y: number; r: number; color: string; width: number; fill?: boolean; dmOnly?: boolean }
  | { id: string; t: 'text'; x: number; y: number; text: string; color: string; size: number; dmOnly?: boolean });

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
  folderId?: string; // scene folder it lives in; none = top level
  map?: { src: string; width: number; height: number }; // src: asset id ("asset:...") or URL
  grid: Grid;
  tokens: Token[];
  drawings: Drawing[];
  templates: AreaTemplate[];
  // autoReveal: player tokens clear fog around them as they move. light 'dark' = only darkvision and carried light count.
  fog: { enabled: boolean; ops: FogOp[]; autoReveal?: boolean; light?: 'lit' | 'dark'; sightFeet?: number };
  effects?: LastingFx[]; // spell effects that stay on the map for a while
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
  note?: string; // DM notes (for added entries like lair actions)
  fxPick?: FxPick; // effect set up for this entry
}

export interface Encounter {
  active: boolean;
  round: number;
  turn: number;
  entries: InitEntry[];
  // Tokens players have seen during this fight. They stay in the players' turn order even if hidden again.
  seenTokens?: string[];
  sceneId?: string; // where the fight is happening
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
  // fx: attack animations on the table screen; fxSound/fxVolume: their sound effects
  settings: { diagonal: '5' | '5-10'; showMonsterNames: boolean; partyLevel: number; fx?: boolean; fxSound?: boolean; fxVolume?: number };
  monsterNotes: Record<string, string>; // by monster id, shared by every copy
  sceneFolders: SceneFolder[];
  docs: Doc[];
  docFolders: SceneFolder[];
  notes: Note[];
}

// ----- Full character sheet read from D&D Beyond -----
export interface SheetText { name: string; desc: string; source?: string; level?: number }
export interface SheetSpell {
  name: string; level: number; school: string; time: string; range: string; components: string; duration: string;
  concentration: boolean; ritual: boolean; desc: string; prepared: boolean; always: boolean; source: string;
}
export interface SheetAction { name: string; desc: string; source: string; uses?: { max: number; used: number; reset: string } }
export interface SheetItem { name: string; q: number; equipped: boolean; attuned: boolean; weight?: number; rarity?: string; type?: string; desc?: string; magic?: boolean }
export interface DdbSheet {
  alignment?: string;
  xp?: number;
  inspiration?: boolean;
  background?: SheetText;
  hitDice: { die: string; total: number; used: number }[];
  deathSaves?: { success: number; fail: number };
  senses: string[];
  speeds: string[];
  proficiencies: { armor: string[]; weapons: string[]; tools: string[]; languages: string[]; other: string[] };
  defenses: { resist: string[]; immune: string[]; vuln: string[]; condImmune: string[] };
  spellcasting: { cls: string; ability: string; dc: number; attack: number }[];
  slots: { level: number; max: number; used: number }[];
  pact?: { level: number; max: number; used: number };
  spells: SheetSpell[];
  actions: SheetAction[];
  features: SheetText[];
  inventory: SheetItem[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  traits: { label: string; text: string }[];
  notes: { label: string; text: string }[];
  bio: { label: string; value: string }[];
}

export interface Note { id: string; title: string; body: string; sceneId?: string; updatedAt: number }

export interface SceneFolder { id: string; name: string; parentId?: string; collapsed?: boolean }

export interface FxPick { pick: string; element: string; toHit: string; dice: string; radius?: string; dur?: string }

// A spell effect that stays on the map (wall of fire, lingering cloud, burning ground...).
export interface LastingFx {
  id: string;
  label: string;
  kind: 'area' | 'ring' | 'wall' | 'cone';
  element: string;
  x: number; y: number; // centre (area/ring) or start point (wall/cone)
  r?: number; // area/ring radius in px
  angle?: number; length?: number; // wall/cone
  startedAt: number;
  endsAt?: number; // Date.now() when it stops (seconds-based)
  endsRound?: number; // combat round when it stops (rounds-based)
  endsOnEntry?: string; // ...at the start of this initiative entry's turn (the caster's)
}

// A document dropped into the Docs tab. The original file is kept as an asset;
// Word and text files also keep their (editable) contents here.
export interface Doc {
  id: string;
  name: string;
  folderId?: string;
  kind: 'pdf' | 'word' | 'text' | 'image' | 'other';
  mime: string;
  size: number;
  asset: string; // "asset:..." original file
  html?: string; // word: converted, editable
  text?: string; // text: editable
  addedAt: number;
  editedAt?: number;
}
