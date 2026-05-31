# Vercel Airtable Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel serverless API at `qtm-api/` that proxies all QTM Inventory App Airtable operations, keeping the PAT exclusively in a Vercel environment variable.

**Architecture:** All Airtable field IDs, pagination logic, and business rules live in a `lib/` layer; each `api/` handler is a thin adapter that parses input, delegates to `lib/`, and formats the HTTP response. CORS headers are set on every response via a shared `lib/cors.ts` helper. The React Native app will swap its direct Airtable calls for calls to these endpoints.

**Tech Stack:** Node.js 20, TypeScript 5, `@vercel/node`, Jest 29 + ts-jest

---

## File Map

| File | Responsibility |
|---|---|
| `lib/types.ts` | Shared TypeScript interfaces (MpcRecord, InventoryRecord, etc.) |
| `lib/cors.ts` | `applyCors(res)` — sets CORS headers on every response |
| `lib/airtable-client.ts` | `airtableFetch` helper, BASE_URL, TABLE/field ID constants |
| `lib/mpc.ts` | `lookupByBarcode`, `createMpcRecord`, `updatePurchaseFrom` |
| `lib/inventory.ts` | `fetchRecentInventory`, `fetchInventoryLots`, `submitInventory`, `removeInventoryFEFO`, `logRemoval` + private helpers |
| `api/mpc/lookup.ts` | `GET /api/mpc/lookup?barcode=` |
| `api/mpc/index.ts` | `POST /api/mpc` — create MPC record |
| `api/mpc/[id]/purchase-from.ts` | `PATCH /api/mpc/:id/purchase-from` |
| `api/inventory/recent.ts` | `GET /api/inventory/recent` |
| `api/inventory/lots.ts` | `GET /api/inventory/lots?mpcRecordId=&location=` |
| `api/inventory/add.ts` | `POST /api/inventory/add` |
| `api/inventory/remove.ts` | `POST /api/inventory/remove` |
| `api/removal-log.ts` | `POST /api/removal-log` |
| `tests/lib/airtable-client.test.ts` | Unit tests for `airtableFetch` |
| `tests/lib/mpc.test.ts` | Unit tests for MPC lib functions |
| `tests/lib/inventory.test.ts` | Unit tests for inventory lib functions |
| `tests/handlers/mpc.test.ts` | Handler-level tests for all MPC endpoints |
| `tests/handlers/inventory.test.ts` | Handler-level tests for all inventory endpoints |
| `tests/handlers/removal-log.test.ts` | Handler-level tests for removal log endpoint |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `vercel.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "qtm-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vercel dev",
    "test": "jest",
    "test:watch": "jest --watch",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@vercel/node": "^3.2.25",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.4",
    "typescript": "^5.4.5",
    "vercel": "^34.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": ".vercel/output"
  },
  "include": ["."],
  "exclude": ["node_modules", ".vercel"]
}
```

- [ ] **Step 3: Create `jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
```

- [ ] **Step 4: Create `vercel.json`**

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x"
    }
  }
}
```

- [ ] **Step 5: Create `.env.example`**

```
# Airtable Personal Access Token — never commit the real value
AIRTABLE_PAT=your_pat_here
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.vercel/
.env
.env.local
dist/
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit**

```bash
git init
git add package.json tsconfig.json jest.config.js vercel.json .env.example .gitignore
git commit -m "chore: scaffold qtm-api Vercel project"
```

---

## Task 2: lib/types.ts + lib/cors.ts

**Files:**
- Create: `lib/types.ts`
- Create: `lib/cors.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export interface MpcRecord {
  id: string;
  itemName: string;
  brand: string;
  purchaseFrom: string | null;
}

export interface InventoryRecord {
  id: string;
  itemName: string;
  location: string;
  quantity: number;
  expirationDate: string;
}

export interface InventoryLot {
  id: string;
  quantity: number;
  expirationDate: string | null;
}

export interface NewInventoryData {
  itemName: string;
  mpcRecordId: string;
  location: string;
  quantity: number;
  expirationDate: string;
  notes?: string;
}

export interface RemovalLogData {
  mpcRecordId: string;
  location: string;
  quantityRemoved: number;
  reason: string;
  notes?: string;
  lotExpirationDates: string[];
  inventoryRowIds: string[];
}

export interface RemovalResult {
  decrementedRows: { id: string; expirationDate: string | null }[];
  totalRemoved: number;
}
```

