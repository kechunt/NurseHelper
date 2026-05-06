/**
 * Filas en forma de objeto plano para `ExportService.exportToCSV`
 * (claves en español, alineadas con la exportación del historial del día).
 */
export type TasksDayHistoryCsvRow = {
  Fecha: string;
  Hora: string;
  Tipo: string;
  Paciente: string;
  Cama: string;
  Descripcion: string;
  Medicamento: string;
  Dosis: string;
  Resultado: string;
  HoraRegistro: string;
};

/** Subconjunto de `NurseDayHistoryItem` usado al construir el CSV. */
export type NurseDayHistoryItemForCsv = {
  time: string;
  type: string;
  patientName: string;
  bedNumber: string;
  description: string;
  medication?: string | null;
  dosage?: string | null;
  completed: boolean;
  missed: boolean;
  status: string;
  recordedAtTime?: string | null;
};

function resultadoLabel(row: NurseDayHistoryItemForCsv): string {
  if (row.completed) {
    return $localize`:@@nurseDayHistoryCsv.result.completed:Completada`;
  }
  if (row.missed) {
    return $localize`:@@nurseDayHistoryCsv.result.notDone:No realizada`;
  }
  return row.status;
}

export function mapNurseDayHistoryItemsToCsvRows(
  historyDateYmd: string,
  items: NurseDayHistoryItemForCsv[] | null | undefined
): TasksDayHistoryCsvRow[] {
  return (items || []).map((row) => ({
    Fecha: historyDateYmd,
    Hora: row.time,
    Tipo: row.type,
    Paciente: row.patientName,
    Cama: row.bedNumber,
    Descripcion: row.description,
    Medicamento: row.medication || '',
    Dosis: row.dosage || '',
    Resultado: resultadoLabel(row),
    HoraRegistro: row.recordedAtTime || '',
  }));
}

export function tasksDayHistoryCsvFilename(historyDateYmd: string): string {
  return `historial-dia-${historyDateYmd}.csv`;
}
