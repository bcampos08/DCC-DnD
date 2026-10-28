import { useEffect, useState } from 'react';
import { resolveSrc } from '../lib/assets';

// <img> that also shows pictures saved on this computer ("asset:..." ids).
export default function Pic({ src, className, alt = '' }: { src?: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(src && !src.startsWith('asset:') ? src : null);
  useEffect(() => {
    let live = true;
    if (!src) { setUrl(null); return; }
    resolveSrc(src).then(u => live && setUrl(u));
    return () => { live = false; };
  }, [src]);
  return url ? <img className={className} src={url} alt={alt} /> : null;
}