- [ ] **Step 2: Create `lib/cors.ts`**

```ts
import type { VercelResponse } from '@vercel/node';

export function applyCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/cors.ts
git commit -m "feat: add shared types and CORS helper"
```

---

## Task 3: lib/airtable-client.ts with tests

**Files:**
- Create: `lib/airtable-client.ts`
- Create: `tests/lib/airtable-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/airtable-client.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/lib/airtable-client.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/airtable-client'`

- [ ] **Step 3: Create `lib/airtable-client.ts`**

```ts
export const BASE_URL = 'https://api.airtable.com/v0/appeZjpIflD4tYvZK';

export const TABLE = {
  MPC: 'tblKJ3Wrkl5VNAuLM',
  INVENTORY: 'tblMJIq7OwoED4Ijj',
  REMOVAL_LOG: 'tblaHJ3NuXUjValGC',
} as const;

export const MPC_F = {
  itemName: 'fldEkEMwi4TeNzbHJ',
  barcode: 'fldDZQSwpHDOrMfa1',
  brand: 'fldBCpjU6lwDMeOyL',
  purchaseFrom: 'fldTa504zhwFqlTDQ',
} as const;

export const INV_F = {
  itemName: 'fldyRGNuQqhG1yMeU',
  masterProduct: 'fldyuRiAxRCZvxwUD',
  location: 'fldJ0hetUIGVlmkBx',
  quantity: 'fldXTmkmGniPWfLbT',
  expirationDate: 'fldwYsdlw91uWXzhC',
  notes: 'fldbc19duMu1t5zvd',
  alert7Day: 'fldNUE6OmbiEs8kov',
  alert3Day: 'fldF8fjfCu7eI3mxd',
  alertDayOf: 'fldqGJ52M5hicVBYi',
} as const;

export const REMOVAL_LOG_F = {
  mpcItem: 'fldlKEdWpDpDT3Gzx',
  location: 'fldFSDDtzD0YaDzAQ',
  quantityRemoved: 'fldIuND01bNX0Agll',
  reason: 'fld5kpEw13kd7jIcc',
  notes: 'fldHjB5WpAOEj3sSQ',
  lotExpirationDates: 'fldkhwNOuhYqy1X1y',
  inventoryRowIds: 'fld7swnssuu6kjkZl',
} as const;

export async function airtableFetch(url: string, options: RequestInit = {}): Promise<any> {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT environment variable is not configured');

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `Airtable error ${res.status}`);
  }
  return json;
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx jest tests/lib/airtable-client.test.ts --no-coverage
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/airtable-client.ts tests/lib/airtable-client.test.ts
git commit -m "feat: add Airtable client with field ID constants"
```

---

## Task 4: lib/mpc.ts with tests

**Files:**
- Create: `lib/mpc.ts`
- Create: `tests/lib/mpc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/mpc.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/lib/mpc.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/mpc'`

- [ ] **Step 3: Create `lib/mpc.ts`**

```ts
import { airtableFetch, BASE_URL, TABLE, MPC_F } from './airtable-client';
import type { MpcRecord } from './types';

export async function lookupByBarcode(barcode: string): Promise<MpcRecord | null> {
  const trimmed = barcode.trim();
  const noLeadingZeros = trimmed.replace(/^0+/, '');
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    if (offset) params.append('offset', offset);
    const data = await airtableFetch(`${BASE_URL}/${TABLE.MPC}?${params}`);

    for (const record of data.records) {
      const raw = record.fields[MPC_F.barcode];
      const barcodeText = raw && typeof raw === 'object' ? raw.text : raw;
      if (typeof barcodeText === 'string') {
        const rec = barcodeText.trim();
        if (rec === trimmed || rec.replace(/^0+/, '') === noLeadingZeros) {
          return {
            id: record.id,
            itemName: record.fields[MPC_F.itemName] || '',
            brand: record.fields[MPC_F.brand] || '',
            purchaseFrom: record.fields[MPC_F.purchaseFrom] || null,
          };
        }
      }
    }
    offset = data.offset;
  } while (offset);

  return null;
}

export async function createMpcRecord(barcode: string, itemName: string): Promise<string> {
  const data = await airtableFetch(`${BASE_URL}/${TABLE.MPC}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        [MPC_F.itemName]: itemName,
        [MPC_F.barcode]: { text: barcode },
      },
    }),
  });
  return data.id;
}

