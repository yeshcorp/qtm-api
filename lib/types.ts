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
