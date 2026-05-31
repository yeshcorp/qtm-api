import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { fetchInventoryLots } from '../../lib/inventory';

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

  const { mpcRecordId, location } = req.query;
  if (!mpcRecordId || typeof mpcRecordId !== 'string') {
    res.status(400).json({ error: 'mpcRecordId query param is required' });
    return;
  }
  if (!location || typeof location !== 'string') {
    res.status(400).json({ error: 'location query param is required' });
    return;
  }

  try {
    const lots = await fetchInventoryLots(mpcRecordId, location);
    res.status(200).json({ lots });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
