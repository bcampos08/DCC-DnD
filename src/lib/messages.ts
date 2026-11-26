import { useCampaign } from '../store';
import { uid } from './id';
import { textSound } from './fx/sound';

// How long the table shows "typing…" before a new message appears.
export const TYPING_MS = 1300;

export function sendMessage(from: string, text: string) {
  const t = text.trim();
  if (!t) return;
  const st = useCampaign.getState();
  st.set(d => {
    d.messages = [...(d.messages ?? []), { id: uid(), from: from.trim(), text: t, at: Date.now() }].slice(-100);
    d.messagesHidden = false;
  });
  const s = st.settings;
  if (s.fxSound !== false) textSound(s.fxVolume ?? 0.7, TYPING_MS);
}
