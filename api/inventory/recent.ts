import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { fetchRecentInventory } from '../../lib/inventory';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const records = await fetchRecentInventory();
    res.status(200).json({ records });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
