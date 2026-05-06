import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { In } from 'typeorm';
import { logger } from '../utils/logger';

export interface NurseMyBedPatientSummary {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  medicalObservations: string;
  allergies: string;
}

export interface NurseMyBedRow {
  id: number;
  bedNumber: string;
  areaId: number;
  patient: NurseMyBedPatientSummary | null;
}

export type FetchMyBedsResult =
  | { ok: true; beds: NurseMyBedRow[] }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Camas del área de la enfermera con paciente activo (si hay).
 */
export async function fetchMyBedsForNurse(userId: number): Promise<FetchMyBedsResult> {
  const userRepo = AppDataSource.getRepository(User);
  const bedRepo = AppDataSource.getRepository(Bed);
  const patientRepo = AppDataSource.getRepository(Patient);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    return { ok: false, status: 404, body: { message: 'Usuario no encontrado' } };
  }

  if (!user.assignedAreaId) {
    logger.info(`⚠️ Usuario ${userId} no tiene área asignada`);
    return { ok: true, beds: [] };
  }

  logger.info(`🛏️ Obteniendo camas para enfermera ID ${userId}, área ${user.assignedAreaId}`);
  logger.info(`🔍 Tipo de assignedAreaId: ${typeof user.assignedAreaId}, valor: ${user.assignedAreaId}`);

  let patientsAssignedToNurse: Patient[] = [];
  try {
    patientsAssignedToNurse = await patientRepo.find({
      where: { assignedToId: userId, isActive: true },
      select: ['id', 'bedId'],
    });
    logger.info(`✅ Pacientes asignados directamente a enfermera ${userId}: ${patientsAssignedToNurse.length}`);
  } catch (assignedError: unknown) {
    const ae = assignedError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = ae?.message || ae?.sqlMessage || '';
    if (ae?.code === 'ER_BAD_FIELD_ERROR' && errorMessage.includes('assignedToId')) {
      logger.warn('⚠️ Columna assignedToId no existe aún, usando filtro por área');
      patientsAssignedToNurse = [];
    } else {
      logger.error('❌ Error obteniendo pacientes asignados:', assignedError);
      patientsAssignedToNurse = [];
    }
  }

  let beds: Bed[] = [];
  try {
    logger.info(`🔍 Obteniendo TODAS las camas del área ${user.assignedAreaId}`);
    beds = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true,
      },
      order: { bedNumber: 'ASC' },
    });
    logger.info(`🛏️ Total de camas obtenidas en getMyBeds: ${beds.length}`);
  } catch (bedError: unknown) {
    logger.error('❌ Error obteniendo camas en getMyBeds:', bedError);
    logger.error('Error details:', {
      name: bedError instanceof Error ? bedError.name : 'Unknown',
      message: bedError instanceof Error ? bedError.message : String(bedError),
      code: (bedError as { code?: string })?.code,
      errno: (bedError as { errno?: number })?.errno,
      sqlState: (bedError as { sqlState?: string })?.sqlState,
      sqlMessage: (bedError as { sqlMessage?: string })?.sqlMessage,
      stack: bedError instanceof Error ? bedError.stack : undefined,
    });
    const errorDetails = {
      name: bedError instanceof Error ? bedError.name : 'Unknown',
      message: bedError instanceof Error ? bedError.message : String(bedError),
      code: (bedError as { code?: string })?.code,
      errno: (bedError as { errno?: number })?.errno,
      sqlState: (bedError as { sqlState?: string })?.sqlState,
      sqlMessage: (bedError as { sqlMessage?: string })?.sqlMessage,
      stack: bedError instanceof Error ? bedError.stack : undefined,
    };
    return {
      ok: false,
      status: 500,
      body: {
        message: 'Error al obtener camas',
        error: bedError instanceof Error ? bedError.message : 'Error desconocido',
        details: errorDetails,
      },
    };
  }

  const bedIds = beds.map((b) => b.id).filter((id) => id !== null && id !== undefined);

  let patientsInBeds: Patient[] = [];
  if (bedIds.length > 0) {
    try {
      patientsInBeds = await patientRepo
        .createQueryBuilder('patient')
        .select([
          'patient.id',
          'patient.firstName',
          'patient.lastName',
          'patient.dateOfBirth',
          'patient.medicalObservations',
          'patient.allergies',
          'patient.bedId',
          'patient.isActive',
        ])
        .where('patient.bedId IN (:...bedIds)', { bedIds })
        .andWhere('patient.isActive = :isActive', { isActive: true })
        .getMany();

      logger.info(`👥 Pacientes encontrados en camas usando query builder: ${patientsInBeds.length}`);

      patientsInBeds.forEach((p) => {
        logger.info(`  - Paciente ${p.id} (${p.firstName} ${p.lastName}) en cama ${p.bedId}`);
      });

      if (patientsAssignedToNurse.length > 0) {
        const existingPatientIds = new Set(patientsInBeds.map((p) => p.id));

        for (const assignedPatient of patientsAssignedToNurse) {
          if (
            !existingPatientIds.has(assignedPatient.id) &&
            assignedPatient.bedId &&
            bedIds.includes(assignedPatient.bedId)
          ) {
            const fullPatient = await patientRepo
              .createQueryBuilder('patient')
              .select([
                'patient.id',
                'patient.firstName',
                'patient.lastName',
                'patient.dateOfBirth',
                'patient.medicalObservations',
                'patient.allergies',
                'patient.bedId',
                'patient.isActive',
              ])
              .where('patient.id = :id', { id: assignedPatient.id })
              .getOne();
            if (fullPatient) {
              patientsInBeds.push(fullPatient);
            }
          }
        }
      }

      logger.info(`👥 Total pacientes encontrados en camas: ${patientsInBeds.length}`);
    } catch (patientError: unknown) {
      const pe = patientError as { code?: string; message?: string; sqlMessage?: string };
      const errorMessage = pe?.message || pe?.sqlMessage || '';
      if (
        pe?.code === 'ER_BAD_FIELD_ERROR' &&
        (errorMessage.includes('bedId') ||
          errorMessage.includes('assignedToId') ||
          errorMessage.includes('assignedTo') ||
          errorMessage.includes('Patient'))
      ) {
        logger.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
        patientsInBeds = [];
      } else {
        logger.error('❌ Error obteniendo pacientes en getMyBeds:', patientError);
        logger.error('Error details:', {
          name: patientError instanceof Error ? patientError.name : 'Unknown',
          message: patientError instanceof Error ? patientError.message : String(patientError),
          code: pe?.code,
          sqlState: (patientError as { sqlState?: string })?.sqlState,
          sqlMessage: (patientError as { sqlMessage?: string })?.sqlMessage,
        });
        patientsInBeds = [];
      }
    }
  }

  const patientsByBedId = new Map<number, Patient>();
  patientsInBeds.forEach((p: Patient) => {
    if (p.bedId !== null && p.bedId !== undefined) {
      patientsByBedId.set(p.bedId, p);
    }
  });

  const bedsWithPatients: NurseMyBedRow[] = beds.map((bed) => {
    let patientInfo: NurseMyBedPatientSummary | null = null;

    const patient = patientsByBedId.get(bed.id);
    if (patient && patient.isActive) {
      const age = patient.dateOfBirth
        ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
        : 0;

      patientInfo = {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        age,
        medicalObservations: patient.medicalObservations || '',
        allergies: patient.allergies || '',
      };

      logger.info(`✅ Cama ${bed.bedNumber} tiene paciente asignado:`, {
        bedId: bed.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
      });
    } else {
      logger.info(`ℹ️ Cama ${bed.bedNumber} está disponible (sin paciente)`);
    }

    return {
      id: bed.id,
      bedNumber: bed.bedNumber,
      areaId: bed.areaId,
      patient: patientInfo,
    };
  });

  logger.info(`📊 Resumen de camas retornadas:`, {
    total: bedsWithPatients.length,
    ocupadas: bedsWithPatients.filter((b) => b.patient !== null).length,
    disponibles: bedsWithPatients.filter((b) => b.patient === null).length,
  });

  return { ok: true, beds: bedsWithPatients };
}
