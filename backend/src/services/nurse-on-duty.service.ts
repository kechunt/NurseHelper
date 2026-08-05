import { buildNurseShiftContextPayload } from './nurse-shift-context.service';

/** True si la enfermera está presente o tarde en el turno activo del día. */
export async function isNurseOnDuty(nurseId: number): Promise<boolean> {
  const ctx = await buildNurseShiftContextPayload(nurseId);
  return ctx.onDuty;
}
