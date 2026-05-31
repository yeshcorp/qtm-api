jest.mock('../../lib/mpc');
jest.mock('../../lib/cors', () => ({ applyCors: jest.fn() }));

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { lookupByBarcode, createMpcRecord, updatePurchaseFrom } from '../../lib/mpc';

const mockLookup = lookupByBarcode as jest.MockedFunction<typeof lookupByBarcode>;
const mockCreate = createMpcRecord as jest.MockedFunction<typeof createMpcRecord>;
const mockUpdate = updatePurchaseFrom as jest.MockedFunction<typeof updatePurchaseFrom>;

function makeRes(): VercelResponse {
  const res: any = { setHeader: jest.fn(), end: jest.fn() };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as VercelResponse;
}

// ---- /api/mpc/lookup ----

describe('GET /api/mpc/lookup', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/mpc/lookup'));
  });

  afterEach(() => jest.clearAllMocks());

  it('returns 400 when barcode query param is missing', async () => {
    const req = { method: 'GET', query: {} } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('returns 200 with record when found', async () => {
    mockLookup.mockResolvedValueOnce({ id: 'rec1', itemName: 'Chips', brand: "Lay's", purchaseFrom: null });
    const req = { method: 'GET', query: { barcode: '012345' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ record: { id: 'rec1', itemName: 'Chips', brand: "Lay's", purchaseFrom: null } });
  });

  it('returns 200 with null record when not found', async () => {
    mockLookup.mockResolvedValueOnce(null);
    const req = { method: 'GET', query: { barcode: 'notfound' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ record: null });
  });

  it('returns 502 on Airtable error', async () => {
    mockLookup.mockRejectedValueOnce(new Error('Airtable error 503'));
    const req = { method: 'GET', query: { barcode: '111' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('returns 405 for non-GET methods', async () => {
    const req = { method: 'POST', query: {} } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// ---- POST /api/mpc ----

describe('POST /api/mpc', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/mpc/index'));
  });

  afterEach(() => jest.clearAllMocks());

  it('returns 400 when barcode is missing', async () => {
    const req = { method: 'POST', body: { itemName: 'Item' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when itemName is missing', async () => {
    const req = { method: 'POST', body: { barcode: '123' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with new record id on success', async () => {
    mockCreate.mockResolvedValueOnce('recNew');
    const req = { method: 'POST', body: { barcode: '123', itemName: 'Widget' } } as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'recNew' });
  });

  it('returns 502 on Airtable error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('oops'));
    const req = { method: 'POST', body: { barcode: '123', itemName: 'Widget' } } as VercelRequest;
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

// ---- PATCH /api/mpc/[id]/purchase-from ----

describe('PATCH /api/mpc/[id]/purchase-from', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/mpc/[id]/purchase-from'));
  });

  afterEach(() => jest.clearAllMocks());

  it('returns 400 when purchaseFrom body field is missing', async () => {
    const req = { method: 'PATCH', query: { id: 'rec1' }, body: {} } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 on success', async () => {
    mockUpdate.mockResolvedValueOnce(undefined);
    const req = { method: 'PATCH', query: { id: 'rec1' }, body: { purchaseFrom: 'Costco' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(mockUpdate).toHaveBeenCalledWith('rec1', 'Costco');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 502 on Airtable error', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('oops'));
    const req = { method: 'PATCH', query: { id: 'rec1' }, body: { purchaseFrom: 'Costco' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});