export async function updatePurchaseFrom(mpcRecordId: string, purchaseFrom: string): Promise<void> {
  await airtableFetch(`${BASE_URL}/${TABLE.MPC}/${mpcRecordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { [MPC_F.purchaseFrom]: purchaseFrom } }),
  });
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx jest tests/lib/mpc.test.ts --no-coverage
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/mpc.ts tests/lib/mpc.test.ts
git commit -m "feat: add MPC lib (lookup, create, update purchaseFrom)"
```

---

## Task 5: lib/inventory.ts with tests

**Files:**
- Create: `lib/inventory.ts`
- Create: `tests/lib/inventory.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/inventory.test.ts`:

```ts
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
        makeInvRecord('r1', { mpcId: 'm1', location: 'HQ', qty: 1, exp: '2025-12-01' }),
        makeInvRecord('r2', { mpcId: 'm1', location: 'HQ', qty: 1, exp: '2025-03-01' }),
        makeInvRecord('r3', { mpcId: 'm1', location: 'HQ', qty: 1, exp: undefined }),
      ],
    });

    // Patch r3 to have no expDate
    (mockFetch as jest.Mock).mockResolvedValueOnce.bind(mockFetch);
    mockFetch.mockReset();
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

  it('omits notes field content when notes is undefined', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'log2' });

    await logRemoval({
      mpcRecordId: 'mpc1', location: 'HQ', quantityRemoved: 1,
      reason: 'Damaged', lotExpirationDates: [], inventoryRowIds: [],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
    expect(body.fields[REMOVAL_LOG_F.notes]).toBe('');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/lib/inventory.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/inventory'`

- [ ] **Step 3: Create `lib/inventory.ts`**

```ts
import { airtableFetch, BASE_URL, TABLE, INV_F, REMOVAL_LOG_F } from './airtable-client';
import type { InventoryRecord, InventoryLot, NewInventoryData, RemovalLogData, RemovalResult } from './types';

export async function fetchRecentInventory(): Promise<InventoryRecord[]> {
  let offset: string | undefined;
  const allRecords: any[] = [];

  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    params.append('fields[]', INV_F.itemName);
    params.append('fields[]', INV_F.location);
    params.append('fields[]', INV_F.quantity);
    params.append('fields[]', INV_F.expirationDate);
    if (offset) params.append('offset', offset);
    const data = await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}?${params}`);
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  allRecords.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

  return allRecords.slice(0, 10).map((r: any): InventoryRecord => ({
    id: r.id,
    itemName: r.fields[INV_F.itemName] || 'Unknown',
    location: r.fields[INV_F.location] || '',
    quantity: r.fields[INV_F.quantity] || 0,
    expirationDate: r.fields[INV_F.expirationDate] || '',
  }));
}

export async function fetchInventoryLots(mpcRecordId: string, location: string): Promise<InventoryLot[]> {
  let offset: string | undefined;
  const lots: InventoryLot[] = [];

  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    params.append('fields[]', INV_F.masterProduct);
    params.append('fields[]', INV_F.location);
    params.append('fields[]', INV_F.quantity);
    params.append('fields[]', INV_F.expirationDate);
    if (offset) params.append('offset', offset);
    const data = await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}?${params}`);

    for (const record of data.records) {
      const linkedIds: string[] = record.fields[INV_F.masterProduct] || [];
      const qty: number = record.fields[INV_F.quantity] || 0;
      if (Array.isArray(linkedIds) && linkedIds.includes(mpcRecordId) && record.fields[INV_F.location] === location && qty > 0) {
        lots.push({ id: record.id, quantity: qty, expirationDate: record.fields[INV_F.expirationDate] || null });
      }
    }
    offset = data.offset;
  } while (offset);

  lots.sort((a, b) => {
    if (!a.expirationDate && !b.expirationDate) return 0;
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;
    return a.expirationDate.localeCompare(b.expirationDate);
  });

  return lots;
}

async function findMatchingLot(
  mpcRecordId: string,
  location: string,
  expirationDate: string
): Promise<{ id: string; quantity: number } | null> {
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    params.append('fields[]', INV_F.masterProduct);
    params.append('fields[]', INV_F.location);
    params.append('fields[]', INV_F.expirationDate);
    params.append('fields[]', INV_F.quantity);
    if (offset) params.append('offset', offset);
    const data = await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}?${params}`);

    for (const record of data.records) {
      const linkedIds: string[] = record.fields[INV_F.masterProduct] || [];
      if (
        Array.isArray(linkedIds) &&
        linkedIds.includes(mpcRecordId) &&
        record.fields[INV_F.location] === location &&
        record.fields[INV_F.expirationDate] === expirationDate
      ) {
        return { id: record.id, quantity: record.fields[INV_F.quantity] || 0 };
      }
    }
    offset = data.offset;
  } while (offset);

  return null;
}

