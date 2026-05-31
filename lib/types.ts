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
  /** Date displayed in the activity feed; empty string when no expiration date exists */
  expirationDate: string;
}

export interface InventoryLot {
  id: string;
  quantity: number;
  /** null when no expiration date is set for this lot */
  expirationDate: string | null;
}

export interface NewInventoryData {
  itemName: string;
  mpcRecordId: string;
  location: string;
  quantity: number;
  /** ISO 8601 date string (YYYY-MM-DD) */
  expirationDate: string;
  notes?: string;
}

export interface RemovalLogData {
  mpcRecordId: string;
  location: string;
  quantityRemoved: number;
  reason: string;
  notes?: string;
  /** ISO 8601 date strings (YYYY-MM-DD) for each decremented lot */
  lotExpirationDates: string[];
  inventoryRowIds: string[];
}

export interface RemovalResult {
  decrementedRows: { id: string; expirationDate: string | null }[];
  totalRemoved: number;
}
