/**
 * Validadores personalizados para la aplicación
 */

/**
 * Valida capacidad máxima de pacientes
 */
export function validateMaxPatients(value: number): { valid: boolean; error?: string } {
  if (value < 0) {
    return { valid: false, error: 'La capacidad no puede ser negativa' };
  }
  if (value > 50) {
    return { valid: false, error: 'La capacidad máxima es de 50 pacientes' };
  }
  return { valid: true };
}

/**
 * Valida reducción de capacidad
 */
export function validateCapacityReduction(
  newCapacity: number,
  currentAssignments: number
): { valid: boolean; error?: string; needsConfirmation?: boolean } {
  if (newCapacity < currentAssignments) {
    return {
      valid: false,
      needsConfirmation: true,
      error: `Actualmente tiene ${currentAssignments} pacientes asignados. ¿Desea reducir la capacidad a ${newCapacity}?`
    };
  }
  return { valid: true };
}
