import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { In, Like } from 'typeorm';
import { logger } from '../utils/logger';
import {
  findClinicalNotesForPatient,
  mergeDbNotesWithLegacyColumn,
} from './patient-clinical-note.service';

export interface NursePatientDetailsPayload {
  id: number;
  firstName: string;
  lastName: string;
  identificationNumber: string;
  bedNumber: string;
  age: number;
  diagnosis: string;
  medicalHistory: string;
  medications: unknown[];
  medicationsToday: unknown[];
  medicationsDetail: unknown[];
  treatmentsToday: unknown[];
  treatmentsDetail: unknown[];
  todaySchedule: unknown[];
  treatmentHistory: unknown[];
  pendingTasks: number;
  priority: string;
  medicalObservations: string;
  allergies: string;
  specialNeeds: string;
  generalObservations: string;
  clinicalNotes: {
    diagnosis: Array<{ id: number | null; body: string; authorName: string | null; createdAt: string | null; legacy: boolean }>;
    medical: Array<{ id: number | null; body: string; authorName: string | null; createdAt: string | null; legacy: boolean }>;
    allergies: Array<{ id: number | null; body: string; authorName: string | null; createdAt: string | null; legacy: boolean }>;
    specialNeeds: Array<{ id: number | null; body: string; authorName: string | null; createdAt: string | null; legacy: boolean }>;
    general: Array<{ id: number | null; body: string; authorName: string | null; createdAt: string | null; legacy: boolean }>;
  };
}

export type FetchPatientDetailsForNurseResult =
  | { ok: true; detail: NursePatientDetailsPayload }
  | { ok: false; status: 403 | 404; body: { message: string } };

interface MedSlot {
  scheduleId: number;
  scheduledTime: string;
  timeLabel: string;
  dateLabel: string;
  status: string;
}

interface MedAcc {
  name: string;
  dosage: string;
  notes: string;
  frequency: string;
  slots: MedSlot[];
}

interface TreatmentSlot {
  scheduleId: number;
  scheduledTime: string;
  timeLabel: string;
  dateLabel: string;
  status: string;
  scheduleType: string;
}

interface TreatmentAcc {
  name: string;
  notes: string;
  primaryType: ScheduleType;
  slots: TreatmentSlot[];
}

