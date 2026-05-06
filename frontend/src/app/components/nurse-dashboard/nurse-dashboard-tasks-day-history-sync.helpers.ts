import type { NurseDashboardMainView } from './nurse-dashboard.types';

/**
 * La vista «tareas» muestra el historial del día; al entrar en esa vista hay que sincronizarlo con la API.
 */
export function nurseDashboardShouldLoadTasksDayHistory(view: NurseDashboardMainView): boolean {
  return view === 'tasks';
}
