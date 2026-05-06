import { nurseUiEmDash } from './nurse-dashboard-ui-i18n.helpers';

/** Estados de fila del modal «Horarios» (tabla compacta); distinto wording de administración en otros sitios. */
export function scheduleModalSlotStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return $localize`:@@nurseScheduleModal.slotStatus.pending:Pendiente`;
    case 'completed':
      return $localize`:@@nurseScheduleModal.slotStatus.completed:Completado`;
    case 'missed':
      return $localize`:@@nurseScheduleModal.slotStatus.missed:No realizado`;
    case 'cancelled':
      return $localize`:@@nurseScheduleModal.slotStatus.cancelled:Cancelado`;
    default:
      return status?.trim() ? status : nurseUiEmDash();
  }
}
