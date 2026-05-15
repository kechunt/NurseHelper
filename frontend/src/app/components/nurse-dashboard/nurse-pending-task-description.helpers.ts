import type { TaskItem } from '../../services/nurse.service';
import { nurseUiEmDash } from './nurse-dashboard-ui-i18n.helpers';

export function pendingTaskDescriptionPreview(task: TaskItem): string {
  const d = (task.description || '').trim();
  if (!d) {
    return nurseUiEmDash();
  }
  return d.length > 72 ? `${d.slice(0, 69)}…` : d;
}
