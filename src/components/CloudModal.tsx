import { useEffect, useState } from 'react';
import Modal from './Modal';
import { cloudInfo, currentUser, deviceName, isDirty, lastCloudSave, loadFromCloud, saveToCloud, setDeviceName, signIn, signOut, signUp, supabase, type CloudInfo } from '../lib/cloud';
import { useUI } from '../ui';

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function CloudModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState({ email: '', password: '' });
  const [info, setInfo] = useState<CloudInfo | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [device, setDevice] = useState(deviceName());

  const refresh = async () => {
    const u = await currentUser();
    setEmail(u?.email ?? null);
    if (u) { try { setInfo(await cloudInfo()); setErr(''); } catch (e) { setErr((e as Error).message); } }
  };
  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => refresh());
    return () => data.subscription.unsubscribe();
  }, []);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setErr(''); setBusy(label);
    try { await fn(); await refresh(); } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
  };

  const save = () => run('Saving…', async () => {
    if (info && lastCloudSave() && new Date(info.saved_at) > new Date(lastCloudSave()!) &&
      !confirm(`The cloud has a newer save (${when(info.saved_at)} from ${info.device ?? 'another computer'}) than the one this computer last used. Overwrite it with this computer's campaign?`)) return;
    await saveToCloud(setBusy);
    useUI.getState().toast('Saved to the cloud');
  });
  const load = () => run('Loading…', async () => {
    const msg = isDirty()
      ? 'This computer has changes that are NOT in the cloud. Loading will replace them. Continue?'
      : 'Replace the campaign on this computer with the cloud save?';
    if (!confirm(msg)) return;
    await loadFromCloud(setBusy);
    useUI.getState().toast('Loaded the cloud save');
  });

  return (
    <Modal title="Cloud save" onClose={onClose}>
      {email === undefined && <p className="hint">Checking…</p>}
      {email === null && (
        <form className="cloud-form" onSubmit={e => { e.preventDefault(); run('Signing in…', () => signIn(form.email, form.password)); }}>
          <p className="hint">Sign in with the same account on your desktop and your laptop. Save on one, load on the other.</p>
          <label className="field">Email<input type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          <label className="field">Password<input type="password" autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></label>
          <div className="row gap">
            <button className="btn primary" disabled={!!busy}>Sign in</button>
            <button type="button" className="btn" disabled={!!busy || !form.email || form.password.length < 6} onClick={() => run('Creating account…', async () => {
              const r = await signUp(form.email, form.password);
              if (r.needsConfirm) useUI.getState().toast('Account created. Check your email for a confirmation link, then sign in.');
            })}>Create account</button>
          </div>
        </form>
      )}
      {email && (
        <div className="cloud-box">
          <div className="row gap"><span className="grow">Signed in as <b>{email}</b></span><button className="btn sm ghost" onClick={() => run('Signing out…', () => signOut())}>Sign out</button></div>
          <dl className="facts">
            <div><dt>Cloud copy</dt><dd>{info ? <>“{info.name}” saved {when(info.saved_at)}{info.device ? ` from ${info.device}` : ''}</> : 'Nothing saved yet'}</dd></div>
            <div><dt>This computer</dt><dd>{isDirty() ? <b className="warn-text">Has unsaved changes</b> : lastCloudSave() ? `Matches the save from ${when(lastCloudSave())}` : 'Not saved to the cloud yet'}</dd></div>
          </dl>
          <div className="row gap wrap">
            <button className="btn primary" disabled={!!busy} onClick={save}>⬆ Save this computer to cloud</button>
            <button className="btn" disabled={!!busy || !info} onClick={load}>⬇ Load cloud onto this computer</button>
          </div>
          <label className="field">This computer's name (shown on saves)
            <input value={device} onChange={e => { setDevice(e.target.value); setDeviceName(e.target.value); }} />
          </label>
          <p className="hint">Typical use: plan on the desktop, press Save. On the laptop, press Load before the session. Saves include maps and token images.</p>
        </div>
      )}
      {busy && <p className="hint">{busy}</p>}
      {err && <p className="callout">{err}</p>}
    </Modal>
  );
}
