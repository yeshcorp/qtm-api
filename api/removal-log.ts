import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../lib/cors';
import { logRemoval } from '../lib/inventory';
import type { RemovalLogData } from '../lib/types';

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

  const {
    mpcRecordId, location, quantityRemoved, reason,
    notes, lotExpirationDates, inventoryRowIds,
  } = req.body ?? {};

  if (
    !mpcRecordId || !location ||
    quantityRemoved == null || typeof quantityRemoved !== 'number' || quantityRemoved <= 0 ||
    !reason ||
    !Array.isArray(lotExpirationDates) || lotExpirationDates.length === 0 ||
    !Array.isArray(inventoryRowIds) || inventoryRowIds.length === 0
  ) {
    res.status(400).json({
      error: 'mpcRecordId, location, quantityRemoved (positive number), reason, lotExpirationDates, and inventoryRowIds are required',
    });
    return;
  }

  try {
    const data: RemovalLogData = {
      mpcRecordId, location, quantityRemoved, reason,
      notes, lotExpirationDates, inventoryRowIds,
    };
    await logRemoval(data);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
