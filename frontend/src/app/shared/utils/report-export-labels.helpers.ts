/** Etiquetas en español para exportaciones CSV/PDF. */

export function labelScheduleType(type: string | null | undefined): string {
  const t = String(type ?? '')
    .trim()
    .toLowerCase();
  switch (t) {
    case 'medication':
    case 'med':
      return 'Medicamento';
    case 'treatment':
    case 'trt':
      return 'Tratamiento';
    case 'check':
    case 'chk':
    case 'chequeo':
    case 'control':
      return 'Control';
    case '':
      return '—';
    default:
      return String(type).trim();
  }
}

export function labelScheduleStatus(
  status: string | null | undefined,
  flags?: { completed?: boolean; missed?: boolean; notCompleted?: boolean }
): string {
  if (flags?.completed) {
    return 'Completada';
  }
  if (flags?.missed || flags?.notCompleted) {
    return 'No realizada';
  }

  const s = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  switch (s) {
    case 'completed':
    case 'administered':
    case 'done':
    case 'realizado':
    case 'completada':
    case 'completado':
      return 'Completada';
    case 'missed':
    case 'not_completed':
    case 'notcompleted':
    case 'omitido':
    case 'no_realizada':
    case 'no_realizado':
      return 'No realizada';
    case 'pending':
    case 'pendiente':
      return 'Pendiente';
    case 'cancelled':
    case 'canceled':
    case 'cancelada':
    case 'cancelado':
      return 'Cancelada';
    case 'postponed':
    case 'postpone':
    case 'pospuesto':
    case 'pospuesta':
      return 'Pospuesta';
    case 'in_progress':
    case 'inprogress':
    case 'en_curso':
      return 'En curso';
    case '':
      return '—';
    default:
      return String(status).trim();
  }
}

export function labelHistorySource(source: string | null | undefined): string {
  const s = String(source ?? '')
    .trim()
    .toLowerCase();
  switch (s) {
    case 'history':
    case 'administration_history':
    case 'administration':
      return 'Historial de administración';
    case 'schedule':
    case 'scheduled':
      return 'Horario programado';
    case 'postpone':
    case 'postponed':
      return 'Posposición';
    case 'manual':
      return 'Registro manual';
    case '':
      return '—';
    default:
      return String(source).trim();
  }
}

export function labelGender(gender: string | null | undefined): string {
  const g = String(gender ?? '')
    .trim()
    .toLowerCase();
  switch (g) {
    case 'male':
    case 'm':
    case 'masculino':
      return 'Masculino';
    case 'female':
    case 'f':
    case 'femenino':
      return 'Femenino';
    case 'other':
    case 'otro':
    case 'o':
      return 'Otro';
    case '':
      return '—';
    default:
      return String(gender).trim();
  }
}

export function labelExpiryClassification(value: string | null | undefined): string {
  const c = String(value ?? '')
    .trim()
    .toLowerCase();
  switch (c) {
    case 'expired':
      return 'Vencido';
    case 'expiring_soon':
      return 'Por caducar';
    case 'none':
    case '':
      return 'Sin alerta';
    default:
      return String(value).trim();
  }
}

export function labelPharmacyHistoryRef(params: {
  type?: string;
  deliveryId?: string | number | null;
  requestId?: string | number | null;
}): string {
  const delivery = params.deliveryId != null && String(params.deliveryId).trim() !== ''
    ? String(params.deliveryId)
    : '';
  const request = params.requestId != null && String(params.requestId).trim() !== ''
    ? String(params.requestId)
    : '';
  const kind = String(params.type ?? '').toLowerCase();
  if (kind === 'delivery' && delivery) {
    return `Entrega ${delivery}`;
  }
  if (kind === 'rejection' && request) {
    return `Solicitud ${request}`;
  }
  if (delivery) {
    return `Entrega ${delivery}`;
  }
  if (request) {
    return `Solicitud ${request}`;
  }
  return '—';
}
