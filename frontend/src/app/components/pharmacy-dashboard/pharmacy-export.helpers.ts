export interface PharmacyHistoryExportLabels {
  colType: string;
  colId: string;
  colDate: string;
  colMedication: string;
  colDosage: string;
  colQuantity: string;
  colRequestedBy: string;
  colPatients: string;
  colDeliveredOrReason: string;
  colNotes: string;
}

export interface PharmacyHistoryExportPreparedRow {
  type: string;
  id: string | number;
  date: string;
  medication: string;
  dosage: string;
  quantity: number;
  requestedBy: string;
  patients: string;
  deliveredOrReason: string;
  notes: string;
}

export function buildPharmacyHistoryExportRows(
  rows: PharmacyHistoryExportPreparedRow[],
  labels: PharmacyHistoryExportLabels
): Record<string, string | number>[] {
  return rows.map((item) => ({
    [labels.colType]: item.type,
    [labels.colId]: item.id,
    [labels.colDate]: item.date,
    [labels.colMedication]: item.medication,
    [labels.colDosage]: item.dosage,
    [labels.colQuantity]: item.quantity,
    [labels.colRequestedBy]: item.requestedBy,
    [labels.colPatients]: item.patients,
    [labels.colDeliveredOrReason]: item.deliveredOrReason,
    [labels.colNotes]: item.notes,
  }));
}

export interface PharmacyInventoryExportLabels {
  colMedication: string;
  colDosage: string;
  colDescription: string;
  colStockCurrent: string;
  colStockMin: string;
  colLocation: string;
  colExpiry: string;
  colStatus: string;
  colExpiryClass: string;
  colDaysToExpiry: string;
}

export interface PharmacyInventoryExportPreparedRow {
  medication: string;
  dosage: string;
  description: string;
  stock: number;
  minStock: number;
  location: string;
  expiry: string;
  statusLabel: string;
  expiryClassification: string;
  daysToExpiry: string | number;
}

export function buildPharmacyInventoryExportRows(
  rows: PharmacyInventoryExportPreparedRow[],
  labels: PharmacyInventoryExportLabels
): Record<string, string | number>[] {
  return rows.map((item) => ({
    [labels.colMedication]: item.medication,
    [labels.colDosage]: item.dosage,
    [labels.colDescription]: item.description,
    [labels.colStockCurrent]: item.stock,
    [labels.colStockMin]: item.minStock,
    [labels.colLocation]: item.location,
    [labels.colExpiry]: item.expiry,
    [labels.colStatus]: item.statusLabel,
    [labels.colExpiryClass]: item.expiryClassification,
    [labels.colDaysToExpiry]: item.daysToExpiry,
  }));
}
