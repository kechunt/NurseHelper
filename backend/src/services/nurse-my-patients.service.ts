import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Between, In } from 'typeorm';
import { logger } from '../utils/logger';

export interface NurseMyPatientMedicationSlot {
  name: string;
  time: string;
  dosage: string;
  scheduleId: number;
}

export interface NurseMyPatientTodayScheduleItem {
  time: string;
  type: string;
  description: string;
  completed: boolean;
  notCompleted: boolean;
  medication: string;
  dosage: string;
  scheduleId: number;
  notes: string;
  notCompletedReason: string;
}

export interface NurseMyPatientMedicationDetail {
  name: string;
  dosage: string;
  schedules: string;
  notes: string;
  frequency: string;
  scheduleId: number;
  suspended: boolean;
}

export interface NurseMyPatientListItem {
  id: number;
  firstName: string;
  lastName: string;
  identificationNumber: string;
  bedNumber: string;
  age: number;
  diagnosis: string;
  medications: NurseMyPatientMedicationSlot[];
  medicationsDetail: NurseMyPatientMedicationDetail[];
  todaySchedule: NurseMyPatientTodayScheduleItem[];
  treatmentHistory: unknown[];
  pendingTasks: number;
  priority: 'critical' | 'normal';
  medicalObservations: string;
  allergies: string;
  specialNeeds: string;
  generalObservations: string;
}

export type FetchMyPatientsResult =
  | { ok: true; patients: NurseMyPatientListItem[] }
  | { ok: false; status: number; body: Record<string, unknown> };

interface MedicationDetailAcc {
  name: string;
  dosage: string;
  schedules: string[];
  notes: string;
  frequency: string;
  scheduleId: number;
  suspended: boolean;
}

/**
 * Lista de pacientes de la enfermera (área / asignación directa) con medicación y agenda del día.
 * @param qRaw texto de búsqueda opcional (nombre, cama, id, documento); máx. 100 caracteres.
 */
