import type { VercelResponse } from '@vercel/node';

export function applyCors(res: VercelResponse): void {
  // TODO: lock down to production origin via ALLOWED_ORIGIN env var before deploying
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