export async function fetchPatientDetailsForNurse(
  userId: number,
  patientId: number
): Promise<FetchPatientDetailsForNurseResult> {
  const userRepo = AppDataSource.getRepository(User);
  const patientRepo = AppDataSource.getRepository(Patient);
  const bedRepo = AppDataSource.getRepository(Bed);
  const scheduleRepo = AppDataSource.getRepository(Schedule);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user || !user.assignedAreaId) {
    return { ok: false, status: 403, body: { message: 'No autorizado' } };
  }

  let patient: Patient | null = null;
  try {
    patient = await patientRepo.findOne({
      where: { id: patientId },
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
        'assignedToId',
        'createdAt',
        'updatedAt',
      ],
    });
  } catch (selectError: unknown) {
    const se = selectError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = se?.message || se?.sqlMessage || '';
    if (se?.code === 'ER_BAD_FIELD_ERROR' && errorMessage.includes('assignedToId')) {
      logger.warn('⚠️ Columna assignedToId no existe, cargando sin ese campo');
      patient = await patientRepo.findOne({ where: { id: patientId } });
    } else {
      throw selectError;
    }
  }

  if (!patient) {
    return { ok: false, status: 404, body: { message: 'Paciente no encontrado' } };
  }

  let isAuthorized = false;
  let bed: Bed | null = null;

  if (patient.assignedToId === userId) {
    logger.info(`✅ Paciente ${patientId} asignado directamente a enfermera ${userId}`);
    isAuthorized = true;
    if (patient.bedId) {
      bed = await bedRepo.findOne({ where: { id: patient.bedId } });
    }
  }

  if (!isAuthorized) {
    if (!patient.bedId) {
      return { ok: false, status: 403, body: { message: 'Paciente no asignado a una cama ni a tu área' } };
    }
    bed = await bedRepo.findOne({ where: { id: patient.bedId } });
    if (!bed || bed.areaId !== user.assignedAreaId) {
      return { ok: false, status: 403, body: { message: 'Paciente no asignado a tu área' } };
    }
    isAuthorized = true;
  }

  const age = patient.dateOfBirth
    ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
    : 0;

  const todaySchedules = await scheduleRepo
    .createQueryBuilder('schedule')
    .where('schedule.patientId = :patientId', { patientId: patient.id })
    .andWhere('DATE(schedule.scheduledTime) = CURDATE()')
    .orderBy('schedule.scheduledTime', 'ASC')
    .getMany();

  const pendingTasks = todaySchedules.filter((s) => s.status === ScheduleStatus.PENDING).length;

  const allSchedules = await scheduleRepo.find({
    where: {
      patientId: patient.id,
      type: ScheduleType.MEDICATION,
    },
    order: { scheduledTime: 'ASC' },
  });

  const medicationsMap = new Map<string, MedAcc>();
  allSchedules.forEach((schedule) => {
    const medName = schedule.medication || 'Medicamento';
    if (!medicationsMap.has(medName)) {
      medicationsMap.set(medName, {
        name: medName,
        dosage: schedule.dosage || '',
        notes: schedule.notes || '',
        frequency: '',
        slots: [],
      });
    }
    const med = medicationsMap.get(medName)!;
    if (schedule.dosage && !med.dosage) {
      med.dosage = schedule.dosage;
    }
    if (schedule.notes && !med.notes) {
      med.notes = schedule.notes;
    }
    const st = new Date(schedule.scheduledTime);
    med.slots.push({
      scheduleId: schedule.id,
      scheduledTime: st.toISOString(),
      timeLabel: st.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateLabel: st.toLocaleDateString('es-ES'),
      status: schedule.status,
    });
  });

  medicationsMap.forEach((med) => {
    med.slots.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  });

  const medicationsDetail = Array.from(medicationsMap.values()).map((med) => {
    const uniqueTimeLabels = [...new Set(med.slots.map((s) => s.timeLabel))];
    const timesCount = uniqueTimeLabels.length || med.slots.length;
    let frequency = '';
    if (timesCount === 1) frequency = 'Una vez al día';
    else if (timesCount === 2) frequency = 'Dos veces al día';
    else if (timesCount === 3) frequency = 'Tres veces al día';
    else if (timesCount === 4) frequency = 'Cuatro veces al día';
    else frequency = `${timesCount} veces al día`;

    const suspended =
      med.slots.length > 0 && med.slots.every((s) => s.status === ScheduleStatus.CANCELLED);

    const legacySchedulesStr = med.slots.map((s) => s.timeLabel).join(', ');

    return {
      name: med.name,
      dosage: med.dosage,
      notes: med.notes,
      frequency,
      schedules: legacySchedulesStr,
      scheduleSlots: med.slots,
      suspended,
    };
  });

  const treatmentsToday = todaySchedules
    .filter((s) => s.type !== ScheduleType.MEDICATION)
    .map((schedule) => ({
      scheduleId: schedule.id,
      time: new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      scheduledTime: new Date(schedule.scheduledTime).toISOString(),
      scheduleType:
        schedule.type === ScheduleType.CHECK
          ? 'check'
          : schedule.type === ScheduleType.TREATMENT
            ? 'treatment'
            : 'other',
      type: schedule.type === ScheduleType.CHECK ? 'checkup' : 'treatment',
      description: schedule.description,
      notes: schedule.notes || '',
      completed: schedule.status === ScheduleStatus.COMPLETED,
      notCompleted: schedule.status === ScheduleStatus.MISSED,
      cancelled: schedule.status === ScheduleStatus.CANCELLED,
      notCompletedReason: schedule.status === ScheduleStatus.MISSED ? schedule.notes || '' : '',
      status: schedule.status,
    }))
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  const allTreatmentSchedules = await scheduleRepo.find({
    where: {
      patientId: patient.id,
      type: In([ScheduleType.CHECK, ScheduleType.TREATMENT, ScheduleType.OTHER]),
    },
    order: { scheduledTime: 'ASC' },
  });

  const treatmentsDetailMap = new Map<string, TreatmentAcc>();
  allTreatmentSchedules.forEach((schedule) => {
    const key = (schedule.description || 'Tratamiento').trim() || 'Tratamiento';
    if (!treatmentsDetailMap.has(key)) {
      treatmentsDetailMap.set(key, {
        name: key,
        notes: schedule.notes || '',
        primaryType: schedule.type,
        slots: [],
      });
    }
    const tr = treatmentsDetailMap.get(key)!;
    if (schedule.notes && !tr.notes) {
      tr.notes = schedule.notes;
    }
    const st = new Date(schedule.scheduledTime);
    tr.slots.push({
      scheduleId: schedule.id,
      scheduledTime: st.toISOString(),
      timeLabel: st.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateLabel: st.toLocaleDateString('es-ES'),
      status: schedule.status,
      scheduleType:
        schedule.type === ScheduleType.CHECK
          ? 'check'
          : schedule.type === ScheduleType.TREATMENT
            ? 'treatment'
            : 'other',
    });
  });

  treatmentsDetailMap.forEach((tr) => {
    tr.slots.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  });

  const treatmentsDetail = Array.from(treatmentsDetailMap.values()).map((tr) => {
    const uniqueTimeLabels = [...new Set(tr.slots.map((s) => s.timeLabel))];
    const timesCount = uniqueTimeLabels.length || tr.slots.length;
    let frequency = '';
    if (timesCount === 1) frequency = 'Una vez al día';
    else if (timesCount === 2) frequency = 'Dos veces al día';
    else if (timesCount === 3) frequency = 'Tres veces al día';
    else if (timesCount === 4) frequency = 'Cuatro veces al día';
    else frequency = `${timesCount} veces al día`;

    const scheduleKindLabel =
      tr.primaryType === ScheduleType.CHECK
        ? 'Chequeo'
        : tr.primaryType === ScheduleType.TREATMENT
          ? 'Tratamiento'
          : 'Otro';

    const legacySchedulesStr = tr.slots.map((s) => s.timeLabel).join(', ');

    return {
      name: tr.name,
      scheduleKind: scheduleKindLabel,
      notes: tr.notes,
      frequency,
      schedules: legacySchedulesStr,
      scheduleSlots: tr.slots,
    };
  });

  const todaySchedule = todaySchedules.map((schedule) => ({
    time: new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }),
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

  const adminHistoryRepo = AppDataSource.getRepository(AdministrationHistory);
  const historyRecords = await adminHistoryRepo.find({
    where: { patientId: patient.id },
    relations: ['administeredBy', 'schedule'],
    order: { administeredAt: 'DESC' },
    take: 200,
  });

  const completedSchedules = await scheduleRepo.find({
    where: {
      patientId: patient.id,
      status: In([ScheduleStatus.COMPLETED, ScheduleStatus.MISSED, ScheduleStatus.CANCELLED]),
    },
    relations: ['assignedTo'],
    order: { scheduledTime: 'DESC' },
    take: 200,
  });

  const formatPlannedSlot = (d: Date) => d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

  const adminHistory = historyRecords
    .filter((record) => {
      if (record.administeredAt) return true;
      return (
        record.status === AdministrationStatus.NOT_ADMINISTERED ||
        record.status === AdministrationStatus.MISSED
      );
    })
    .map((record) => {
      const planned = new Date(record.scheduledTime);
      const eventDate = record.administeredAt ? new Date(record.administeredAt) : planned;
      return {
        historyId: record.id,
        scheduleId: record.scheduleId ?? null,
        source: 'administration',
        date: eventDate.toLocaleDateString('es-ES'),
        time: eventDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        type: (() => {
          const st = record.schedule?.type;
          if (st === ScheduleType.MEDICATION) return 'Medicamento';
          if (st === ScheduleType.TREATMENT) return 'Tratamiento';
          if (st === ScheduleType.CHECK) return 'Chequeo';
          if (st === ScheduleType.OTHER) return 'Otro';
          return record.type === 'medication' ? 'Medicamento' : 'Tratamiento';
        })(),
        description: record.schedule?.description || record.description || 'Sin descripción',
        medication: record.schedule?.medication ?? record.medication ?? null,
        dosage: record.schedule?.dosage ?? record.dosage ?? null,
        status: record.status,
        nurseName: record.administeredBy
          ? `${record.administeredBy.firstName} ${record.administeredBy.lastName}`
          : 'Desconocido',
        notes: record.notes || null,
        reasonNotAdministered: record.reasonNotAdministered || null,
        administeredAt: record.administeredAt
          ? new Date(record.administeredAt).toLocaleString('es-ES')
          : null,
        scheduledTimePlanned: formatPlannedSlot(planned),
      };
    });

  const scheduleHistory = completedSchedules
    .filter((schedule) => {
      const scheduleTime = new Date(schedule.scheduledTime);
      return !historyRecords.some((record) => {
        if (!record.administeredAt) return false;
        const recordTime = new Date(record.administeredAt);
        return (
          record.scheduleId === schedule.id &&
          Math.abs(scheduleTime.getTime() - recordTime.getTime()) < 60000
        );
      });
    })
    .map((schedule) => {
      const scheduleDate = new Date(schedule.scheduledTime);
      const status =
        schedule.status === ScheduleStatus.COMPLETED
          ? 'administered'
          : schedule.status === ScheduleStatus.MISSED
            ? 'missed'
            : 'not_administered';

      return {
        historyId: null,
        scheduleId: schedule.id,
        source: 'schedule',
        date: scheduleDate.toLocaleDateString('es-ES'),
        time: scheduleDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        type:
          schedule.type === ScheduleType.MEDICATION
            ? 'Medicamento'
            : schedule.type === ScheduleType.TREATMENT
              ? 'Tratamiento'
              : 'Chequeo',
        description: schedule.description || 'Sin descripción',
        medication: schedule.medication || null,
        dosage: schedule.dosage || null,
        status: status,
        nurseName: schedule.assignedTo
          ? `${schedule.assignedTo.firstName} ${schedule.assignedTo.lastName}`
          : 'Desconocido',
        notes: schedule.notes || null,
        reasonNotAdministered: schedule.status === ScheduleStatus.MISSED ? schedule.notes : null,
        administeredAt:
          schedule.status === ScheduleStatus.COMPLETED
            ? scheduleDate.toLocaleString('es-ES')
            : null,
        scheduledTimePlanned: formatPlannedSlot(scheduleDate),
      };
    });

  const postponedSchedules = await scheduleRepo.find({
    where: {
      patientId: patient.id,
      type: In([ScheduleType.CHECK, ScheduleType.TREATMENT, ScheduleType.OTHER]),
      notes: Like('%[Pospuesto]%'),
    },
    order: { updatedAt: 'DESC' },
    take: 100,
  });
  const postponeHistory = postponedSchedules.map((s) => {
    const ev = new Date(s.updatedAt);
    const slot = new Date(s.scheduledTime);
    return {
      historyId: null,
      scheduleId: s.id,
      source: 'postpone',
      date: ev.toLocaleDateString('es-ES'),
      time: ev.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      type:
        s.type === ScheduleType.CHECK
          ? 'Chequeo'
          : s.type === ScheduleType.TREATMENT
            ? 'Tratamiento'
            : 'Otro',
      description: s.description || 'Sin descripción',
      medication: null,
      dosage: null,
      status: 'postponed',
      nurseName: '—',
      notes: s.notes || null,
      reasonNotAdministered: null,
      administeredAt: null,
      scheduledTimePlanned: formatPlannedSlot(slot),
    };
  });

  const treatmentHistory = [...adminHistory, ...scheduleHistory, ...postponeHistory]
    .sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      return b.time.localeCompare(a.time);
    })
    .slice(0, 200);

  const medications = todaySchedules
    .filter((s) => s.type === ScheduleType.MEDICATION)
    .map((med) => ({
      name: med.medication || 'Medicamento',
      time: new Date(med.scheduledTime).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      dosage: med.dosage || '',
      scheduleId: med.id,
    }));

  const clinicalNoteRows = await findClinicalNotesForPatient(patient.id);
  const mh = patient.medicalHistory ?? '';
  const mo =
    patient.medicalObservations !== undefined && patient.medicalObservations !== null
      ? patient.medicalObservations
      : '';
  const al = patient.allergies !== undefined && patient.allergies !== null ? patient.allergies : '';
  const sn = patient.specialNeeds !== undefined && patient.specialNeeds !== null ? patient.specialNeeds : '';
  const go =
    patient.generalObservations !== undefined && patient.generalObservations !== null
      ? patient.generalObservations
      : '';

  const clinicalNotes = {
    diagnosis: mergeDbNotesWithLegacyColumn(clinicalNoteRows, mh, 'diagnosis'),
    medical: mergeDbNotesWithLegacyColumn(clinicalNoteRows, mo, 'medical'),
    allergies: mergeDbNotesWithLegacyColumn(clinicalNoteRows, al, 'allergies'),
    specialNeeds: mergeDbNotesWithLegacyColumn(clinicalNoteRows, sn, 'specialNeeds'),
    general: mergeDbNotesWithLegacyColumn(clinicalNoteRows, go, 'general'),
  };

  const medicationsToday = todaySchedules
    .filter((s) => s.type === ScheduleType.MEDICATION)
    .map((s) => {
      const st = new Date(s.scheduledTime);
      return {
        scheduleId: s.id,
        name: s.medication || 'Medicamento',
        medication: s.medication || 'Medicamento',
        dosage: s.dosage || '',
        notes: s.notes || '',
        time: st.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        scheduledTime: st.toISOString(),
        status: s.status,
        completed: s.status === ScheduleStatus.COMPLETED,
        notCompleted: s.status === ScheduleStatus.MISSED,
        cancelled: s.status === ScheduleStatus.CANCELLED,
      };
    })
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  const detail: NursePatientDetailsPayload = {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    identificationNumber: patient.identificationNumber || '',
    bedNumber: bed ? bed.bedNumber : 'Sin cama asignada',
    age,
    diagnosis: patient.medicalHistory || 'Sin diagnóstico',
    medicalHistory: patient.medicalHistory || '',
    medications,
    medicationsToday,
    medicationsDetail,
    treatmentsToday,
    treatmentsDetail,
    todaySchedule,
    treatmentHistory,
    pendingTasks,
    priority: 'normal',
    medicalObservations:
      patient.medicalObservations !== undefined && patient.medicalObservations !== null
        ? patient.medicalObservations
        : '',
    allergies: patient.allergies !== undefined && patient.allergies !== null ? patient.allergies : '',
    specialNeeds:
      patient.specialNeeds !== undefined && patient.specialNeeds !== null ? patient.specialNeeds : '',
    generalObservations:
      patient.generalObservations !== undefined && patient.generalObservations !== null
        ? patient.generalObservations
        : '',
    clinicalNotes,
  };

  return { ok: true, detail };
}
