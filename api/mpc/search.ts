import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { searchByName } from '../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name query param is required' });
  }

  try {
    const records = await searchByName(name);
    return res.status(200).json({ records });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
