import {
  ADMIN_CONFIRM_RELEASE_BED_MESSAGE,
  ADMIN_CONFIRM_RELEASE_BED_TITLE,
  ADMIN_CONFIRM_REMOVE_MEDICATION_MESSAGE,
  ADMIN_CONFIRM_REMOVE_MEDICATION_TITLE,
  ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_TITLE,
  ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_MESSAGE,
  ADMIN_CONFIRM_SCHEDULE_DAY_OFF_BULK_MESSAGE,
  adminConfirmRemovePatientAssignmentMessage,
  adminConfirmScheduleAssignWeekMessage,
  adminConfirmScheduleBulkAssignMessage,
  adminConfirmScheduleClearNurseMessage,
} from './admin-confirmation-copy.helpers';

describe('adminConfirmationCopy', () => {
  it('liberar cama y eliminar medicamento tienen copy estable', () => {
    expect(ADMIN_CONFIRM_RELEASE_BED_TITLE.length).toBeGreaterThan(0);
    expect(ADMIN_CONFIRM_RELEASE_BED_MESSAGE).toContain('liberar');
    expect(ADMIN_CONFIRM_REMOVE_MEDICATION_TITLE).toContain('medicamento');
    expect(ADMIN_CONFIRM_REMOVE_MEDICATION_MESSAGE).toContain('Eliminar');
    expect(ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_TITLE).toContain('asignación');
  });

  it('arma el mensaje de quitar asignación enfermera–paciente', () => {
    expect(
      adminConfirmRemovePatientAssignmentMessage('Ana', 'López', 'Bea', 'Ruiz')
    ).toBe(
      '¿Quitar a Ana López como paciente asignado a Bea Ruiz?'
    );
  });

  it('programación de turnos: mensajes dinámicos y variantes día de descanso bulk', () => {
    expect(
      adminConfirmScheduleAssignWeekMessage('Matutino', 'Lucía', 'Pérez')
    ).toBe('¿Asignar Matutino de Lunes a Domingo para Lucía Pérez?');
    expect(adminConfirmScheduleClearNurseMessage('A', 'B')).toBe('¿Limpiar todos los turnos de A B?');
    expect(adminConfirmScheduleBulkAssignMessage('Vespertino', 3)).toBe(
      '¿Asignar turno Vespertino a las 3 enfermera(s) seleccionada(s)?'
    );
    expect(ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_MESSAGE).toContain('TODOS');
    expect(ADMIN_CONFIRM_SCHEDULE_DAY_OFF_BULK_MESSAGE).toContain('automáticamente');
  });
});
