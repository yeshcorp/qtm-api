import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { createMpcRecord } from '../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode, itemName } = req.body ?? {};
  if (!barcode || !itemName) {
    return res.status(400).json({ error: 'barcode and itemName are required' });
  }

  try {
    const id = await createMpcRecord(barcode, itemName);
    return res.status(201).json({ id });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
