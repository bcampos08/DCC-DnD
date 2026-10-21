// Vercel serverless function: fetches a public D&D Beyond character so the browser can read it.
// GET /api/ddb?id=170851003
export default async function handler(req, res) {
  const id = String(req.query.id || '').replace(/\D/g, '');
  if (!id) return res.status(400).json({ error: 'Missing character id' });
  try {
    const r = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (DCC-DnD table tool)', Accept: 'application/json' },
    });
    const text = await r.text();
    res.setHeader('Cache-Control', 'no-store');
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach D&D Beyond' });
  }
}
