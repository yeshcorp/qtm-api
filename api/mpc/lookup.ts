import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { lookupByBarcode } from '../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode } = req.query;
  if (!barcode || typeof barcode !== 'string') {
    return res.status(400).json({ error: 'barcode query param is required' });
  }

  try {
    const record = await lookupByBarcode(barcode);
    return res.status(200).json({ record });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
