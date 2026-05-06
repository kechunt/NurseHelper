/** Tratamiento/chequeo del día (API: treatmentsToday). */
export interface TreatmentTodayItem {
  scheduleId: number;
  time: string;
  scheduledTime: string;
  scheduleType: string;
  type: string;
  description: string;
  notes?: string;
  completed: boolean;
  notCompleted?: boolean;
  cancelled?: boolean;
  notCompletedReason?: string;
  status?: string;
}
