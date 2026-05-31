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

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function airtableFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT environment variable is not configured');

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    // Non-JSON body (e.g. HTML from CloudFlare 502)
  }
  if (!res.ok) {
    const msg = (json as any)?.error?.message;
    throw new Error(msg ?? `Airtable error ${res.status}`);
  }
  return json as T;
}
