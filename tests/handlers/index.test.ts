jest.mock('../../lib/cors', () => ({ applyCors: jest.fn() }));

import type { VercelRequest, VercelResponse } from '@vercel/node';

function makeRes(): VercelResponse {
  const res: any = { setHeader: jest.fn(), end: jest.fn() };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as VercelResponse;
}

describe('GET /api', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/index'));
  });

  afterEach(() => jest.clearAllMocks());

  it('returns 200 with service catalog on GET', async () => {
    const req = { method: 'GET' } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        service: 'qtm-api',
        endpoints: expect.arrayContaining([
          expect.objectContaining({ method: 'GET', path: '/api/mpc/lookup' }),
          expect.objectContaining({ method: 'POST', path: '/api/inventory/add' }),
          expect.objectContaining({ method: 'POST', path: '/api/removal-log' }),
        ]),
      })
    );
  });

  it('returns 204 for OPTIONS preflight', async () => {
    const req = { method: 'OPTIONS' } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns 405 for non-GET methods', async () => {
    const req = { method: 'POST' } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
