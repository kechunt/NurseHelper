import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { reportService } from '../services/report.service';

export type ResolvedReportScope =
  | { ok: true; restrictToPatientIds: number[] | undefined }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Enfermera: pacientes visibles (`getPatientIdsVisibleToNurse`).
 * Admin/supervisor: sin `nurseUserId`, todo el centro; con `nurseUserId`, solo pacientes visibles para esa enfermera.
 */
export async function resolveReportPatientScope(
  req: AuthRequest,
  patientIdNum: number | undefined,
  nurseUserIdRaw: unknown
): Promise<ResolvedReportScope> {
  if (req.user?.role === UserRole.NURSE) {
    const restrictToPatientIds = await reportService.getPatientIdsVisibleToNurse(req.user.id);
    if (
      nurseUserIdRaw !== undefined &&
      nurseUserIdRaw !== null &&
      String(nurseUserIdRaw).trim() !== ''
    ) {
      return { ok: false, status: 403, body: { message: 'No permitido', code: 'FORBIDDEN' } };
    }
    if (patientIdNum !== undefined && !restrictToPatientIds.includes(patientIdNum)) {
      return {
        ok: false,
        status: 403,
        body: { message: 'No tienes acceso a datos de reporte de este paciente', code: 'FORBIDDEN' },
      };
    }
    return { ok: true, restrictToPatientIds };
  }

  if (nurseUserIdRaw === undefined || nurseUserIdRaw === null || String(nurseUserIdRaw).trim() === '') {
    return { ok: true, restrictToPatientIds: undefined };
  }

  const nurseUserId = parseInt(String(nurseUserIdRaw), 10);
  if (Number.isNaN(nurseUserId)) {
    return {
      ok: false,
      status: 400,
      body: { message: 'nurseUserId inválido', code: 'VALIDATION_ERROR' },
    };
  }

  const userRepo = AppDataSource.getRepository(User);
  const target = await userRepo.findOne({
    where: { id: nurseUserId, role: UserRole.NURSE, isActive: true },
  });
  if (!target) {
    return {
      ok: false,
      status: 404,
      body: { message: 'Enfermera no encontrada', code: 'NOT_FOUND' },
    };
  }

  const restrictToPatientIds = await reportService.getPatientIdsVisibleToNurse(nurseUserId);
  if (
    patientIdNum !== undefined &&
    restrictToPatientIds.length > 0 &&
    !restrictToPatientIds.includes(patientIdNum)
  ) {
    return {
      ok: false,
      status: 403,
      body: { message: 'El paciente no está en el ámbito de esa enfermera', code: 'FORBIDDEN' },
    };
  }
  return { ok: true, restrictToPatientIds };
}
