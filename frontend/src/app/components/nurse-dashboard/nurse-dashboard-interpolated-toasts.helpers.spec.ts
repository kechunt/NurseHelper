import {
  nurseDashboardAdministrationRegisterErrorToast,
  nurseDashboardCompleteScheduleItemSuccessToast,
  nurseDashboardCompleteTaskSuccessToast,
  nurseDashboardDeleteMedicationErrorToast,
  nurseDashboardDeleteMedicationSuccessToast,
  nurseDashboardLoadPatientDetailsErrorToast,
  nurseDashboardMarkMedicationRegisterErrorToast,
  nurseDashboardMedicationMarkedAdministeredSuccessToast,
  nurseDashboardMedicationSlotAdministeredSuccessToast,
  nurseDashboardNotCompletedTaskSaveDbErrorToast,
  nurseDashboardPharmacyBulkRequestErrorToast,
  nurseDashboardPharmacyBulkRequestSuccessToast,
  nurseDashboardPostponeTaskSuccessToast,
  nurseDashboardReactivateMedicationErrorToast,
  nurseDashboardReactivateMedicationSuccessToast,
  nurseDashboardSaveObservationSuccessToast,
  nurseDashboardSuspendMedicationErrorToast,
  nurseDashboardSuspendMedicationSuccessToast,
  nurseDashboardTaskNotAdministeredSuccessToast,
} from './nurse-dashboard-interpolated-toasts.helpers';

describe('nurseDashboardInterpolatedToasts', () => {
  it('medication slot administered success', () => {
    expect(
      nurseDashboardMedicationSlotAdministeredSuccessToast('Paracetamol', '08:00')
    ).toBe('Medicamento Paracetamol administrado (08:00)');
  });

  it('medication marked administered success uses fallback name', () => {
    expect(
      nurseDashboardMedicationMarkedAdministeredSuccessToast(undefined, '10:00')
    ).toBe('Medicamento medicamento marcado como ADMINISTRADO. Hora: 10:00');
  });

  it('mark medication register error', () => {
    expect(nurseDashboardMarkMedicationRegisterErrorToast('fallo')).toBe(
      'Error al registrar el medicamento: fallo'
    );
  });

  it('complete schedule item success (medication vs treatment)', () => {
    expect(
      nurseDashboardCompleteScheduleItemSuccessToast(
        'medication',
        'Diálisis',
        undefined,
        'hoy'
      )
    ).toBe('Medicamento administrado: Diálisis. Hora: hoy');

    expect(
      nurseDashboardCompleteScheduleItemSuccessToast(
        'treatment',
        undefined,
        'Algo',
        'mañana'
      )
    ).toBe('Tratamiento realizado: Algo. Hora: mañana');

    expect(
      nurseDashboardCompleteScheduleItemSuccessToast(undefined, undefined, undefined, 't')
    ).toBe('Tratamiento realizado: Item. Hora: t');
  });

  it('administration register error', () => {
    expect(nurseDashboardAdministrationRegisterErrorToast('x')).toBe(
      'Error al registrar la administración: x'
    );
  });

  it('save observation success', () => {
    expect(nurseDashboardSaveObservationSuccessToast('Ana')).toBe(
      'Observación guardada para Ana'
    );
    expect(nurseDashboardSaveObservationSuccessToast(undefined)).toBe(
      'Observación guardada para '
    );
  });

  it('pharmacy bulk success and error', () => {
    expect(nurseDashboardPharmacyBulkRequestSuccessToast(3)).toBe(
      '3 solicitud(es) enviada(s) a farmacia. Total: 3 medicamentos'
    );
    expect(nurseDashboardPharmacyBulkRequestErrorToast('timeout')).toBe(
      'Error al enviar las solicitudes: timeout'
    );
  });

  it('complete task, load patient, not completed, db error', () => {
    expect(nurseDashboardCompleteTaskSuccessToast('Gira')).toBe('Tarea completada: Gira');
    expect(nurseDashboardLoadPatientDetailsErrorToast('404')).toBe(
      'Error al cargar los detalles del paciente: 404'
    );
    expect(nurseDashboardTaskNotAdministeredSuccessToast('T1', 'R')).toBe(
      'T1 marcado como NO ADMINISTRADO. Motivo: R'
    );
    expect(nurseDashboardNotCompletedTaskSaveDbErrorToast('x')).toBe(
      'Error al guardar en la BD: x'
    );
  });

  it('suspend / delete / reactivate medication', () => {
    expect(nurseDashboardSuspendMedicationSuccessToast(2)).toBe(
      'Medicamento suspendido. 2 dosis afectadas.'
    );
    expect(nurseDashboardSuspendMedicationErrorToast('e')).toBe(
      'Error al suspender medicamento: e'
    );
    expect(nurseDashboardDeleteMedicationSuccessToast(1)).toBe(
      'Medicamento eliminado permanentemente. 1 dosis eliminadas.'
    );
    expect(nurseDashboardDeleteMedicationErrorToast('e')).toBe(
      'Error al eliminar medicamento: e'
    );
    expect(nurseDashboardReactivateMedicationSuccessToast(5)).toBe(
      'Medicamento reactivado correctamente. 5 dosis reactivadas.'
    );
    expect(nurseDashboardReactivateMedicationErrorToast('e')).toBe(
      'Error al reactivar medicamento: e'
    );
  });

  it('postpone task success', () => {
    expect(nurseDashboardPostponeTaskSuccessToast('2026-05-06', '14:30')).toBe(
      'Tarea pospuesta para el 2026-05-06 a las 14:30'
    );
  });
});
