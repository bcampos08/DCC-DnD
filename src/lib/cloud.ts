import { createClient, type User } from '@supabase/supabase-js';
import { campaignData, useCampaign } from '../store';
import { getAssetBlob, putAsset } from './assets';
import type { Campaign } from '../types';

// Cloud save in the DM's Supabase project. The publishable key is meant to be public;
// row-level security (supabase/setup.sql) keeps each account's save private.
const URL_ = 'https://viujtwtbctxdflguiatm.supabase.co';
const KEY = 'sb_publishable_tROP_mQR4Cbk_tdDlVYDsg_RIsB48qD';
const BUCKET = 'campaign-assets';

export const supabase = createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true } });

export async function currentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error.message));
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(friendly(error.message));
  return { needsConfirm: !data.session };
}

export const signOut = () => supabase.auth.signOut();

function friendly(msg: string) {
  if (/invalid login/i.test(msg)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(msg)) return 'Check your email and click the confirmation link first.';
  if (/already registered/i.test(msg)) return 'That email already has an account. Use Sign in.';
  if (/relation .* does not exist|schema cache/i.test(msg)) return 'The cloud table is missing. Run supabase/setup.sql in the Supabase SQL editor.';
  if (/failed to fetch|network/i.test(msg)) return 'Could not reach the cloud. Check the internet connection.';
  return msg;
}

export function deviceName() {
  try {
    const saved = localStorage.getItem('dcc.device');
    if (saved) return saved;
  } catch { /* ignore */ }
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'Device';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'browser';
  return `${os} ${br}`;
}
export function setDeviceName(n: string) { try { localStorage.setItem('dcc.device', n); } catch { /* ignore */ } }

// Every uploaded image the campaign uses.
function assetKeys(c: Campaign) {
  const keys = new Set<string>();
  for (const s of c.scenes) {
    if (s.map?.src.startsWith('asset:')) keys.add(s.map.src);
    for (const t of s.tokens) if (t.image?.startsWith('asset:')) keys.add(t.image);
  }
  for (const ch of c.characters) if (ch.image?.startsWith('asset:')) keys.add(ch.image);
  for (const d of c.docs ?? []) keys.add(d.asset);
  return [...keys];
}
const objName = (uid: string, key: string) => `${uid}/${key.slice('asset:'.length)}`;

export interface CloudInfo { name: string | null; saved_at: string; device: string | null }

export async function cloudInfo(): Promise<CloudInfo | null> {
  const { data, error } = await supabase.from('campaign_saves').select('name, saved_at, device').maybeSingle();
  if (error) throw new Error(friendly(error.message));
  return data;
}

export async function saveToCloud(progress: (msg: string) => void) {
  const user = await currentUser();
  if (!user) throw new Error('Sign in first.');
  const c = campaignData();
  const keys = assetKeys(c);
  if (keys.length) {
    const { data: existing } = await supabase.storage.from(BUCKET).list(user.id, { limit: 1000 });
    const have = new Set((existing ?? []).map(o => o.name));
    const missing = keys.filter(k => !have.has(k.slice('asset:'.length)));
    let i = 0;
    for (const k of missing) {
      progress(`Uploading images ${++i} of ${missing.length}…`);
      const blob = await getAssetBlob(k);
      if (!blob) continue;
      const { error } = await supabase.storage.from(BUCKET).upload(objName(user.id, k), blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
      if (error && !/exists/i.test(error.message)) throw new Error(friendly(error.message));
    }
  }
  progress('Saving campaign…');
  const saved_at = new Date().toISOString();
  const { error } = await supabase.from('campaign_saves').upsert({ user_id: user.id, name: c.name, data: c, device: deviceName(), saved_at });
  if (error) throw new Error(friendly(error.message));
  markClean(saved_at);
  return saved_at;
}

export async function loadFromCloud(progress: (msg: string) => void) {
  const user = await currentUser();
  if (!user) throw new Error('Sign in first.');
  progress('Downloading campaign…');
  const { data, error } = await supabase.from('campaign_saves').select('data, saved_at').maybeSingle();
  if (error) throw new Error(friendly(error.message));
  if (!data) throw new Error('Nothing saved in the cloud yet.');
  const c = data.data as Campaign;
  const keys = assetKeys(c);
  let i = 0;
  for (const k of keys) {
    if (await getAssetBlob(k)) continue;
    progress(`Downloading images ${++i}…`);
    const { data: blob, error: e2 } = await supabase.storage.from(BUCKET).download(objName(user.id, k));
    if (e2 || !blob) continue; // the scene still loads; that image just stays blank
    await putAsset(k, blob);
  }
  suspended = true;
  try { useCampaign.getState().replaceAll(c); } finally { suspended = false; }
  markClean(data.saved_at);
  return data.saved_at as string;
}

// ----- "unsaved changes" tracking (remembered across reloads) -----
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
let dirty = store.get('dcc.cloudDirty') === '1';
let suspended = false; // true while we replace the campaign ourselves
const listeners = new Set<() => void>();
export const isDirty = () => dirty;
export const lastCloudSave = () => store.get('dcc.cloudSavedAt');
function setDirty(v: boolean) { dirty = v; store.set('dcc.cloudDirty', v ? '1' : '0'); listeners.forEach(l => l()); }
function markClean(at: string) {
  store.set('dcc.cloudSavedAt', at);
  setDirty(false);
}
export function onDirtyChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
useCampaign.subscribe((s, prev) => {
  if (!useCampaign.persist.hasHydrated()) return; // loading saved data on startup
  if (suspended) return;
  // Roll log entries alone don't count as unsaved work.
  if (s.scenes === prev.scenes && s.characters === prev.characters && s.partyLoot === prev.partyLoot && s.customMonsters === prev.customMonsters && s.encounter === prev.encounter && s.settings === prev.settings && s.name === prev.name && s.notes === prev.notes && s.monsterNotes === prev.monsterNotes && s.sceneFolders === prev.sceneFolders && s.docs === prev.docs) return;
  if (!dirty) setDirty(true);
});
