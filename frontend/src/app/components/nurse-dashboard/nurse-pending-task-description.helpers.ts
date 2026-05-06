import type { TaskItem } from '../../services/nurse.service';

export function pendingTaskDescriptionPreview(task: TaskItem): string {
  const d = (task.description || '').trim();
  if (!d) {
    return '—';
  }
  return d.length > 72 ? `${d.slice(0, 69)}…` : d;
}
