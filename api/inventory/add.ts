import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { submitInventory } from '../../lib/inventory';
import type { NewInventoryData } from '../../lib/types';

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

  const { itemName, mpcRecordId, location, quantity, expirationDate, notes } = req.body ?? {};
  if (!itemName || !mpcRecordId || !location || quantity == null || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0 || !expirationDate) {
    res.status(400).json({ error: 'itemName, mpcRecordId, location, quantity (positive integer), and expirationDate are required' });
    return;
  }

  try {
    const data: NewInventoryData = { itemName, mpcRecordId, location, quantity, expirationDate, notes };
    await submitInventory(data);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
