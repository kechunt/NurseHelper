import { buildAreasShiftCoverage, type AreasShiftCoveragePayload } from './area-shift-coverage.service';
import {
  listShiftAssignmentSuggestions,
  type ShiftAssignmentSuggestion,
} from './patient-shift-assignment.service';
import { emitAdminOperationalInvalidate } from './realtime.service';

export type AdminOperationalSummary = {
  date: string;
  hasActiveShift: boolean;
  shiftId: number | null;
  shiftName: string | null;
  shiftTime: string | null;
  message?: string;
  presentNursesCount: number;
  uncoveredAreasCount: number;
  pendingPatientsCount: number;
  assignedPatientsCount: number;
  pendingSamples: Array<{ patientId: number; areaId: number | null; reason?: string }>;
  cachedAt: string;
  cacheTtlSeconds: number;
};

const CACHE_TTL_MS = 45_000;
let cachedSummary: { expiresAt: number; payload: AdminOperationalSummary } | null = null;

export function invalidateAdminOperationalSummaryCache(): void {
  cachedSummary = null;
}

export async function buildAdminOperationalSummary(
  options?: { bypassCache?: boolean },
): Promise<AdminOperationalSummary> {
  const now = Date.now();
  if (!options?.bypassCache && cachedSummary && cachedSummary.expiresAt > now) {
    return cachedSummary.payload;
  }

  const coverage = await buildAreasShiftCoverage();
  const presentIds = new Set<number>();
  for (const row of coverage.areas) {
    for (const n of row.nurses) {
      presentIds.add(n.id);
    }
  }

  let suggestions: ShiftAssignmentSuggestion[] = [];
  if (coverage.hasActiveShift && coverage.shiftId != null) {
    suggestions = await listShiftAssignmentSuggestions({
      date: coverage.date,
      shiftId: coverage.shiftId,
    });
  }

  const pending = suggestions.filter((s) => s.status === 'pending');
  const assigned = suggestions.filter((s) => s.status === 'assigned');
  const uncoveredAreasCount = coverage.areas.filter((a) => a.nurses.length === 0).length;

  const payload: AdminOperationalSummary = {
    date: coverage.date,
    hasActiveShift: coverage.hasActiveShift,
    shiftId: coverage.shiftId,
    shiftName: coverage.shiftName,
    shiftTime: coverage.shiftTime,
    message: coverage.message,
    presentNursesCount: presentIds.size,
    uncoveredAreasCount,
    pendingPatientsCount: pending.length,
    assignedPatientsCount: assigned.length,
    pendingSamples: pending.slice(0, 8).map((p) => ({
      patientId: p.patientId,
      areaId: p.areaId,
      reason: p.reason,
    })),
    cachedAt: new Date().toISOString(),
    cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
  };

  cachedSummary = { expiresAt: now + CACHE_TTL_MS, payload };
  return payload;
}

/** Invalida resumen admin y cobertura en memoria tras cambios de asistencia/handoff. */
export function invalidateShiftOperationalCaches(): void {
  invalidateAdminOperationalSummaryCache();
  emitAdminOperationalInvalidate();
}

export type { AreasShiftCoveragePayload };
