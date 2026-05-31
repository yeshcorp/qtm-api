import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { removeInventoryFEFO } from '../../lib/inventory';

const BUSINESS_ERROR_RE = /insufficient inventory|only \d+ available/i;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { mpcRecordId, location, quantityToRemove, specificLotId } = req.body ?? {};
  if (!mpcRecordId || !location || quantityToRemove == null || typeof quantityToRemove !== 'number' || quantityToRemove <= 0) {
    res.status(400).json({ error: 'mpcRecordId, location, and quantityToRemove (positive number) are required' });
    return;
  }

  try {
    const result = await removeInventoryFEFO(mpcRecordId, location, quantityToRemove, specificLotId);
    res.status(200).json(result);
  } catch (err) {
    const message = (err as Error).message;
    const status = BUSINESS_ERROR_RE.test(message) ? 422 : 502;
    res.status(status).json({ error: message });
  }
}
