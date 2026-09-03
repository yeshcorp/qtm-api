import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../lib/cors';

const ENDPOINTS = [
  { method: 'GET', path: '/api' },
  { method: 'GET', path: '/api/mpc/lookup', query: ['barcode'] },
  { method: 'GET', path: '/api/mpc/search', query: ['name'] },
  { method: 'POST', path: '/api/mpc' },
  { method: 'PATCH', path: '/api/mpc/:id/purchase-from' },
  { method: 'GET', path: '/api/inventory/recent' },
  { method: 'GET', path: '/api/inventory/lots', query: ['mpcRecordId', 'location'] },
  { method: 'POST', path: '/api/inventory/add' },
  { method: 'POST', path: '/api/inventory/remove' },
  { method: 'POST', path: '/api/removal-log' },
] as const;

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

  res.status(200).json({
    ok: true,
    service: 'qtm-api',
    endpoints: ENDPOINTS,
  });
}