export async function submitInventory(data: NewInventoryData): Promise<void> {
  const existing = await findMatchingLot(data.mpcRecordId, data.location, data.expirationDate);
  if (existing) {
    await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { [INV_F.quantity]: existing.quantity + data.quantity } }),
    });
  } else {
    await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          [INV_F.itemName]: data.itemName,
          [INV_F.masterProduct]: [data.mpcRecordId],
          [INV_F.location]: data.location,
          [INV_F.quantity]: data.quantity,
          [INV_F.expirationDate]: data.expirationDate,
          [INV_F.notes]: data.notes || '',
          [INV_F.alert7Day]: false,
          [INV_F.alert3Day]: false,
          [INV_F.alertDayOf]: false,
        },
      }),
    });
  }
}

async function patchOrDeleteLot(lotId: string, newQuantity: number): Promise<void> {
  if (newQuantity > 0) {
    await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}/${lotId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { [INV_F.quantity]: newQuantity } }),
    });
  } else {
    await airtableFetch(`${BASE_URL}/${TABLE.INVENTORY}/${lotId}`, { method: 'DELETE' });
  }
}

export async function removeInventoryFEFO(
  mpcRecordId: string,
  location: string,
  quantityToRemove: number,
  specificLotId?: string
): Promise<RemovalResult> {
  const lots = await fetchInventoryLots(mpcRecordId, location);

  if (specificLotId) {
    const lot = lots.find(l => l.id === specificLotId);
    if (!lot) throw new Error('Selected lot not found or out of stock.');
    if (quantityToRemove > lot.quantity) throw new Error(`Only ${lot.quantity} available in selected lot.`);
    await patchOrDeleteLot(lot.id, lot.quantity - quantityToRemove);
    return { decrementedRows: [{ id: lot.id, expirationDate: lot.expirationDate }], totalRemoved: quantityToRemove };
  }

  const totalAvailable = lots.reduce((sum, l) => sum + l.quantity, 0);
  if (quantityToRemove > totalAvailable) {
    throw new Error(`Insufficient inventory: only ${totalAvailable} available.`);
  }

  let remaining = quantityToRemove;
  const decrementedRows: RemovalResult['decrementedRows'] = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const toRemove = Math.min(remaining, lot.quantity);
    await patchOrDeleteLot(lot.id, lot.quantity - toRemove);
    decrementedRows.push({ id: lot.id, expirationDate: lot.expirationDate });
    remaining -= toRemove;
  }

  return { decrementedRows, totalRemoved: quantityToRemove };
}