export async function fetchMyPatientsForNurse(
  userId: number,
  qRaw: string | undefined
): Promise<FetchMyPatientsResult> {
  const userRepo = AppDataSource.getRepository(User);
  const bedRepo = AppDataSource.getRepository(Bed);
  const patientRepo = AppDataSource.getRepository(Patient);
  const scheduleRepo = AppDataSource.getRepository(Schedule);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    return { ok: false, status: 404, body: { message: 'Usuario no encontrado' } };
  }

  if (!user.assignedAreaId) {
    logger.info('⚠️ Enfermera sin área asignada');
    return { ok: true, patients: [] };
  }

  logger.info(`👩‍⚕️ Obteniendo pacientes para enfermera ID ${userId}, área ${user.assignedAreaId}`);

  let beds: Bed[] = [];
  try {
    logger.info(`🔍 Ejecutando consulta de camas en getMyPatients para áreaId: ${user.assignedAreaId}`);
    beds = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true,
      },
    });
    logger.info(`🛏️ Camas encontradas en el área: ${beds.length}`);
  } catch (bedError: unknown) {
    logger.error('❌ Error obteniendo camas en getMyPatients:', bedError);
    return {
      ok: false,
      status: 500,
      body: {
        message: 'Error al obtener camas',
        error: bedError instanceof Error ? bedError.message : 'Error desconocido',
      },
    };
  }

  const bedIds = beds.map((b) => b.id).filter((id) => id !== null && id !== undefined);
  if (bedIds.length === 0) {
    logger.info('⚠️ No hay camas en el área');
    return { ok: true, patients: [] };
  }

  let patientsInBeds: Patient[] = [];
  try {
    patientsInBeds = await patientRepo.find({
      where: { bedId: In(bedIds), isActive: true },
      relations: ['bed'],
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
      logger.error('❌ Error obteniendo pacientes de camas:', patientError);
      logger.error('Error details:', {
        name: patientError instanceof Error ? patientError.name : 'Unknown',
        message: patientError instanceof Error ? patientError.message : String(patientError),
        code: pe?.code,
        errno: (patientError as { errno?: number })?.errno,
        sqlState: (patientError as { sqlState?: string })?.sqlState,
        sqlMessage: (patientError as { sqlMessage?: string })?.sqlMessage,
        stack: patientError instanceof Error ? patientError.stack : undefined,
      });
      patientsInBeds = [];
    }
  }

  logger.info(`👥 Pacientes encontrados en camas: ${patientsInBeds.length}`);

  let patientsAssignedToNurse: Patient[] = [];
  try {
    patientsAssignedToNurse = await patientRepo.find({
      where: { assignedToId: userId, isActive: true },
      relations: ['bed'],
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

  const patientIds =
    patientsAssignedToNurse.length > 0
      ? patientsAssignedToNurse.map((p) => p.id).filter((id) => id !== null && id !== undefined)
      : patientsInBeds.map((p) => p.id).filter((id) => id !== null && id !== undefined);

  if (patientIds.length === 0) {
    logger.info('⚠️ No hay pacientes activos asignados');
    return { ok: true, patients: [] };
  }

  let allPatients: Patient[] = [];
  try {
    if (patientsAssignedToNurse.length > 0) {
      allPatients = patientsAssignedToNurse;
    } else {
      allPatients = await patientRepo.find({
        where: { id: In(patientIds), isActive: true },
        relations: ['bed'],
      });
    }
  } catch (allPatientsError: unknown) {
    const ape = allPatientsError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = ape?.message || ape?.sqlMessage || '';
    if (
      ape?.code === 'ER_BAD_FIELD_ERROR' &&
      (errorMessage.includes('assignedToId') ||
        errorMessage.includes('assignedTo') ||
        errorMessage.includes('Patient'))
    ) {
      logger.warn('⚠️ Columna assignedToId no encontrada. Cargando pacientes con select específico.');
      try {
        allPatients = await patientRepo.find({
          where: { id: In(patientIds), isActive: true },
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
      } catch (selectError) {
        logger.error('❌ Error obteniendo todos los pacientes con select:', selectError);
        return { ok: true, patients: [] };
      }
    } else {
      logger.error('❌ Error obteniendo todos los pacientes:', allPatientsError);
      return { ok: true, patients: [] };
    }
  }

  logger.info(`✅ Pacientes activos cargados: ${allPatients.length}`);

  const patientsMap = new Map(allPatients.map((p) => [p.id, p]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let allTodaySchedules: Schedule[] = [];
  try {
    if (patientIds.length > 0) {
      allTodaySchedules = await scheduleRepo.find({
        where: {
          patientId: In(patientIds),
          scheduledTime: Between(today, tomorrow),
        },
        order: { scheduledTime: 'ASC' },
      });
    }
  } catch (scheduleError) {
    logger.error('❌ Error obteniendo schedules de hoy:', scheduleError);
    allTodaySchedules = [];
  }

  const schedulesByPatient = new Map<number, Schedule[]>();
  for (const schedule of allTodaySchedules) {
    if (!schedulesByPatient.has(schedule.patientId)) {
      schedulesByPatient.set(schedule.patientId, []);
    }
    schedulesByPatient.get(schedule.patientId)!.push(schedule);
  }

  const allPatientIds = Array.from(patientsMap.keys()).filter((id) => id !== null && id !== undefined);
  let allMedicationsForPatients: Schedule[] = [];
  try {
    if (allPatientIds.length > 0) {
      allMedicationsForPatients = await scheduleRepo.find({
        where: {
          patientId: In(allPatientIds),
          type: ScheduleType.MEDICATION,
        },
        order: { scheduledTime: 'ASC' },
      });
    }
  } catch (medicationError) {
    logger.error('❌ Error obteniendo medicamentos:', medicationError);
    allMedicationsForPatients = [];
  }

  const medicationsByPatient = new Map<number, Schedule[]>();
  allMedicationsForPatients.forEach((med) => {
    if (!medicationsByPatient.has(med.patientId)) {
      medicationsByPatient.set(med.patientId, []);
    }
    medicationsByPatient.get(med.patientId)!.push(med);
  });

  const bedIdsFromAllPatients = allPatients
    .map((p) => p.bed?.id ?? p.bedId)
    .filter((id): id is number => id !== null && id !== undefined);

  let allBedsForPatients: Bed[] = [];
  if (bedIdsFromAllPatients.length > 0) {
    try {
      allBedsForPatients = await bedRepo.find({
        where: { id: In(bedIdsFromAllPatients), isActive: true },
      });
    } catch (bedError) {
      logger.error('❌ Error obteniendo camas de pacientes:', bedError);
      allBedsForPatients = [];
    }
  }

  const bedsMap = new Map<number, Bed>();
  allBedsForPatients.forEach((bed) => {
    bedsMap.set(bed.id, bed);
  });

  beds.forEach((bed) => {
    if (!bedsMap.has(bed.id)) {
      bedsMap.set(bed.id, bed);
    }
  });

  logger.info(`🗺️ Mapa de camas creado: ${bedsMap.size} entradas`);
  logger.info(`👥 Pacientes asignados directamente: ${patientsAssignedToNurse.length}`);
  logger.info(`👥 Total pacientes a procesar: ${allPatients.length}`);
  logger.info(`📋 IDs de pacientes asignados:`, patientsAssignedToNurse.map((p) => p.id));

  const patients: (NurseMyPatientListItem | null)[] = allPatients.map((patient) => {
    const resolvedBedId = patient.bed?.id ?? patient.bedId ?? null;
    logger.info(
      `🔍 Procesando paciente ID: ${patient.id}, nombre: ${patient.firstName} ${patient.lastName}, activo: ${patient.isActive}, bedId: ${resolvedBedId}`
    );
    if (!patient.isActive) {
      logger.info(`⏭️ Saltando paciente ${patient.id} porque no está activo`);
      return null;
    }

    const patientBed =
      patient.bed ?? (resolvedBedId != null ? bedsMap.get(resolvedBedId) : null) ?? null;
    const bedNumber = patientBed?.bedNumber ?? 'Sin cama asignada';

    const age = patient.dateOfBirth
      ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
      : 0;

    const patientSchedules = schedulesByPatient.get(patient.id) || [];

    const pendingTasks = patientSchedules.filter((s) => s.status === ScheduleStatus.PENDING).length;

    const todayMedications = patientSchedules.filter((s) => s.type === ScheduleType.MEDICATION);

    const medications: NurseMyPatientMedicationSlot[] = todayMedications.map((med) => ({
      name: med.medication || 'Medicamento',
      time: new Date(med.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dosage: med.dosage || '',
      scheduleId: med.id,
    }));

    const todaySchedule: NurseMyPatientTodayScheduleItem[] = patientSchedules.map((schedule) => ({
      time: new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      type: schedule.type === ScheduleType.MEDICATION ? 'medication' : 'checkup',
      description: schedule.description,
      completed: schedule.status === ScheduleStatus.COMPLETED,
      notCompleted:
        schedule.status === ScheduleStatus.MISSED || schedule.status === ScheduleStatus.CANCELLED,
      medication: schedule.medication || '',
      dosage: schedule.dosage || '',
      scheduleId: schedule.id,
      notes: schedule.notes || '',
      notCompletedReason: schedule.status === ScheduleStatus.MISSED ? schedule.notes || '' : '',
    }));

    const allPatientMedications = medicationsByPatient.get(patient.id) || [];

    const medicationsMap = new Map<string, MedicationDetailAcc>();
    allPatientMedications.forEach((schedule) => {
      const medName = schedule.medication || 'Medicamento';
      if (!medicationsMap.has(medName)) {
        medicationsMap.set(medName, {
          name: medName,
          dosage: schedule.dosage || '',
          schedules: [],
          notes: schedule.notes || '',
          frequency: '',
          scheduleId: schedule.id,
          suspended: schedule.status === ScheduleStatus.CANCELLED,
        });
      }
      const med = medicationsMap.get(medName)!;
      const timeStr = new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (!med.schedules.includes(timeStr)) {
        med.schedules.push(timeStr);
      }
    });

    const medicationsDetail: NurseMyPatientMedicationDetail[] = Array.from(medicationsMap.values()).map(
      (med) => {
        const timesCount = med.schedules.length;
        let frequency = '';
        if (timesCount === 1) frequency = 'Una vez al día';
        else if (timesCount === 2) frequency = 'Dos veces al día';
        else if (timesCount === 3) frequency = 'Tres veces al día';
        else if (timesCount === 4) frequency = 'Cuatro veces al día';
        else frequency = `${timesCount} veces al día`;

        return {
          ...med,
          schedules: med.schedules.join(', '),
          frequency,
        };
      }
    );

    const priority =
      patient.medicalObservations?.toLowerCase().includes('crítico') ||
      patient.medicalObservations?.toLowerCase().includes('urgente')
        ? 'critical'
        : 'normal';

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      identificationNumber: patient.identificationNumber || '',
      bedNumber,
      age,
      diagnosis: patient.medicalHistory || 'Sin diagnóstico',
      medications,
      medicationsDetail,
      todaySchedule,
      treatmentHistory: [],
      pendingTasks,
      priority,
      medicalObservations: patient.medicalObservations || 'Sin observaciones',
      allergies: patient.allergies || 'Ninguna conocida',
      specialNeeds: patient.specialNeeds || 'Ninguna',
      generalObservations: patient.generalObservations || 'Sin observaciones adicionales',
    };
  });

  const validPatients = patients.filter((p): p is NurseMyPatientListItem => p !== null);
  logger.info(`✅ Pacientes válidos retornados: ${validPatients.length}`);
  logger.info(
    `📋 Pacientes retornados:`,
    validPatients.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, bedNumber: p.bedNumber }))
  );

  const trimmedQ = typeof qRaw === 'string' ? qRaw.trim() : '';
  if (trimmedQ.length > 0) {
    if (trimmedQ.length > 100) {
      return {
        ok: false,
        status: 400,
        body: {
          message: 'El parámetro q admite como máximo 100 caracteres',
          code: 'VALIDATION_ERROR',
        },
      };
    }
    const q = trimmedQ.toLowerCase();
    const filtered = validPatients.filter((p) => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
      const bed = String(p.bedNumber || '').toLowerCase();
      const idStr = String(p.id ?? '');
      const ident = String(p.identificationNumber || '').toLowerCase();
      return (
        fullName.includes(q) ||
        bed.includes(q) ||
        idStr.includes(trimmedQ) ||
        ident.includes(q)
      );
    });
    return { ok: true, patients: filtered };
  }

  return { ok: true, patients: validPatients };
}
