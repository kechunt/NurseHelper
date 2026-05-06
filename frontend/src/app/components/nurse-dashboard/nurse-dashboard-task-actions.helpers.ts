export function hasTaskId(task: any): boolean {
  return !!task?.id;
}

export function resolveTaskId(task: any): number | null {
  const id = task?.scheduleId ?? task?.id;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeNotCompletedReason(raw: string | null | undefined): string | null {
  const reason = (raw || '').trim();
  return reason.length >= 10 ? reason : null;
}

export function markTaskAsMissedLocally(task: any, reason: string): void {
  if (!task) return;
  task.notCompleted = true;
  task.notCompletedReason = reason;
  task.status = 'missed';
  task.completed = false;
}

export function taskDisplayName(task: any): string {
  return task?.description || task?.medication || 'Tarea';
}

export function completeTaskLocally(task: any, now = new Date()): void {
  if (!task) return;
  task.completed = true;
  task.completedAt = now.toLocaleString('es-ES');
  task.status = 'completed';
}

export function buildPostponeIsoDateTime(event: { date: string; time: string }): string | null {
  const iso = `${event.date}T${event.time}:00`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export function openTaskActionModalState(task: any): any | null {
  return hasTaskId(task) ? task : null;
}

export function closeTaskActionModalState(): null {
  return null;
}
