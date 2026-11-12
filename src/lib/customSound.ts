import { getAssetBlob } from './assets';
import type { CustomSound } from '../types';

// Plays a sound file the DM uploaded. Returns false if it couldn't be played, so the
// built-in sound can play instead.
let current: HTMLAudioElement | null = null;
export async function playCustomSound(s: CustomSound, volume: number): Promise<boolean> {
  try {
    const blob = await getAssetBlob(s.asset);
    if (!blob) return false;
    // Files restored from the cloud can lose their type; put it back so the browser knows it's audio.
    const typed = blob.type && blob.type !== 'application/octet-stream' ? blob : new Blob([blob], { type: s.mime || 'audio/mpeg' });
    const url = URL.createObjectURL(typed);
    current?.pause();
    const a = new Audio(url);
    current = a;
    a.volume = Math.max(0, Math.min(1, volume));
    a.onended = () => URL.revokeObjectURL(url);
    await a.play();
    return true;
  } catch {
    return false;
  }
}
export const stopCustomSound = () => { current?.pause(); current = null; };
