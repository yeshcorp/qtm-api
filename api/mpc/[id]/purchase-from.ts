import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../lib/cors';
import { updatePurchaseFrom } from '../../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const id = req.query.id;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id param is required' });
  }
  const { purchaseFrom } = req.body ?? {};
  if (!purchaseFrom || typeof purchaseFrom !== 'string') {
    return res.status(400).json({ error: 'purchaseFrom is required' });
  }

  try {
    await updatePurchaseFrom(id, purchaseFrom);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
