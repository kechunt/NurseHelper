import {
  labelExpiryClassification,
  labelGender,
  labelHistorySource,
  labelPharmacyHistoryRef,
  labelScheduleStatus,
  labelScheduleType,
} from './report-export-labels.helpers';

describe('report-export-labels.helpers', () => {
  it('traduce tipos de tarea', () => {
    expect(labelScheduleType('medication')).toBe('Medicamento');
    expect(labelScheduleType('treatment')).toBe('Tratamiento');
    expect(labelScheduleType('check')).toBe('Control');
    expect(labelScheduleType('MED')).toBe('Medicamento');
    expect(labelScheduleType('')).toBe('—');
  });

  it('traduce estados con flags y códigos', () => {
    expect(labelScheduleStatus('pending', { completed: true })).toBe('Completada');
    expect(labelScheduleStatus('x', { missed: true })).toBe('No realizada');
    expect(labelScheduleStatus('pending')).toBe('Pendiente');
    expect(labelScheduleStatus('cancelled')).toBe('Cancelada');
    expect(labelScheduleStatus('administered')).toBe('Completada');
  });

  it('traduce fuente, género y caducidad', () => {
    expect(labelHistorySource('schedule')).toBe('Horario programado');
    expect(labelGender('female')).toBe('Femenino');
    expect(labelExpiryClassification('expiring_soon')).toBe('Por caducar');
    expect(labelExpiryClassification('expired')).toBe('Vencido');
    expect(labelExpiryClassification('none')).toBe('Sin alerta');
  });

  it('formatea referencia de historial farmacia', () => {
    expect(labelPharmacyHistoryRef({ type: 'delivery', deliveryId: 12 })).toBe('Entrega 12');
    expect(labelPharmacyHistoryRef({ type: 'rejection', requestId: 'R-9' })).toBe('Solicitud R-9');
    expect(labelPharmacyHistoryRef({})).toBe('—');
  });
});
