import { airtableFetch, BASE_URL, TABLE, MPC_F } from './airtable-client';
import type { MpcRecord } from './types';

interface AirtableResponse<T> {
  records: T[];
  offset?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface CreateResponse {
  id: string;
}

export async function lookupByBarcode(barcode: string): Promise<MpcRecord | null> {
  const trimmed = barcode.trim();
  const noLeadingZeros = trimmed.replace(/^0+/, '');
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    if (offset) params.append('offset', offset);
    const data = await airtableFetch<AirtableResponse<AirtableRecord>>(`${BASE_URL}/${TABLE.MPC}?${params}`);

    for (const record of data.records) {
      const raw = record.fields[MPC_F.barcode];
      const barcodeText = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).text : raw;
      if (typeof barcodeText === 'string') {
        const rec = barcodeText.trim();
        if (rec === trimmed || rec.replace(/^0+/, '') === noLeadingZeros) {
          return {
            id: record.id,
            itemName: (record.fields[MPC_F.itemName] as string) || '',
            brand: (record.fields[MPC_F.brand] as string) || '',
            purchaseFrom: (record.fields[MPC_F.purchaseFrom] as string | null) || null,
          };
        }
      }
    }
    offset = data.offset;
  } while (offset);

  return null;
}

export async function createMpcRecord(barcode: string, itemName: string): Promise<string> {
  const data = await airtableFetch<CreateResponse>(`${BASE_URL}/${TABLE.MPC}`, {
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
  await airtableFetch<CreateResponse>(`${BASE_URL}/${TABLE.MPC}/${mpcRecordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { [MPC_F.purchaseFrom]: purchaseFrom } }),
  });
}
