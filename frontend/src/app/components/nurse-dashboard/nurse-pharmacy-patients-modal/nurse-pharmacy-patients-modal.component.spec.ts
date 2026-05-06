import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NursePharmacyPatientsModalComponent } from './nurse-pharmacy-patients-modal.component';
import type { MedicationForPharmacy } from '../../../services/nurse.service';

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

describe('NursePharmacyPatientsModalComponent', () => {
  let fixture: ComponentFixture<NursePharmacyPatientsModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePharmacyPatientsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePharmacyPatientsModalComponent);
    const med: MedicationForPharmacy = {
      name: 'Paracetamol',
      dosage: '500mg',
      totalDoses: 4,
      patientsCount: 2,
      requested: false,
      patients: [
        { patientName: 'Ana', patientId: 1, bedNumber: '1', areaName: 'A' },
        { patientName: 'Luis', patientId: 2, bedNumber: '2', areaName: 'A' },
      ],
    };
    fixture.componentRef.setInput('med', med);
    fixture.detectChanges();
  });

  it('renderiza lista de pacientes', () => {
    const items = fixture.nativeElement.querySelectorAll('.pharmacy-patients-list-item');
    expect(items.length).toBe(2);
  });

  it('emite dismissed por backdrop y botón cerrar', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-pharmacy-patients-backdrop'
    ) as HTMLElement;
    backdrop.click();
    const close = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    close.click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });
});
