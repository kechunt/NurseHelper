/** Fila mínima de medicamento en lista farmacia (checkbox «solicitado»). */
export type PharmacyRequestRow = { requested?: boolean };

/** Tarea agrupada por hora (solo campos usados para KPI «próxima hora»). */
export type AttentionTaskRow = {
  completed?: boolean;
  notCompleted?: boolean;
  scheduledTime?: string;
};

export type AttentionHourGroup = { tasks?: AttentionTaskRow[] };

/**
 * Cuántos medicamentos del día siguen **sin** marcar como solicitados a farmacia (`!requested`).
 */
export function countPharmacyMedicationsNotRequested(
  medications: PharmacyRequestRow[] | null | undefined
): number {
  return (medications || []).filter((m) => !m.requested).length;
}

/**
 * Tareas pendientes (no completadas ni marcadas no realizadas) con `scheduledTime`
 * en el intervalo **[windowStartMs, windowEndMs]** (ms desde epoch).
 */
export function countPendingTasksScheduledInWindow(
  hourGroups: AttentionHourGroup[] | null | undefined,
  windowStartMs: number,
  windowEndMs: number
): number {
  const flat = (hourGroups || []).flatMap((g) => g.tasks || []);
  return flat.filter((task) => {
    if (task.completed || task.notCompleted) {
      return false;
    }
    if (task.scheduledTime) {
      const ts = new Date(task.scheduledTime).getTime();
      return !isNaN(ts) && ts >= windowStartMs && ts <= windowEndMs;
    }
    return false;
  }).length;
}

/**
 * Total de tareas pendientes (no completadas ni marcadas como no realizadas) en todos los grupos por hora.
 */
export function countPendingTasksInHourGroups(
  hourGroups: AttentionHourGroup[] | null | undefined
): number {
  const flat = (hourGroups || []).flatMap((g) => g.tasks || []);
  return flat.filter((task) => !task.completed && !task.notCompleted).length;
}
