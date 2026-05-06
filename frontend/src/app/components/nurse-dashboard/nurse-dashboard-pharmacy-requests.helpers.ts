import type { MedicationForPharmacy } from '../../services/nurse.service';

export type PharmacyMedicationRequestPayload = {
  medicationName: string;
  dosage: string;
  quantity: number;
  patientsInfo: Array<{
    patientName: string;
    bedNumber: string;
    areaName: string;
    doses: any[];
  }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
};

export function pickRequestedPharmacyMedications(
  medications: MedicationForPharmacy[] | null | undefined
): MedicationForPharmacy[] {
  return (medications || []).filter((m) => !!m.requested);
}

export function buildPharmacyMedicationRequestPayload(
  med: MedicationForPharmacy
): PharmacyMedicationRequestPayload {
  const qty = Math.floor(Number(med.totalDoses));
  return {
    medicationName: med.name,
    dosage: med.dosage,
    quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    patientsInfo: med.patients.map((p) => ({
      patientName: p.patientName,
      bedNumber: p.bedNumber,
      areaName: p.areaName,
      doses: [],
    })),
    priority: 'normal',
    notes: `Solicitud para ${med.patientsCount} paciente(s) del área ${med.patients[0]?.areaName || 'N/A'}`,
  };
}
