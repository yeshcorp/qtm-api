import { airtableFetch, BASE_URL, TABLE, MPC_F, INV_F, REMOVAL_LOG_F } from '../../lib/airtable-client';

describe('airtableFetch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, AIRTABLE_PAT: 'test_pat_abc' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('attaches Bearer auth header and returns parsed JSON on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ records: [] }),
    });

    const result = await airtableFetch('https://api.airtable.com/v0/test');

    expect(global.fetch).toHaveBeenCalledWith('https://api.airtable.com/v0/test', {
      headers: {
        Authorization: 'Bearer test_pat_abc',
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual({ records: [] });
  });

  it('merges caller-provided options while keeping auth header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'rec1' }),
    });

    await airtableFetch('https://api.airtable.com/v0/test', {
      method: 'POST',
      body: JSON.stringify({ fields: {} }),
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test_pat_abc');
  });

  it('throws error message from Airtable JSON on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: { message: 'INVALID_VALUE_FOR_COLUMN' } }),
    });

    await expect(airtableFetch('https://api.airtable.com/v0/test')).rejects.toThrow(
      'INVALID_VALUE_FOR_COLUMN'
    );
  });

  it('throws generic message when Airtable JSON has no error.message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    await expect(airtableFetch('https://api.airtable.com/v0/test')).rejects.toThrow(
      'Airtable error 503'
    );
  });

  it('throws when AIRTABLE_PAT env var is absent', async () => {
    delete process.env.AIRTABLE_PAT;

    await expect(airtableFetch('https://api.airtable.com/v0/test')).rejects.toThrow(
      'AIRTABLE_PAT'
    );
  });
});

describe('constants', () => {
  it('exports correct BASE_URL', () => {
    expect(BASE_URL).toBe('https://api.airtable.com/v0/appeZjpIflD4tYvZK');
  });

  it('exports TABLE IDs', () => {
    expect(TABLE.MPC).toBe('tblKJ3Wrkl5VNAuLM');
    expect(TABLE.INVENTORY).toBe('tblMJIq7OwoED4Ijj');
    expect(TABLE.REMOVAL_LOG).toBe('tblaHJ3NuXUjValGC');
  });

  it('exports MPC field IDs', () => {
    expect(MPC_F.barcode).toBe('fldDZQSwpHDOrMfa1');
    expect(MPC_F.itemName).toBe('fldEkEMwi4TeNzbHJ');
  });

  it('exports INV field IDs', () => {
    expect(INV_F.quantity).toBe('fldXTmkmGniPWfLbT');
    expect(INV_F.masterProduct).toBe('fldyuRiAxRCZvxwUD');
  });

  it('exports REMOVAL_LOG field IDs', () => {
    expect(REMOVAL_LOG_F.mpcItem).toBe('fldlKEdWpDpDT3Gzx');
    expect(REMOVAL_LOG_F.quantityRemoved).toBe('fldIuND01bNX0Agll');
  });
});
