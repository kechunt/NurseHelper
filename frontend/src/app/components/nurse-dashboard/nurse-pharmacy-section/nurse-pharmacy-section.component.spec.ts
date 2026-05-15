import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MedicationForPharmacy, PharmacyShiftContactNurseDto } from '../../../services/nurse.service';
import { NursePharmacySectionComponent } from './nurse-pharmacy-section.component';

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

const sampleContact = (): PharmacyShiftContactNurseDto => ({
  shiftId: 1,
  shiftType: 'morning',
  shiftName: 'Mañana',
  startTime: '07:00',
  endTime: '15:00',
  contactName: 'Farmacia',
  phone: null,
  hasOnDutyContact: true,
});

describe('NursePharmacySectionComponent', () => {
  let fixture: ComponentFixture<NursePharmacySectionComponent>;

  const meds: MedicationForPharmacy[] = [
    {
      name: 'Med A',
      dosage: '10mg',
      totalDoses: 2,
      patientsCount: 1,
      patients: [{ patientName: 'P', patientId: 1, bedNumber: '1', areaName: 'A' }],
      requested: false,
    },
  ];

  beforeEach(async () => {
    ensureLocalizeShim();
    meds[0].requested = false;
    await TestBed.configureTestingModule({
      imports: [NursePharmacySectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePharmacySectionComponent);
    fixture.componentRef.setInput('medicationsForPharmacy', meds);
    fixture.componentRef.setInput('uniqueMedicationsCount', 1);
    fixture.componentRef.setInput('totalDosesToday', 2);
    fixture.componentRef.setInput('historyOpen', false);
    fixture.componentRef.setInput('historyDate', '2026-01-01');
    fixture.componentRef.setInput('historyLoading', false);
    fixture.componentRef.setInput('historyError', null);
    fixture.componentRef.setInput('historyItems', []);
    fixture.componentRef.setInput('pharmacyContactsByShift', []);
    fixture.detectChanges();
  });

  it('emite sendRequest al pulsar enviar', () => {
    spyOn(fixture.componentInstance.sendRequest, 'emit');
    const btn = fixture.nativeElement.querySelector('#nurse-pharmacy-section-send-request-btn') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.sendRequest.emit).toHaveBeenCalled();
  });

  it('emite viewPatients al pulsar Ver pacientes', () => {
    spyOn(fixture.componentInstance.viewPatients, 'emit');
    const btn = fixture.nativeElement.querySelector('#nurse-pharmacy-section-view-patients-0') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.viewPatients.emit).toHaveBeenCalledWith(meds[0]);
  });

  it('región contacto farmacia expone aria-label localizable', () => {
    fixture.componentRef.setInput('pharmacyContactsByShift', [sampleContact()]);
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('.pharmacy-shift-contacts') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.getAttribute('aria-label')).toContain('Contacto');
  });

  it('requestedCount refleja selección', () => {
    expect(fixture.componentInstance.requestedCount).toBe(0);
    meds[0].requested = true;
    fixture.detectChanges();
    expect(fixture.componentInstance.requestedCount).toBe(1);
  });

  it('toggleAllMedications marca todos vía cabecera', () => {
    const cb = fixture.nativeElement.querySelector('#nurse-pharmacy-section-select-all-checkbox') as HTMLInputElement;
    expect(cb).toBeTruthy();
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(meds.every((m) => m.requested)).toBe(true);
  });

  it('plantilla: ids seleccionar todos, ver pacientes, enviar e historial', () => {
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-section-select-all-checkbox')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-section-view-patients-0')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-section-send-request-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-pharmacy-section-history-toggle-btn')).toBeTruthy();
  });

  it('emite toggleHistory al pulsar Mostrar/Ocultar historial', () => {
    spyOn(fixture.componentInstance.toggleHistory, 'emit');
    (fixture.nativeElement.querySelector('#nurse-pharmacy-section-history-toggle-btn') as HTMLButtonElement).click();
    expect(fixture.componentInstance.toggleHistory.emit).toHaveBeenCalled();
  });

  it('checkbox cabecera y Ver pacientes exponen title localizable', () => {
    const cb = fixture.nativeElement.querySelector('#nurse-pharmacy-section-select-all-checkbox') as HTMLInputElement;
    expect(cb.title.toLowerCase()).toContain('seleccionar');
    const btn = fixture.nativeElement.querySelector('#nurse-pharmacy-section-view-patients-0') as HTMLButtonElement;
    expect(btn.title.toLowerCase()).toContain('medicamento');
  });

  it('título de sección hoy y cabeceras de tabla principal localizables', () => {
    const h2 = fixture.nativeElement.querySelector('#nurse-pharmacy-today-title') as HTMLElement;
    expect(h2?.textContent?.toLowerCase()).toContain('medicamento');
    const th = Array.from(fixture.nativeElement.querySelectorAll('thead th')) as HTMLElement[];
    expect(th.length).toBeGreaterThanOrEqual(6);
    expect(th.some((c) => (c.textContent || '').toLowerCase().includes('medicamento'))).toBeTrue();
    expect(th.some((c) => (c.textContent || '').toLowerCase().includes('paciente'))).toBeTrue();
  });

  it('título de historial y pista de fecha localizables', () => {
    fixture.componentRef.setInput('historyOpen', true);
    fixture.detectChanges();
    const h3 = fixture.nativeElement.querySelector('#nurse-pharmacy-history-title') as HTMLElement;
    expect(h3?.textContent?.toLowerCase()).toContain('historial');
    const hint = fixture.nativeElement.querySelector('.pharmacy-history-help') as HTMLElement;
    expect(hint?.textContent?.toLowerCase()).toContain('hoy');
  });

  it('statusLabel devuelve etiquetas localizables', () => {
    const c = fixture.componentInstance;
    expect(c.statusLabel('pending').toLowerCase()).toContain('pendiente');
    expect(c.statusLabel('in_preparation').toLowerCase()).toContain('preparación');
    expect(c.statusLabel('ready').toLowerCase()).toContain('lista');
    expect(c.statusLabel('delivered').toLowerCase()).toContain('entreg');
  });

  it('pharmacyContactDisplayName usa etiqueta por defecto sin nombre', () => {
    expect(fixture.componentInstance.pharmacyContactDisplayName('  Ana  ')).toBe('Ana');
    expect(fixture.componentInstance.pharmacyContactDisplayName(null).toLowerCase()).toContain('farmacia');
  });
});
