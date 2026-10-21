import { useEffect, useState } from 'react';
import { resolveSrc } from './assets';

type Img = HTMLImageElement | HTMLCanvasElement;
const cache = new Map<string, Promise<Img | null>>();

// Loads an image (asset id or URL). SVG maps are drawn to a canvas once so redraws stay fast.
export function loadImage(src: string): Promise<Img | null> {
  let p = cache.get(src);
  if (!p) {
    p = (async () => {
      const url = await resolveSrc(src);
      if (!url) return null;
      const img = new Image();
      if (/^https?:/.test(url) && !url.startsWith(location.origin)) img.crossOrigin = 'anonymous';
      img.src = url;
      try { await img.decode(); } catch {
        if (img.crossOrigin) { const i2 = new Image(); i2.src = url; try { await i2.decode(); return i2; } catch { return null; } }
        return null;
      }
      if (/\.svg($|\?)/.test(src)) {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        return c;
      }
      return img;
    })();
    cache.set(src, p);
  }
  return p;
}

export function useImage(src?: string) {
  const [img, setImg] = useState<Img | null>(null);
  useEffect(() => {
    let live = true;
    if (!src) { setImg(null); return; }
    loadImage(src).then(i => live && setImg(i));
    return () => { live = false; };
  }, [src]);
  return img;
}
