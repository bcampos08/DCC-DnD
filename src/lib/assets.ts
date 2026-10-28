import { get, set, del, keys } from 'idb-keyval';
import { uid } from './id';

// Uploaded images live in IndexedDB as blobs. Scene data refers to them as "asset:<id>".
const urlCache = new Map<string, string>();

export async function saveAsset(blob: Blob): Promise<string> {
  const id = 'asset:' + uid();
  await set(id, blob);
  urlCache.set(id, URL.createObjectURL(blob));
  return id;
}

export async function resolveSrc(src: string): Promise<string | null> {
  if (!src.startsWith('asset:')) return src;
  const hit = urlCache.get(src);
  if (hit) return hit;
  const blob = await get<Blob>(src);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(src, url);
  return url;
}

export async function deleteAsset(src: string) {
  if (!src.startsWith('asset:')) return;
  await del(src);
  const u = urlCache.get(src);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(src);
}

export async function allAssets(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const k of await keys()) {
    if (typeof k !== 'string' || !k.startsWith('asset:')) continue;
    const blob = await get<Blob>(k);
    if (blob) out[k] = await blobToDataUrl(blob);
  }
  return out;
}

export async function restoreAssets(map: Record<string, string>) {
  for (const [k, dataUrl] of Object.entries(map)) {
    const blob = await (await fetch(dataUrl)).blob();
    await set(k, blob);
  }
}

export const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(b);
});

// Shrinks very large uploads so the map stays fast on the table screen.
export async function prepareImage(file: File, maxSide = 6000): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  let { width, height } = bmp;
  if (Math.max(width, height) <= maxSide && file.size < 15e6) {
    bmp.close();
    return { blob: file, width, height };
  }
  const k = maxSide / Math.max(width, height);
  width = Math.round(width * Math.min(1, k));
  height = Math.round(height * Math.min(1, k));
  const c = new OffscreenCanvas(width, height);
  c.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  return { blob: await c.convertToBlob({ type: 'image/webp', quality: 0.9 }), width, height };
}

export const getAssetBlob = (key: string) => get<Blob>(key);
export async function putAsset(key: string, blob: Blob) {
  await set(key, blob);
  const old = urlCache.get(key);
  if (old) URL.revokeObjectURL(old);
  urlCache.delete(key);
}

// Saves a picture for a character or token, shrunk to a sensible size.
export async function saveTokenImage(file: File): Promise<string> {
  const { blob } = await prepareImage(file, 512);
  return saveAsset(blob);
}
