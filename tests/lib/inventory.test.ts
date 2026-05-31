jest.mock('../../lib/airtable-client');
import { airtableFetch, BASE_URL, TABLE, INV_F, REMOVAL_LOG_F } from '../../lib/airtable-client';
import {
  fetchRecentInventory,
  fetchInventoryLots,
  submitInventory,
  removeInventoryFEFO,
  logRemoval,
} from '../../lib/inventory';

const mockFetch = airtableFetch as jest.MockedFunction<typeof airtableFetch>;

const INV_URL = `${BASE_URL}/${TABLE.INVENTORY}`;
const LOG_URL = `${BASE_URL}/${TABLE.REMOVAL_LOG}`;

function makeInvRecord(id: string, opts: {
  mpcId?: string; location?: string; qty?: number; exp?: string; itemName?: string; createdTime?: string;
} = {}) {
  return {
    id,
    createdTime: opts.createdTime ?? '2024-01-01T00:00:00.000Z',
    fields: {
      [INV_F.itemName]: opts.itemName ?? 'Item',
      [INV_F.masterProduct]: opts.mpcId ? [opts.mpcId] : [],
      [INV_F.location]: opts.location ?? 'HQ',
      [INV_F.quantity]: opts.qty ?? 10,
      [INV_F.expirationDate]: opts.exp ?? '2025-12-31',
    },
  };
}

