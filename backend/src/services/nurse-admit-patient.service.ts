import { AppDataSource } from '../data-source';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { User, UserRole } from '../entities/User';
import { isNurseOnDuty } from './nurse-on-duty.service';
import { recordPatientShiftAssignment } from './patient-shift-assignment.service';
import { invalidateNurseDashboardCache } from './nurse-dashboard-cache.service';
import { pickCurrentShiftForNurse } from './nurse-shift-context.service';
import { Shift } from '../entities/Shift';

export type NurseAdmitPatientInput = {
  firstName: string;
  lastName: string;
  identificationNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  medicalObservations?: string | null;
  bedId?: number | null;
  assignToSelf?: boolean;
};

export type NurseAdmitPatientResult =
  | { ok: true; patient: Patient; bedNumber: string | null }
  | { ok: false; status: number; message: string; code?: string };

/** Alta rápida de paciente desde enfermería (área propia, cama opcional). */
export async function admitPatientForNurse(
  nurseId: number,
  input: NurseAdmitPatientInput,
): Promise<NurseAdmitPatientResult> {
  const onDuty = await isNurseOnDuty(nurseId);
  if (!onDuty) {
    return {
      ok: false,
      status: 403,
      message: 'Debes estar en turno con área asignada para ingresar pacientes',
      code: 'NURSE_OFF_DUTY',
    };
  }

  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  if (!firstName || !lastName) {
    return { ok: false, status: 400, message: 'Nombre y apellido son requeridos' };
  }

  const userRepo = AppDataSource.getRepository(User);
  const nurse = await userRepo.findOne({ where: { id: nurseId } });
  if (!nurse?.assignedAreaId) {
    return { ok: false, status: 400, message: 'No tienes área asignada' };
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const patientRepo = queryRunner.manager.getRepository(Patient);
    const patient = patientRepo.create({
      firstName,
      lastName,
      identificationNumber: input.identificationNumber?.trim() || null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      gender: input.gender?.trim() || null,
      medicalHistory: input.medicalHistory?.trim() || null,
      allergies: input.allergies?.trim() || null,
      medicalObservations: input.medicalObservations?.trim() || null,
      areaId: nurse.assignedAreaId,
      isActive: true,
      assignmentStatus: 'pending',
      lastAssignmentAt: null,
    });
    await patientRepo.save(patient);

    let bedNumber: string | null = null;

    if (input.bedId) {
      const bedRepo = queryRunner.manager.getRepository(Bed);
      const bed = await bedRepo.findOne({ where: { id: input.bedId } });
      if (!bed || bed.areaId !== nurse.assignedAreaId || bed.isActive === false) {
        await queryRunner.rollbackTransaction();
        return { ok: false, status: 400, message: 'Cama no válida para tu área' };
      }

      const occupant = await patientRepo
        .createQueryBuilder('p')
        .where('p.bedId = :bedId AND p.isActive = true', { bedId: bed.id })
        .getOne();
      if (occupant) {
        await queryRunner.rollbackTransaction();
        return { ok: false, status: 409, message: 'La cama ya está ocupada' };
      }

      patient.bedId = bed.id;
      patient.areaId = bed.areaId;
      await patientRepo.save(patient);
      bed.isOccupied = true;
      await bedRepo.save(bed);
      bedNumber = bed.bedNumber;
    }

    if (input.assignToSelf !== false) {
      patient.assignedToId = nurseId;
      patient.assignmentStatus = 'assigned';
      patient.lastAssignmentAt = new Date();
      await patientRepo.save(patient);

      const shiftRepo = AppDataSource.getRepository(Shift);
      const shifts = await shiftRepo.find({ order: { id: 'ASC' } });
      const current = pickCurrentShiftForNurse(shifts);
      const today = new Date().toISOString().split('T')[0];
      if (current) {
        await recordPatientShiftAssignment({
          date: today,
          shiftId: current.id,
          record: {
            patientId: patient.id,
            nurseId,
            areaId: nurse.assignedAreaId,
            status: 'assigned',
            source: 'manual',
          },
        });
      }
    }

    await queryRunner.commitTransaction();

    const saved = await AppDataSource.getRepository(Patient).findOne({
      where: { id: patient.id },
      relations: ['bed', 'bed.area'],
    });

    await invalidateNurseDashboardCache(nurseId);

    return { ok: true, patient: saved ?? patient, bedNumber };
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
