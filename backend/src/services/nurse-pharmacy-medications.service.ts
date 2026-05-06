import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleType } from '../entities/Schedule';
import { In } from 'typeorm';
import { logger } from '../utils/logger';

export interface PharmacyPatientRow {
  patientName: string;
  patientId: number;
  bedNumber: string;
  areaName: string;
}

export interface MedicationForPharmacyGroup {
  name: string;
  dosage: string;
  totalDoses: number;
  patientsCount: number;
  patients: PharmacyPatientRow[];
  requested: boolean;
}

interface AccumulatorEntry {
  name: string;
  dosage: string;
  totalDoses: number;
  patients: Map<string, PharmacyPatientRow>;
  requested: boolean;
}

/**
 * Medicación programada para hoy (calendario local JS) agrupada por nombre + dosis,
 * con lista de pacientes del área de la enfermera (para solicitud a farmacia).
 */
export async function fetchMedicationsForPharmacyGrouped(
  userId: number
): Promise<MedicationForPharmacyGroup[]> {
  const userRepo = AppDataSource.getRepository(User);
  const bedRepo = AppDataSource.getRepository(Bed);
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const patientRepo = AppDataSource.getRepository(Patient);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user || !user.assignedAreaId) {
    return [];
  }

  logger.info(`💊 Obteniendo medicamentos para farmacia del área ${user.assignedAreaId}`);

  const bedsInArea = await bedRepo.find({
    where: {
      areaId: user.assignedAreaId,
      isActive: true,
    },
  });

  const bedIds = bedsInArea.map((b) => b.id);
  let patientsInBeds: Patient[] = [];
  if (bedIds.length > 0) {
    try {
      patientsInBeds = await patientRepo.find({
        where: { bedId: In(bedIds), isActive: true },
        select: ['id'],
      });
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
        logger.error('❌ Error obteniendo pacientes:', patientError);
        patientsInBeds = [];
      }
    }
  }
  const patientIdsInArea = patientsInBeds.map((p: Patient) => p.id);

  if (patientIdsInArea.length === 0) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const medications = await scheduleRepo
    .createQueryBuilder('schedule')
    .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
    .andWhere('schedule.type = :type', { type: ScheduleType.MEDICATION })
    .andWhere('schedule.scheduledTime >= :today', { today })
    .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
    .getMany();

  logger.info(`💉 Medicamentos encontrados: ${medications.length}`);

  const uniquePatientIds = [...new Set(medications.map((m) => m.patientId))];
  let allPatients: Patient[] = [];
  try {
    allPatients = await patientRepo.find({
      where: { id: In(uniquePatientIds) },
    });
  } catch (patientError: unknown) {
    const pe = patientError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = pe?.message || pe?.sqlMessage || '';
    if (
      pe?.code === 'ER_BAD_FIELD_ERROR' &&
      (errorMessage.includes('assignedToId') ||
        errorMessage.includes('assignedTo') ||
        errorMessage.includes('Patient'))
    ) {
      logger.warn('⚠️ Columna assignedToId no encontrada. Cargando pacientes con select específico.');
      allPatients = await patientRepo.find({
        where: { id: In(uniquePatientIds) },
        select: [
          'id',
          'firstName',
          'lastName',
          'identificationNumber',
          'dateOfBirth',
          'gender',
          'phone',
          'address',
          'medicalHistory',
          'allergies',
          'emergencyContact',
          'emergencyPhone',
          'emergencyRelation',
          'medicalObservations',
          'specialNeeds',
          'generalObservations',
          'medications',
          'treatmentHistory',
          'pendingTasks',
          'isActive',
          'bedId',
          'createdAt',
          'updatedAt',
        ],
      });
    } else {
      throw patientError;
    }
  }

  let patientsWithBeds: Patient[] = [];
  try {
    patientsWithBeds = await patientRepo.find({
      where: { id: In(uniquePatientIds) },
      select: ['id', 'bedId'],
    });
  } catch (bedError: unknown) {
    const be = bedError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = be?.message || be?.sqlMessage || '';
    if (
      be?.code === 'ER_BAD_FIELD_ERROR' &&
      (errorMessage.includes('bedId') ||
        errorMessage.includes('assignedToId') ||
        errorMessage.includes('assignedTo') ||
        errorMessage.includes('Patient'))
    ) {
      logger.warn('⚠️ Columna bedId o assignedToId no encontrada. Continuando sin camas.');
      patientsWithBeds = [];
    } else {
      throw bedError;
    }
  }

  const bedIdsFromPatients = patientsWithBeds
    .map((p) => p.bedId)
    .filter((id): id is number => id !== null && id !== undefined);

  const allBeds =
    bedIdsFromPatients.length > 0
      ? await bedRepo
          .createQueryBuilder('bed')
          .leftJoinAndSelect('bed.area', 'area')
          .where('bed.id IN (:...bedIds)', { bedIds: bedIdsFromPatients })
          .getMany()
      : [];

  const patientsMap = new Map(allPatients.map((p) => [p.id, p]));
  const bedsMapById = new Map(allBeds.map((b) => [b.id, b]));
  const patientsToBedsMap = new Map<number, Bed>();
  patientsWithBeds.forEach((p: Patient) => {
    if (p.bedId && bedsMapById.has(p.bedId)) {
      patientsToBedsMap.set(p.id, bedsMapById.get(p.bedId)!);
    }
  });

  const grouped: Record<string, AccumulatorEntry> = {};

  for (const med of medications) {
    const key = `${med.medication}-${med.dosage}`;

    if (!grouped[key]) {
      grouped[key] = {
        name: med.medication || 'Medicamento',
        dosage: med.dosage || '',
        totalDoses: 0,
        patients: new Map(),
        requested: false,
      };
    }

    grouped[key].totalDoses++;

    const patient = patientsMap.get(med.patientId);
    if (patient) {
      const patientKey = `${patient.firstName} ${patient.lastName}`;
      if (!grouped[key].patients.has(patientKey)) {
        const bed = patientsToBedsMap.get(patient.id);

        grouped[key].patients.set(patientKey, {
          patientName: `${patient.firstName} ${patient.lastName}`,
          patientId: patient.id,
          bedNumber: bed ? bed.bedNumber : 'N/A',
          areaName: bed?.area?.name || 'N/A',
        });
      }
    }
  }

  const result: MedicationForPharmacyGroup[] = Object.values(grouped).map((item) => ({
    name: item.name,
    dosage: item.dosage,
    totalDoses: item.totalDoses,
    patients: Array.from(item.patients.values()),
    patientsCount: item.patients.size,
    requested: item.requested,
  }));

  logger.info(`✅ Medicamentos agrupados: ${result.length}`);
  return result;
}