describe('fetchRecentInventory', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns top 10 records sorted by createdTime desc', async () => {
    const records = Array.from({ length: 15 }, (_, i) =>
      makeInvRecord(`rec${i}`, { createdTime: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` })
    );
    mockFetch.mockResolvedValueOnce({ records });

    const result = await fetchRecentInventory();
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe('rec14');
  });

  it('paginates all pages before sorting', async () => {
    const page1 = [makeInvRecord('rec1', { createdTime: '2024-01-01T00:00:00.000Z' })];
    const page2 = [makeInvRecord('rec2', { createdTime: '2024-06-01T00:00:00.000Z' })];
    mockFetch
      .mockResolvedValueOnce({ records: page1, offset: 'p2' })
      .mockResolvedValueOnce({ records: page2 });

    const result = await fetchRecentInventory();
    expect(result[0].id).toBe('rec2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('maps fields to InventoryRecord shape', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [makeInvRecord('rec1', { itemName: 'Chips', location: 'HQ', qty: 5, exp: '2025-03-01' })],
    });

    const [record] = await fetchRecentInventory();
    expect(record).toEqual({ id: 'rec1', itemName: 'Chips', location: 'HQ', quantity: 5, expirationDate: '2025-03-01' });
  });
});

describe('fetchInventoryLots', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns only lots matching mpcRecordId and location with qty > 0', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [
        makeInvRecord('recA', { mpcId: 'mpc1', location: 'HQ', qty: 3 }),
        makeInvRecord('recB', { mpcId: 'mpc1', location: "Terrence's House", qty: 5 }),
        makeInvRecord('recC', { mpcId: 'mpc2', location: 'HQ', qty: 2 }),
        makeInvRecord('recD', { mpcId: 'mpc1', location: 'HQ', qty: 0 }),
      ],
    });

    const lots = await fetchInventoryLots('mpc1', 'HQ');
    expect(lots.map(l => l.id)).toEqual(['recA']);
  });

  it('sorts lots by expirationDate ascending (FEFO), nulls last', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [
        { id: 'r1', createdTime: '', fields: { [INV_F.masterProduct]: ['m1'], [INV_F.location]: 'HQ', [INV_F.quantity]: 1, [INV_F.expirationDate]: '2025-12-01' } },
        { id: 'r2', createdTime: '', fields: { [INV_F.masterProduct]: ['m1'], [INV_F.location]: 'HQ', [INV_F.quantity]: 1, [INV_F.expirationDate]: '2025-03-01' } },
        { id: 'r3', createdTime: '', fields: { [INV_F.masterProduct]: ['m1'], [INV_F.location]: 'HQ', [INV_F.quantity]: 1 } },
      ],
    });

    const lots = await fetchInventoryLots('m1', 'HQ');
    expect(lots.map(l => l.id)).toEqual(['r2', 'r1', 'r3']);
    expect(lots[2].expirationDate).toBeNull();
  });
});

describe('submitInventory', () => {
  afterEach(() => jest.resetAllMocks());

  it('PATCHes existing lot when mpc+location+expDate match', async () => {
    // findMatchingLot scan
    mockFetch.mockResolvedValueOnce({
      records: [
        {
          id: 'existingLot',
          createdTime: '',
          fields: {
            [INV_F.masterProduct]: ['mpc1'],
            [INV_F.location]: 'HQ',
            [INV_F.expirationDate]: '2025-06-01',
            [INV_F.quantity]: 8,
          },
        },
      ],
    });
    // PATCH call
    mockFetch.mockResolvedValueOnce({ id: 'existingLot' });

    await submitInventory({ itemName: 'Item', mpcRecordId: 'mpc1', location: 'HQ', quantity: 5, expirationDate: '2025-06-01' });

    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toBe(`${INV_URL}/existingLot`);
    expect(JSON.parse(patchCall[1]!.body as string).fields[INV_F.quantity]).toBe(13);
  });

  it('POSTs new row when no matching lot exists', async () => {
    mockFetch.mockResolvedValueOnce({ records: [] });
    mockFetch.mockResolvedValueOnce({ id: 'newRow' });

    await submitInventory({ itemName: 'Item', mpcRecordId: 'mpc1', location: 'HQ', quantity: 3, expirationDate: '2025-09-01' });

    const postCall = mockFetch.mock.calls[1];
    expect(postCall[0]).toBe(INV_URL);
    expect(postCall[1]?.method).toBe('POST');
    const body = JSON.parse(postCall[1]!.body as string);
    expect(body.fields[INV_F.alert7Day]).toBe(false);
    expect(body.fields[INV_F.quantity]).toBe(3);
  });
});

describe('removeInventoryFEFO', () => {
  afterEach(() => jest.resetAllMocks());

  function mockLots(lots: { id: string; qty: number; exp?: string }[]) {
    mockFetch.mockResolvedValueOnce({
      records: lots.map(l => ({
        id: l.id,
        createdTime: '',
        fields: {
          [INV_F.masterProduct]: ['mpc1'],
          [INV_F.location]: 'HQ',
          [INV_F.quantity]: l.qty,
          ...(l.exp ? { [INV_F.expirationDate]: l.exp } : {}),
        },
      })),
    });
  }

  it('decrements earliest-expiring lot first (FEFO)', async () => {
    mockLots([
      { id: 'lot1', qty: 5, exp: '2025-03-01' },
      { id: 'lot2', qty: 10, exp: '2025-01-01' },
    ]);
    mockFetch.mockResolvedValueOnce({}); // PATCH lot2

    const result = await removeInventoryFEFO('mpc1', 'HQ', 3);
    expect(result.totalRemoved).toBe(3);
    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toBe(`${INV_URL}/lot2`);
    expect(JSON.parse(patchCall[1]!.body as string).fields[INV_F.quantity]).toBe(7);
  });

  it('spans multiple lots when quantity exceeds first lot', async () => {
    mockLots([
      { id: 'lot1', qty: 3, exp: '2025-01-01' },
      { id: 'lot2', qty: 10, exp: '2025-06-01' },
    ]);
    mockFetch.mockResolvedValueOnce({}); // DELETE lot1 (drains to 0)
    mockFetch.mockResolvedValueOnce({}); // PATCH lot2

    const result = await removeInventoryFEFO('mpc1', 'HQ', 5);
    expect(result.totalRemoved).toBe(5);
    expect(result.decrementedRows).toHaveLength(2);
    // lot1 drains to 0 → DELETE
    expect(mockFetch.mock.calls[1][1]?.method).toBe('DELETE');
  });

  it('removes from specificLotId when provided', async () => {
    mockLots([{ id: 'lot1', qty: 8, exp: '2025-01-01' }, { id: 'lot2', qty: 5, exp: '2025-06-01' }]);
    mockFetch.mockResolvedValueOnce({});

    const result = await removeInventoryFEFO('mpc1', 'HQ', 2, 'lot2');
    expect(result.decrementedRows[0].id).toBe('lot2');
    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toBe(`${INV_URL}/lot2`);
    expect(JSON.parse(patchCall[1]!.body as string).fields[INV_F.quantity]).toBe(3);
  });

  it('throws when specificLotId not found', async () => {
    mockLots([{ id: 'lot1', qty: 5 }]);
    await expect(removeInventoryFEFO('mpc1', 'HQ', 1, 'nonexistent')).rejects.toThrow('not found');
  });

  it('throws when specificLotId has insufficient qty', async () => {
    mockLots([{ id: 'lot1', qty: 2 }]);
    await expect(removeInventoryFEFO('mpc1', 'HQ', 5, 'lot1')).rejects.toThrow('Only 2');
  });

  it('throws when total available is insufficient (FEFO path)', async () => {
    mockLots([{ id: 'lot1', qty: 3 }]);
    await expect(removeInventoryFEFO('mpc1', 'HQ', 10)).rejects.toThrow('Insufficient inventory');
  });

  it('returns empty result when quantityToRemove is 0', async () => {
    mockLots([{ id: 'lot1', qty: 5, exp: '2025-01-01' }]);

    const result = await removeInventoryFEFO('mpc1', 'HQ', 0);
    expect(result.totalRemoved).toBe(0);
    expect(result.decrementedRows).toHaveLength(0);
    // Only one fetch call: the fetchInventoryLots scan — no mutations
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('logRemoval', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs to REMOVAL_LOG table with typecast and correct fields', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'log1' });

    await logRemoval({
      mpcRecordId: 'mpc1',
      location: 'HQ',
      quantityRemoved: 4,
      reason: 'Expired',
      notes: 'Back shelf',
      lotExpirationDates: ['2024-12-01', '2025-01-01'],
      inventoryRowIds: ['row1', 'row2'],
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(LOG_URL);
    expect(options?.method).toBe('POST');
    const body = JSON.parse(options!.body as string);
    expect(body.typecast).toBe(true);
    expect(body.fields[REMOVAL_LOG_F.mpcItem]).toEqual(['mpc1']);
    expect(body.fields[REMOVAL_LOG_F.lotExpirationDates]).toBe('2024-12-01, 2025-01-01');
    expect(body.fields[REMOVAL_LOG_F.inventoryRowIds]).toBe('row1, row2');
  });

  it('sends empty string for notes when notes is undefined', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'log2' });

    await logRemoval({
      mpcRecordId: 'mpc1', location: 'HQ', quantityRemoved: 1,
      reason: 'Damaged', lotExpirationDates: [], inventoryRowIds: [],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
    expect(body.fields[REMOVAL_LOG_F.notes]).toBe('');
  });
});
