import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MedicationForPharmacy } from '../../../services/nurse.service';
import { NursePharmacyQuickModalComponent } from './nurse-pharmacy-quick-modal.component';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

function med(partial: Partial<MedicationForPharmacy> = {}): MedicationForPharmacy {
  return {
    name: 'Paracetamol',
    dosage: '500mg',
    totalDoses: 3,
    patientsCount: 1,
    patients: [
      { patientName: 'Ana', patientId: 1, bedNumber: '101', areaName: 'A1' },
    ],
    requested: false,
    ...partial,
  };
}

describe('NursePharmacyQuickModalComponent', () => {
  let fixture: ComponentFixture<NursePharmacyQuickModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePharmacyQuickModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePharmacyQuickModalComponent);
    fixture.componentRef.setInput('medications', [med(), med({ name: 'Ibuprofeno', requested: true })]);
    fixture.componentRef.setInput('uniqueMedicationsCount', 2);
    fixture.componentRef.setInput('totalDosesToday', 8);
    fixture.detectChanges();
  });

  it('requestedSelectedCount cuenta filas marcadas', () => {
    expect(fixture.componentInstance.requestedSelectedCount).toBe(1);
  });

  it('toggleAllMedications marca todas y emite requestStateChanged', () => {
    let changes = 0;
    const sub = fixture.componentInstance.requestStateChanged.subscribe(() => changes++);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    fixture.componentInstance.toggleAllMedications({ target: input } as unknown as Event);
    expect(fixture.componentInstance.medications.every((m) => m.requested)).toBeTrue();
    expect(changes).toBe(1);
    sub.unsubscribe();
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.nurse-modal-backdrop-dim') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });
});
