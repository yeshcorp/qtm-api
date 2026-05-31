jest.mock('../../lib/airtable-client');
import { airtableFetch, BASE_URL, TABLE, MPC_F } from '../../lib/airtable-client';
import { lookupByBarcode, createMpcRecord, updatePurchaseFrom } from '../../lib/mpc';

const mockFetch = airtableFetch as jest.MockedFunction<typeof airtableFetch>;

const MPC_URL = `${BASE_URL}/${TABLE.MPC}`;

function makeRecord(id: string, barcode: string, itemName = 'Item', brand = 'Brand', purchaseFrom?: string) {
  return {
    id,
    fields: {
      [MPC_F.barcode]: barcode,
      [MPC_F.itemName]: itemName,
      [MPC_F.brand]: brand,
      ...(purchaseFrom ? { [MPC_F.purchaseFrom]: purchaseFrom } : {}),
    },
  };
}

describe('lookupByBarcode', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns matching record by exact barcode', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [makeRecord('rec1', '012345678', 'Test Item', 'Acme')],
    });

    const result = await lookupByBarcode('012345678');
    expect(result).toEqual({ id: 'rec1', itemName: 'Test Item', brand: 'Acme', purchaseFrom: null });
  });

  it('returns matching record after stripping leading zeros', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [makeRecord('rec1', '0012345', 'Item', 'Brand')],
    });

    const result = await lookupByBarcode('00012345');
    expect(result?.id).toBe('rec1');
  });

  it('handles barcode field as { text } object (Airtable formula format)', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [
        {
          id: 'rec2',
          fields: {
            [MPC_F.barcode]: { text: '999888' },
            [MPC_F.itemName]: 'Widget',
            [MPC_F.brand]: 'WidgetCo',
          },
        },
      ],
    });

    const result = await lookupByBarcode('999888');
    expect(result?.id).toBe('rec2');
  });

  it('returns null when no record matches', async () => {
    mockFetch.mockResolvedValueOnce({ records: [] });
    const result = await lookupByBarcode('notfound');
    expect(result).toBeNull();
  });

  it('paginates through all pages before returning null', async () => {
    mockFetch
      .mockResolvedValueOnce({ records: [makeRecord('rec1', '111111')], offset: 'page2' })
      .mockResolvedValueOnce({ records: [makeRecord('rec2', '222222')] });

    const result = await lookupByBarcode('999999');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toBeNull();
  });

  it('stops paginating and returns once match found on first page', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [makeRecord('rec1', 'FOUND', 'Found Item', 'Brand'), makeRecord('rec2', '111')],
      offset: 'page2',
    });

    const result = await lookupByBarcode('FOUND');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe('rec1');
  });

  it('includes purchaseFrom when present', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [makeRecord('rec1', 'ABC', 'Item', 'Brand', 'Amazon Business')],
    });

    const result = await lookupByBarcode('ABC');
    expect(result?.purchaseFrom).toBe('Amazon Business');
  });

  it('skips records where barcode field is null or undefined without throwing', async () => {
    mockFetch.mockResolvedValueOnce({
      records: [
        { id: 'r1', fields: { [MPC_F.barcode]: null, [MPC_F.itemName]: 'X', [MPC_F.brand]: 'Y' } },
        { id: 'r2', fields: { [MPC_F.itemName]: 'X', [MPC_F.brand]: 'Y' } },
        makeRecord('r3', 'TARGET'),
      ],
    });

    const result = await lookupByBarcode('TARGET');
    expect(result?.id).toBe('r3');
  });
});

describe('createMpcRecord', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs to MPC table and returns new record ID', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'recNew' });

    const id = await createMpcRecord('barcode123', 'New Product');
    expect(id).toBe('recNew');
    expect(mockFetch).toHaveBeenCalledWith(MPC_URL, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          [MPC_F.itemName]: 'New Product',
          [MPC_F.barcode]: { text: 'barcode123' },
        },
      }),
    });
  });
});

describe('updatePurchaseFrom', () => {
  afterEach(() => jest.resetAllMocks());

  it('PATCHes the MPC record with the new purchaseFrom value', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'rec1' });

    await updatePurchaseFrom('rec1', 'Costco');
    expect(mockFetch).toHaveBeenCalledWith(`${MPC_URL}/rec1`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { [MPC_F.purchaseFrom]: 'Costco' } }),
    });
  });
});
