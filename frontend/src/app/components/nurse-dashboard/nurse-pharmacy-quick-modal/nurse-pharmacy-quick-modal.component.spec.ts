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
    const input = fixture.nativeElement.querySelector(
      '#nurse-pharmacy-quick-select-all-checkbox'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.medications.every((m) => m.requested)).toBeTrue();
    expect(changes).toBe(1);
    sub.unsubscribe();
  });

  it('plantilla: ids seleccionar todos y ver pacientes por fila', () => {
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-quick-select-all-checkbox')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-quick-view-patients-0')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-quick-view-patients-1')).toBeTruthy();
  });

  it('emite viewPatients al pulsar Ver pacientes en la primera fila', () => {
    let payload: MedicationForPharmacy | undefined;
    const sub = fixture.componentInstance.viewPatients.subscribe((m) => {
      payload = m;
    });
    (fixture.nativeElement.querySelector('#nurse-pharmacy-quick-view-patients-0') as HTMLButtonElement).click();
    expect(payload?.name).toBe('Paracetamol');
    sub.unsubscribe();
  });

  it('plantilla: botón enviar solicitud con id y texto de seleccionados', () => {
    const btn = fixture.nativeElement.querySelector('#nurse-pharmacy-quick-send-request-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('1');
    expect(btn.textContent?.toLowerCase()).toContain('seleccionados');
  });

  it('plantilla: ids abrir módulo farmacia, cerrar pie y cerrar cabecera', () => {
    const openBtn = fixture.nativeElement.querySelector('#nurse-pharmacy-quick-open-module-btn') as HTMLButtonElement;
    const closeBtn = fixture.nativeElement.querySelector('#nurse-pharmacy-quick-close-btn') as HTMLButtonElement;
    const headerClose = fixture.nativeElement.querySelector(
      '#nurse-pharmacy-quick-header-close-btn'
    ) as HTMLButtonElement;
    expect(openBtn).toBeTruthy();
    expect(closeBtn).toBeTruthy();
    expect(headerClose).toBeTruthy();
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
