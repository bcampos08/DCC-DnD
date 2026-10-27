import { create } from 'zustand';
import type { Camera, TemplateShape } from './types';
import type { Adv } from './lib/dice';
import type { FxEvent } from './lib/fx/core';

export type Tool =
  | 'select' | 'ruler' | 'ping'
  | 'fog-reveal-rect' | 'fog-hide-rect' | 'fog-reveal-brush' | 'fog-hide-brush'
  | 'pen' | 'line' | 'rect' | 'circle' | 'text' | 'erase'
  | `tpl-${TemplateShape}`
  | 'grid-align';

export type Tab = 'combat' | 'monsters' | 'party' | 'loot' | 'scenes' | 'notes' | 'docs' | 'log';

interface UI {
  tool: Tool;
  selected: string[];
  selectedTemplate: string | null;
  tab: Tab;
  monsterId: string | null; // stat block on display
  rollHidden: boolean;
  adv: Adv;
  camera: Record<string, Camera>; // DM camera per scene
  viewport: { w: number; h: number };
  color: string;
  strokeWidth: number;
  fillShapes: boolean;
  dmOnlyDraw: boolean;
  brush: number; // fog brush radius in squares
  tplColor: string;
  cameraNonce: number;
  tableCamera: { cx: number; cy: number; viewW: number } | null;
  trayRolls: number; // how many recent rolls the dice tray shows
  targeting: Targeting | null; // waiting for the DM to click a target on the map
  fx: FxEvent[]; // animations running on the DM's own map
  selectedDrawing: string | null;
  // Next area template drawn becomes this spell effect instead (from the token card's Wall / Cone).
  openDoc: string | null; // document open full screen
  pendingEffect: { style: 'wall' | 'cone'; element: string; duration: string; label: string; casterEntry?: string } | null;
  toasts: { id: number; text: string; action?: { label: string; run: () => void } }[];
  set: (p: Partial<UI> | ((s: UI) => Partial<UI>)) => void;
  toast: (text: string, action?: { label: string; run: () => void }) => void;
}

export interface Pick { tokenId?: string; x: number; y: number; shift: boolean }
export interface Targeting {
  hint: string;
  allowPoint: boolean; // can click empty map as well as tokens
  rolls?: boolean; // makes a roll (so Hidden/Public matters for the animation)
  onPick: (p: Pick) => void;
  onCancel?: () => void; // Esc
}

let tid = 1;
function savedTrayRolls() {
  try { const n = parseInt(localStorage.getItem('dcc.trayRolls') ?? '', 10); return n >= 0 && n <= 20 ? n : 1; } catch { return 1; }
}
export function setTrayRolls(n: number) {
  const v = Math.max(0, Math.min(20, n));
  try { localStorage.setItem('dcc.trayRolls', String(v)); } catch { /* private mode */ }
  useUI.getState().set({ trayRolls: v });
}
export const useUI = create<UI>()((set, get) => ({
  tool: 'select', selected: [], selectedTemplate: null, tab: 'combat', monsterId: null,
  rollHidden: true, adv: 'normal', camera: {}, viewport: { w: 1, h: 1 },
  color: '#e11d48', strokeWidth: 4, fillShapes: false, dmOnlyDraw: false, brush: 1.5, tplColor: '#f97316',
  cameraNonce: 0, tableCamera: null, toasts: [], trayRolls: savedTrayRolls(), targeting: null, fx: [], selectedDrawing: null, pendingEffect: null, openDoc: null,
  set: p => set(typeof p === 'function' ? p : () => p),
  toast: (text, action) => {
    const id = tid++;
    set(s => ({ toasts: [...s.toasts, { id, text, action }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), action ? 20000 : 4000);
  },
}));
