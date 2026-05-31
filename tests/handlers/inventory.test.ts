jest.mock('../../lib/inventory');
jest.mock('../../lib/cors', () => ({ applyCors: jest.fn() }));

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  fetchRecentInventory,
  fetchInventoryLots,
  submitInventory,
  removeInventoryFEFO,
} from '../../lib/inventory';

const mockRecent = fetchRecentInventory as jest.MockedFunction<typeof fetchRecentInventory>;
const mockLots = fetchInventoryLots as jest.MockedFunction<typeof fetchInventoryLots>;
const mockSubmit = submitInventory as jest.MockedFunction<typeof submitInventory>;
const mockRemove = removeInventoryFEFO as jest.MockedFunction<typeof removeInventoryFEFO>;

function makeRes(): VercelResponse {
  const res: any = { setHeader: jest.fn(), end: jest.fn() };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as VercelResponse;
}

// ---- GET /api/inventory/recent ----

describe('GET /api/inventory/recent', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  beforeAll(async () => { ({ default: handler } = await import('../../api/inventory/recent')); });
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with inventory records', async () => {
    const records = [{ id: 'r1', itemName: 'Chips', location: 'HQ', quantity: 5, expirationDate: '2025-12-01' }];
    mockRecent.mockResolvedValueOnce(records);
    const req = { method: 'GET' } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ records });
  });

  it('returns 502 on error', async () => {
    mockRecent.mockRejectedValueOnce(new Error('oops'));
    const req = { method: 'GET' } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('returns 405 for non-GET methods', async () => {
    const req = { method: 'POST' } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// ---- GET /api/inventory/lots ----

describe('GET /api/inventory/lots', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  beforeAll(async () => { ({ default: handler } = await import('../../api/inventory/lots')); });
  afterEach(() => jest.clearAllMocks());

  it('returns 400 when mpcRecordId is missing', async () => {
    const req = { method: 'GET', query: { location: 'HQ' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when location is missing', async () => {
    const req = { method: 'GET', query: { mpcRecordId: 'mpc1' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with lots', async () => {
    const lots = [{ id: 'lot1', quantity: 5, expirationDate: '2025-06-01' }];
    mockLots.mockResolvedValueOnce(lots);
    const req = { method: 'GET', query: { mpcRecordId: 'mpc1', location: 'HQ' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(mockLots).toHaveBeenCalledWith('mpc1', 'HQ');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ lots });
  });

  it('returns 502 on error', async () => {
    mockLots.mockRejectedValueOnce(new Error('oops'));
    const req = { method: 'GET', query: { mpcRecordId: 'mpc1', location: 'HQ' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});

// ---- POST /api/inventory/add ----

describe('POST /api/inventory/add', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  beforeAll(async () => { ({ default: handler } = await import('../../api/inventory/add')); });
  afterEach(() => jest.clearAllMocks());

  const validBody = {
    itemName: 'Chips', mpcRecordId: 'mpc1', location: 'HQ',
    quantity: 10, expirationDate: '2025-12-01',
  };

  it('returns 400 when a required field is missing', async () => {
    const { quantity: _q, ...incomplete } = validBody;
    const req = { method: 'POST', body: incomplete } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 on success', async () => {
    mockSubmit.mockResolvedValueOnce(undefined);
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(mockSubmit).toHaveBeenCalledWith(validBody);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 502 on error', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('oops'));
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

  it('returns 400 when quantity is not a number', async () => {
    const req = { method: 'POST', body: { ...validBody, quantity: 'ten' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ---- POST /api/inventory/remove ----

describe('POST /api/inventory/remove', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  beforeAll(async () => { ({ default: handler } = await import('../../api/inventory/remove')); });
  afterEach(() => jest.clearAllMocks());

  const validBody = { mpcRecordId: 'mpc1', location: 'HQ', quantityToRemove: 3 };

  it('returns 400 when mpcRecordId is missing', async () => {
    const req = { method: 'POST', body: { location: 'HQ', quantityToRemove: 1 } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with removal result on success', async () => {
    const result = { decrementedRows: [{ id: 'lot1', expirationDate: null }], totalRemoved: 3 };
    mockRemove.mockResolvedValueOnce(result);
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(mockRemove).toHaveBeenCalledWith('mpc1', 'HQ', 3, undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('passes specificLotId when provided', async () => {
    mockRemove.mockResolvedValueOnce({ decrementedRows: [], totalRemoved: 1 });
    const req = { method: 'POST', body: { ...validBody, specificLotId: 'lot99' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(mockRemove).toHaveBeenCalledWith('mpc1', 'HQ', 3, 'lot99');
  });

  it('returns 422 when inventory is insufficient', async () => {
    mockRemove.mockRejectedValueOnce(new Error('Insufficient inventory: only 2 available.'));
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when specific lot has insufficient qty', async () => {
    mockRemove.mockRejectedValueOnce(new Error('Only 2 available in selected lot.'));
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 502 on unexpected Airtable error', async () => {
    mockRemove.mockRejectedValueOnce(new Error('Airtable error 500'));
    const req = { method: 'POST', body: validBody } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('returns 400 when quantityToRemove is not a number', async () => {
    const req = { method: 'POST', body: { mpcRecordId: 'mpc1', location: 'HQ', quantityToRemove: 'five' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
