/** Fila de medicación para farmacia con total de dosis agregado. */
export interface PharmacyMedicationTotalDosesRow {
  totalDoses?: number;
}

/** Fila con checkbox «solicitado a farmacia». */
export type PharmacyMedicationRequestedRow = { requested?: boolean };

/** Suma `totalDoses` de la lista de medicamentos para farmacia (0 si falta o no es número). */
export function sumTotalDosesFromPharmacyMedications(
  medications: PharmacyMedicationTotalDosesRow[] | null | undefined
): number {
  return (medications || []).reduce((sum, med) => sum + (med.totalDoses || 0), 0);
}

/** Cuántas filas tienen `requested === true`. */
export function countPharmacyMedicationsRequested(
  medications: PharmacyMedicationRequestedRow[] | null | undefined
): number {
  return (medications || []).filter((m) => !!m.requested).length;
}

/** Marca o desmarca `requested` en todas las filas (mutación in-place, misma lista que la vista). */
export function setAllPharmacyMedicationsRequested(
  medications: PharmacyMedicationRequestedRow[] | null | undefined,
  requested: boolean
): void {
  (medications || []).forEach((med) => {
    med.requested = requested;
  });
}

/** Marca `requested=true` solo en filas aún sin marcar (desde KPI «sin solicitar» → pestaña Farmacia). */
export function selectUnrequestedPharmacyMedicationsForSend(
  medications: PharmacyMedicationRequestedRow[] | null | undefined
): void {
  (medications || []).forEach((med) => {
    if (!med.requested) {
      med.requested = true;
    }
  });
}