export async function logRemoval(data: RemovalLogData): Promise<void> {
  await airtableFetch(`${BASE_URL}/${TABLE.REMOVAL_LOG}`, {
    method: 'POST',
    body: JSON.stringify({
      typecast: true,
      fields: {
        [REMOVAL_LOG_F.mpcItem]: [data.mpcRecordId],
        [REMOVAL_LOG_F.location]: data.location,
        [REMOVAL_LOG_F.quantityRemoved]: data.quantityRemoved,
        [REMOVAL_LOG_F.reason]: data.reason,
        [REMOVAL_LOG_F.notes]: data.notes || '',
        [REMOVAL_LOG_F.lotExpirationDates]: data.lotExpirationDates.join(', '),
        [REMOVAL_LOG_F.inventoryRowIds]: data.inventoryRowIds.join(', '),
      },
    }),
  });
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx jest tests/lib/inventory.test.ts --no-coverage
```

Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/inventory.ts tests/lib/inventory.test.ts
git commit -m "feat: add inventory lib (recent, lots, submit, FEFO remove, log)"
```

---

## Task 6: MPC endpoint handlers with tests

**Files:**
- Create: `api/mpc/lookup.ts`
- Create: `api/mpc/index.ts`
- Create: `api/mpc/[id]/purchase-from.ts`
- Create: `tests/handlers/mpc.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/handlers/mpc.test.ts`:

```ts
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
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

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
    mockLookup.mockResolvedValueOnce({ id: 'rec1', itemName: 'Chips', brand: 'Lay\'s', purchaseFrom: null });
    const req = { method: 'GET', query: { barcode: '012345' } } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ record: { id: 'rec1', itemName: 'Chips', brand: 'Lay\'s', purchaseFrom: null } });
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
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

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
});

// ---- PATCH /api/mpc/[id]/purchase-from ----

describe('PATCH /api/mpc/[id]/purchase-from', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/handlers/mpc.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../api/mpc/lookup'`

- [ ] **Step 3: Create `api/mpc/lookup.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { lookupByBarcode } from '../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode } = req.query;
  if (!barcode || typeof barcode !== 'string') {
    return res.status(400).json({ error: 'barcode query param is required' });
  }

  try {
    const record = await lookupByBarcode(barcode);
    return res.status(200).json({ record });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 4: Create `api/mpc/index.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { createMpcRecord } from '../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode, itemName } = req.body ?? {};
  if (!barcode || !itemName) {
    return res.status(400).json({ error: 'barcode and itemName are required' });
  }

  try {
    const id = await createMpcRecord(barcode, itemName);
    return res.status(201).json({ id });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 5: Create `api/mpc/[id]/purchase-from.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../lib/cors';
import { updatePurchaseFrom } from '../../../lib/mpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const id = req.query.id as string;
  const { purchaseFrom } = req.body ?? {};
  if (!purchaseFrom) {
    return res.status(400).json({ error: 'purchaseFrom is required' });
  }

  try {
    await updatePurchaseFrom(id, purchaseFrom);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
npx jest tests/handlers/mpc.test.ts --no-coverage
```

Expected: PASS, all tests green.

- [ ] **Step 7: Commit**

```bash
git add api/mpc/ tests/handlers/mpc.test.ts
git commit -m "feat: add MPC endpoint handlers (lookup, create, purchase-from)"
```

---

## Task 7: Inventory endpoint handlers with tests

**Files:**
- Create: `api/inventory/recent.ts`
- Create: `api/inventory/lots.ts`
- Create: `api/inventory/add.ts`
- Create: `api/inventory/remove.ts`
- Create: `tests/handlers/inventory.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/handlers/inventory.test.ts`:

```ts
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

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/inventory/recent'));
  });

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
});

// ---- GET /api/inventory/lots ----

describe('GET /api/inventory/lots', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/inventory/lots'));
  });

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
});

// ---- POST /api/inventory/add ----

describe('POST /api/inventory/add', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/inventory/add'));
  });

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
});

// ---- POST /api/inventory/remove ----

describe('POST /api/inventory/remove', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>;

  beforeAll(async () => {
    ({ default: handler } = await import('../../api/inventory/remove'));
  });

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
    mockRemove.mockRejectedValueOnce(new Error('Insufficient inventory'));
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
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/handlers/inventory.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../api/inventory/recent'`

- [ ] **Step 3: Create `api/inventory/recent.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { fetchRecentInventory } from '../../lib/inventory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const records = await fetchRecentInventory();
    return res.status(200).json({ records });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 4: Create `api/inventory/lots.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { fetchInventoryLots } from '../../lib/inventory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { mpcRecordId, location } = req.query;
  if (!mpcRecordId || typeof mpcRecordId !== 'string') {
    return res.status(400).json({ error: 'mpcRecordId query param is required' });
  }
  if (!location || typeof location !== 'string') {
    return res.status(400).json({ error: 'location query param is required' });
  }

  try {
    const lots = await fetchInventoryLots(mpcRecordId, location);
    return res.status(200).json({ lots });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 5: Create `api/inventory/add.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { submitInventory } from '../../lib/inventory';
import type { NewInventoryData } from '../../lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { itemName, mpcRecordId, location, quantity, expirationDate, notes } = req.body ?? {};
  if (!itemName || !mpcRecordId || !location || quantity == null || !expirationDate) {
    return res.status(400).json({ error: 'itemName, mpcRecordId, location, quantity, and expirationDate are required' });
  }

  try {
    const data: NewInventoryData = { itemName, mpcRecordId, location, quantity, expirationDate, notes };
    await submitInventory(data);
    return res.status(201).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 6: Create `api/inventory/remove.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../lib/cors';
import { removeInventoryFEFO } from '../../lib/inventory';

const INSUFFICIENT_RE = /insufficient inventory|only \d+ available/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mpcRecordId, location, quantityToRemove, specificLotId } = req.body ?? {};
  if (!mpcRecordId || !location || quantityToRemove == null) {
    return res.status(400).json({ error: 'mpcRecordId, location, and quantityToRemove are required' });
  }

  try {
    const result = await removeInventoryFEFO(mpcRecordId, location, quantityToRemove, specificLotId);
    return res.status(200).json(result);
  } catch (err) {
    const message = (err as Error).message;
    const status = INSUFFICIENT_RE.test(message) ? 422 : 502;
    return res.status(status).json({ error: message });
  }
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
npx jest tests/handlers/inventory.test.ts --no-coverage
```

Expected: PASS, all tests green.

- [ ] **Step 8: Commit**

```bash
git add api/inventory/ tests/handlers/inventory.test.ts
git commit -m "feat: add inventory endpoint handlers (recent, lots, add, remove)"
```

---

## Task 8: Removal log handler with test

**Files:**
- Create: `api/removal-log.ts`
- Create: `tests/handlers/removal-log.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/handlers/removal-log.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/handlers/removal-log.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../api/removal-log'`

- [ ] **Step 3: Create `api/removal-log.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../lib/cors';
import { logRemoval } from '../lib/inventory';
import type { RemovalLogData } from '../lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mpcRecordId, location, quantityRemoved, reason, notes, lotExpirationDates, inventoryRowIds } = req.body ?? {};
  if (!mpcRecordId || !location || quantityRemoved == null || !reason || !lotExpirationDates || !inventoryRowIds) {
    return res.status(400).json({ error: 'mpcRecordId, location, quantityRemoved, reason, lotExpirationDates, and inventoryRowIds are required' });
  }

  try {
    const data: RemovalLogData = { mpcRecordId, location, quantityRemoved, reason, notes, lotExpirationDates, inventoryRowIds };
    await logRemoval(data);
    return res.status(201).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx jest tests/handlers/removal-log.test.ts --no-coverage
```

Expected: PASS, all tests green.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all test files pass, zero failures.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add api/removal-log.ts tests/handlers/removal-log.test.ts
git commit -m "feat: add removal-log endpoint handler"
```

---

## Deployment checklist (manual steps after plan)

After all tasks are committed, before deploying to Vercel:

1. Install Vercel CLI globally if not already: `npm i -g vercel`
2. Run `vercel` in the project root and link to your Vercel account/project
3. Set the env variable in Vercel dashboard (or via CLI):
   ```bash
   vercel env add AIRTABLE_PAT
   ```
4. Deploy: `vercel --prod`
5. Update the React Native app's `src/services/airtable.ts` — replace `BASE_URL` and `getAuthHeader()` with calls to the proxy URL. Remove `EXPO_PUBLIC_AIRTABLE_PAT` from the app's `.env`.

---

## API reference (for updating the React Native app)

| Current app function | New proxy call |
|---|---|
| `lookupByBarcode(barcode)` | `GET /api/mpc/lookup?barcode=<barcode>` → `{ record }` |
| `createMpcRecord(barcode, itemName)` | `POST /api/mpc` `{ barcode, itemName }` → `{ id }` |
| `updateMpcPurchaseFrom(id, purchaseFrom)` | `PATCH /api/mpc/<id>/purchase-from` `{ purchaseFrom }` |
| `fetchRecentInventory()` | `GET /api/inventory/recent` → `{ records }` |
| `fetchInventoryByMpcAndLocation(mpcRecordId, location)` | `GET /api/inventory/lots?mpcRecordId=&location=` → `{ lots }` |
| `submitInventory(data)` | `POST /api/inventory/add` `NewInventoryData` |
| `removeInventoryFEFO(mpcRecordId, location, qty, lotId?)` | `POST /api/inventory/remove` `{ mpcRecordId, location, quantityToRemove, specificLotId? }` |
| `logRemoval(data)` | `POST /api/removal-log` `RemovalLogData` |
