import { useUI } from '../ui';
export default function Toasts() {
  const toasts = useUI(s => s.toasts);
  return (
    <div className="toasts" role="status">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && <button className="btn sm primary" onClick={() => { t.action!.run(); useUI.getState().set(s => ({ toasts: s.toasts.filter(x => x.id !== t.id) })); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}
