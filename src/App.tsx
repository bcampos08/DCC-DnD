import { useEffect, useState } from 'react';
import DMView from './views/DMView';
import TableView from './views/TableView';
import { useCampaign } from './store';

const route = () => (location.hash.startsWith('#/table') ? 'table' : 'dm');

export default function App() {
  const [r, setR] = useState(route());
  const [ready, setReady] = useState(useCampaign.persist.hasHydrated());
  useEffect(() => {
    const on = () => setR(route());
    window.addEventListener('hashchange', on);
    const un = useCampaign.persist.onFinishHydration(() => setReady(true));
    if (useCampaign.persist.hasHydrated()) setReady(true);
    navigator.storage?.persist?.(); // ask the browser not to clear our saved data
    return () => { window.removeEventListener('hashchange', on); un(); };
  }, []);
  if (r === 'table') return <TableView />;
  if (!ready) return <div className="table-wait"><p>Loading campaign…</p></div>;
  return <DMView />;
}
