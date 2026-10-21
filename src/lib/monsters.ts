import { useEffect, useState } from 'react';
import type { Monster } from '../types';
import { useCampaign } from '../store';

let cache: Monster[] | null = null;
let pending: Promise<Monster[]> | null = null;

export function loadSrd(): Promise<Monster[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch('/data/monsters.json').then(r => r.json()).then((d: Monster[]) => (cache = d));
  return pending;
}

export function useMonsters() {
  const [srd, setSrd] = useState<Monster[]>(cache ?? []);
  const custom = useCampaign(s => s.customMonsters);
  useEffect(() => { loadSrd().then(setSrd); }, []);
  return [...custom, ...srd];
}

export const findMonster = (id: string | undefined) => {
  if (!id) return undefined;
  return useCampaign.getState().customMonsters.find(m => m.id === id) ?? cache?.find(m => m.id === id);
};
