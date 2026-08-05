import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Shift } from '../entities/Shift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { User, UserRole } from '../entities/User';
import { recordPatientShiftAssignment } from './patient-shift-assignment.service';

export interface AssignmentSummary {
  date: string;
  shiftId: number | null;
  processed: number;
  assigned: number;
  pending: number;
  details: Array<{
    patientId: number;
    areaId: number | null;
    assignedToId: number | null;
    status: 'assigned' | 'pending';
    reason?: string;
  }>;
}

export class PatientAssignmentService {
  private patientRepository = AppDataSource.getRepository(Patient);
  private userRepository = AppDataSource.getRepository(User);
  private shiftRepository = AppDataSource.getRepository(Shift);
  private attendanceRepository = AppDataSource.getRepository(ShiftAttendance);

  private resolveDate(date?: string): string {
    return date && date.trim().length > 0 ? date : new Date().toISOString().split('T')[0];
  }

  private async resolveCurrentShiftId(): Promise<number | null> {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const shifts = await this.shiftRepository.find({ where: { isActive: true } });

    for (const shift of shifts) {
      const [startH, startM] = String(shift.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = String(shift.endTime || '00:00').split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      if (start < end && currentMinutes >= start && currentMinutes < end) {
        return shift.id;
      }
      if (start > end && (currentMinutes >= start || currentMinutes < end)) {
        return shift.id;
      }
    }
    return null;
  }

  private async getPresentNurseIds(date: string, shiftId: number): Promise<Set<number>> {
    const rows = await this.attendanceRepository.find({
      where: { date: new Date(`${date}T00:00:00`), shiftId },
    });
    const valid = new Set<ShiftAttendanceStatus>([ShiftAttendanceStatus.PRESENT, ShiftAttendanceStatus.LATE]);
    return new Set(rows.filter((r) => valid.has(r.status)).map((r) => r.nurseId));
  }

  async autoAssignForShift(params?: {
    date?: string;
    shiftId?: number | null;
    patientIds?: number[];
  }): Promise<AssignmentSummary> {
    const date = this.resolveDate(params?.date);
    const shiftId = params?.shiftId ?? (await this.resolveCurrentShiftId());
    if (!shiftId) {
      return {
        date,
        shiftId: null,
        processed: 0,
        assigned: 0,
        pending: 0,
        details: [],
      };
    }

    const presentNurseIds = await this.getPresentNurseIds(date, shiftId);
    const allPresentNurses = await this.userRepository.find({
      where: { role: UserRole.NURSE, isActive: true },
    });
    const nurses = allPresentNurses.filter(
      (n) => presentNurseIds.has(n.id) && n.assignedAreaId != null,
    );

    const patientsQb = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.assignedTo', 'assignedTo')
      .where('patient.isActive = :active', { active: true });

    if (params?.patientIds?.length) {
      patientsQb.andWhere('patient.id IN (:...patientIds)', { patientIds: params.patientIds });
    } else {
      patientsQb.andWhere('patient.bedId IS NOT NULL');
    }

    const patients = await patientsQb.getMany();

    const details: AssignmentSummary['details'] = [];
    let assigned = 0;
    let pending = 0;

    const nurseBuckets = new Map<number, User[]>();
    for (const nurse of nurses) {
      const areaId = nurse.assignedAreaId as number;
      if (!nurseBuckets.has(areaId)) nurseBuckets.set(areaId, []);
      nurseBuckets.get(areaId)!.push(nurse);
    }

    const candidateNurseIds = nurses.map((n) => n.id);
    const loadMap = new Map<number, number>();
    if (candidateNurseIds.length > 0) {
      const loadsRaw = await this.patientRepository
        .createQueryBuilder('p')
        .select('p.assignedToId', 'assignedToId')
        .addSelect('COUNT(*)', 'count')
        .where('p.isActive = :active', { active: true })
        .andWhere('p.assignedToId IN (:...ids)', { ids: candidateNurseIds })
        .groupBy('p.assignedToId')
        .getRawMany();
      for (const row of loadsRaw) {
        loadMap.set(Number(row.assignedToId), Number(row.count));
      }
    }

    for (const patient of patients) {
      const areaId = patient.areaId ?? null;
      if (!areaId) {
        await recordPatientShiftAssignment({
          date,
          shiftId,
          record: {
            patientId: patient.id,
            nurseId: null,
            areaId: null,
            status: 'pending',
            source: 'handoff',
            reason: 'Paciente sin area',
          },
        });
        pending++;
        details.push({
          patientId: patient.id,
          areaId: null,
          assignedToId: null,
          status: 'pending',
          reason: 'Paciente sin area',
        });
        continue;
      }

      const currentAssigned = patient.assignedToId ?? null;
      const currentNurse = patient.assignedTo ?? null;
      const currentValid =
        !!currentAssigned &&
        !!currentNurse &&
        currentNurse.isActive === true &&
        currentNurse.role === UserRole.NURSE &&
        currentNurse.assignedAreaId === areaId &&
        presentNurseIds.has(currentAssigned);

      if (currentValid) {
        await recordPatientShiftAssignment({
          date,
          shiftId,
          record: {
            patientId: patient.id,
            nurseId: currentAssigned,
            areaId,
            status: 'assigned',
            source: 'handoff',
          },
        });
        details.push({
          patientId: patient.id,
          areaId,
          assignedToId: currentAssigned,
          status: 'assigned',
        });
        assigned++;
        continue;
      }

      const areaNurses = nurseBuckets.get(areaId) || [];
      if (areaNurses.length === 0) {
        await recordPatientShiftAssignment({
          date,
          shiftId,
          record: {
            patientId: patient.id,
            nurseId: null,
            areaId,
            status: 'pending',
            source: 'handoff',
            reason: 'No hay enfermeras presentes en el area',
          },
        });
        pending++;
        details.push({
          patientId: patient.id,
          areaId,
          assignedToId: null,
          status: 'pending',
          reason: 'No hay enfermeras presentes en el area',
        });
        continue;
      }

      const eligible = areaNurses.filter((n) => {
        const max = n.maxPatients && n.maxPatients > 0 ? n.maxPatients : Number.MAX_SAFE_INTEGER;
        const load = loadMap.get(n.id) || 0;
        return load < max;
      });

      if (eligible.length === 0) {
        await recordPatientShiftAssignment({
          date,
          shiftId,
          record: {
            patientId: patient.id,
            nurseId: null,
            areaId,
            status: 'pending',
            source: 'handoff',
            reason: 'Capacidad maxima alcanzada en el area',
          },
        });
        pending++;
        details.push({
          patientId: patient.id,
          areaId,
          assignedToId: null,
          status: 'pending',
          reason: 'Capacidad maxima alcanzada en el area',
        });
        continue;
      }

      const preferredNurseId = currentAssigned;
      eligible.sort((a, b) => {
        if (preferredNurseId != null) {
          if (a.id === preferredNurseId) return -1;
          if (b.id === preferredNurseId) return 1;
        }
        const loadA = loadMap.get(a.id) || 0;
        const loadB = loadMap.get(b.id) || 0;
        if (loadA !== loadB) return loadA - loadB;
        return a.id - b.id;
      });
      const selected = eligible[0];

      await recordPatientShiftAssignment({
        date,
        shiftId,
        record: {
          patientId: patient.id,
          nurseId: selected.id,
          areaId,
          status: 'assigned',
          source: 'handoff',
        },
      });
      loadMap.set(selected.id, (loadMap.get(selected.id) || 0) + 1);
      assigned++;
      details.push({
        patientId: patient.id,
        areaId,
        assignedToId: selected.id,
        status: 'assigned',
      });
    }

    return {
      date,
      shiftId,
      processed: patients.length,
      assigned,
      pending,
      details,
    };
  }

  async syncAssignmentsForActiveShift(): Promise<AssignmentSummary> {
    return this.autoAssignForShift();
  }
}

export const patientAssignmentService = new PatientAssignmentService();
