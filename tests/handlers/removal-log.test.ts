jest.mock('../../lib/inventory');
jest.mock('../../lib/cors', () => ({ applyCors: jest.fn() }));

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logRemoval } from '../../lib/inventory';

const mockLog = logRemoval as jest.MockedFunction<typeof logRemoval>;

function makeRes(): VercelResponse {
  const res: any = { setHeader: jest.fn(), end: jest.fn() };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as VercelResponse;
}

describe('POST /api/removal-log', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/removal-log'));
  });

  afterEach(() => jest.clearAllMocks());

  const validBody = {
    mpcRecordId: 'mpc1',
    location: 'HQ',
    quantityRemoved: 3,
    reason: 'Expired',
    lotExpirationDates: ['2024-12-01'],
    inventoryRowIds: ['row1'],
  };

  it('returns 400 when mpcRecordId is missing', async () => {
    const { mpcRecordId: _m, ...incomplete } = validBody;
    const req = { method: 'POST', body: incomplete } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when reason is missing', async () => {
    const { reason: _r, ...incomplete } = validBody;
    const req = { method: 'POST', body: incomplete } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quantityRemoved is not a number', async () => {
    const req = { method: 'POST', body: { ...validBody, quantityRemoved: 'three' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when quantityRemoved is zero or negative', async () => {
    const req = { method: 'POST', body: { ...validBody, quantityRemoved: 0 } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 on success and passes data to logRemoval', async () => {
    mockLog.mockResolvedValueOnce(undefined);
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      mpcRecordId: 'mpc1',
      reason: 'Expired',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 502 on Airtable error', async () => {
    mockLog.mockRejectedValueOnce(new Error('Audit log failed to write.'));
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET', body: {} } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
