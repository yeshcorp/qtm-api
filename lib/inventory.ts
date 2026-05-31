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
    allRecords.push(...(data as any).records);
    offset = (data as any).offset;
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

    for (const record of (data as any).records) {
      const linkedIds: string[] = record.fields[INV_F.masterProduct] || [];
      const qty: number = record.fields[INV_F.quantity] || 0;
      if (Array.isArray(linkedIds) && linkedIds.includes(mpcRecordId) && record.fields[INV_F.location] === location && qty > 0) {
        lots.push({
          id: record.id,
          quantity: qty,
          expirationDate: record.fields[INV_F.expirationDate] ?? null,
        });
      }
    }
    offset = (data as any).offset;
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

    for (const record of (data as any).records) {
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
    offset = (data as any).offset;
  } while (offset);

  return null;
}

export async function submitInventory(data: NewInventoryData): Promise<void> {
  const existing = await findMatchingLot(data.mpcRecordId, data.location, data.expirationDate);
  if (existing) {
    await airtableFetch<unknown>(`${BASE_URL}/${TABLE.INVENTORY}/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { [INV_F.quantity]: existing.quantity + data.quantity } }),
    });
  } else {
    await airtableFetch<unknown>(`${BASE_URL}/${TABLE.INVENTORY}`, {
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
    await airtableFetch<unknown>(`${BASE_URL}/${TABLE.INVENTORY}/${lotId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { [INV_F.quantity]: newQuantity } }),
    });
  } else {
    await airtableFetch<unknown>(`${BASE_URL}/${TABLE.INVENTORY}/${lotId}`, { method: 'DELETE' });
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
  await airtableFetch<unknown>(`${BASE_URL}/${TABLE.REMOVAL_LOG}`, {
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
