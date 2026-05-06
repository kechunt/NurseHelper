/** Una fila de medicación programada para hoy (API: medicationsToday). */
export interface MedicationTodaySlot {
  scheduleId: number;
  name: string;
  medication?: string;
  dosage: string;
  notes: string;
  time: string;
  scheduledTime: string;
  status: string;
  completed?: boolean;
  notCompleted?: boolean;
  cancelled?: boolean;
}
