import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ComplianceStats, MedicationReport } from '../../../services/report.service';
import { NurseReportsModalComponent } from './nurse-reports-modal.component';

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

const complianceStub: ComplianceStats = {
  totalSchedules: 10,
  administered: 8,
  missed: 1,
  cancelled: 1,
  complianceRate: 80,
  byPatient: [{ patientId: 1, patientName: 'Ana', complianceRate: 90 }],
};

const medicationStub: MedicationReport[] = [
  {
    patientId: 1,
    patientName: 'Ana',
    medication: 'Med',
    dosage: '10mg',
    scheduled: 5,
    administered: 4,
    missed: 1,
    complianceRate: 80,
  },
];

describe('NurseReportsModalComponent', () => {
  let fixture: ComponentFixture<NurseReportsModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseReportsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseReportsModalComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('compliance', complianceStub);
    fixture.componentRef.setInput('medication', medicationStub);
    fixture.componentRef.setInput('exporting', false);
    fixture.componentRef.setInput('periodLabel', '2026-01-01 — 2026-01-07');
    fixture.detectChanges();
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.nurse-modal-backdrop-dim') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('emite csvDownload al pulsar botones CSV', () => {
    const kinds: Array<'compliance' | 'medication'> = [];
    const sub = fixture.componentInstance.csvDownload.subscribe((k) => kinds.push(k));
    (fixture.nativeElement.querySelector('#nurse-reports-download-csv-compliance-btn') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('#nurse-reports-download-csv-medication-btn') as HTMLButtonElement).click();
    expect(kinds).toEqual(['compliance', 'medication']);
    sub.unsubscribe();
  });

  it('botones de exportación tienen tooltips localizables', () => {
    const csvCompliance = fixture.nativeElement.querySelector(
      '#nurse-reports-download-csv-compliance-btn'
    ) as HTMLButtonElement;
    const csvMed = fixture.nativeElement.querySelector('#nurse-reports-download-csv-medication-btn') as HTMLButtonElement;
    const xlsCompliance = fixture.nativeElement.querySelector(
      '#nurse-reports-download-excel-compliance-btn'
    ) as HTMLButtonElement;
    const xlsMed = fixture.nativeElement.querySelector(
      '#nurse-reports-download-excel-medication-btn'
    ) as HTMLButtonElement;
    expect(csvCompliance?.title.toLowerCase()).toContain('csv');
    expect(csvMed?.title.toLowerCase()).toContain('csv');
    expect(xlsCompliance?.title.toLowerCase()).toContain('excel');
    expect(xlsMed?.title.toLowerCase()).toContain('excel');
  });

  it('emite excelDownload al pulsar botones Excel', () => {
    const kinds: Array<'compliance' | 'medication'> = [];
    const sub = fixture.componentInstance.excelDownload.subscribe((k) => kinds.push(k));
    (fixture.nativeElement.querySelector('#nurse-reports-download-excel-compliance-btn') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('#nurse-reports-download-excel-medication-btn') as HTMLButtonElement).click();
    expect(kinds).toEqual(['compliance', 'medication']);
    sub.unsubscribe();
  });

  it('muestra estado de carga cuando loading es true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nurse-reports-loading')?.textContent).toContain('Cargando');
  });

  it('muestra mensaje de error cuando error no es null', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', 'Fallo de red');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nurse-reports-error')?.textContent).toContain('Fallo de red');
  });

  it('línea de periodo muestra prefijo Periodo localizable', () => {
    const p = fixture.nativeElement.querySelector('.nurse-reports-period-line') as HTMLElement;
    expect(p?.textContent).toContain('Periodo');
    expect(p?.textContent).toContain('2026-01-01');
  });

  it('con filtro de personal: etiqueta, aria del select y opción «todas» localizables', () => {
    fixture.componentRef.setInput('showStaffNurseFilter', true);
    fixture.componentRef.setInput('staffNurses', [{ id: 1, name: 'Lucía' }]);
    fixture.componentRef.setInput('staffNurseUserId', null);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.nurse-reports-staff-filter__label') as HTMLLabelElement;
    expect(label?.textContent?.toLowerCase()).toContain('enfermer');
    const select = fixture.nativeElement.querySelector('#staff-reports-nurse-select') as HTMLSelectElement;
    expect(select?.getAttribute('aria-label')?.toLowerCase()).toContain('enfermer');
    expect(select?.options[0]?.textContent?.toLowerCase()).toContain('todas');
  });

  it('emite staffNurseFilterChange al elegir una enfermera', () => {
    fixture.componentRef.setInput('showStaffNurseFilter', true);
    fixture.componentRef.setInput('staffNurses', [
      { id: 1, name: 'Lucía' },
      { id: 2, name: 'Pedro' },
    ]);
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    const sub = fixture.componentInstance.staffNurseFilterChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('#staff-reports-nurse-select') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([2]);
    sub.unsubscribe();
  });

  it('muestra títulos de sección y cabeceras de tabla localizables', () => {
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.nurse-reports-section-title')
    ) as HTMLElement[];
    expect(titles.length).toBe(2);
    expect(titles[0].textContent?.toLowerCase()).toContain('cumplimiento');
    expect(titles[1].textContent?.toLowerCase()).toContain('medicación');
    const th = Array.from(fixture.nativeElement.querySelectorAll('.nurse-reports-table-wrap th')) as HTMLElement[];
    expect(th.some((el) => (el.textContent || '').includes('Paciente'))).toBeTrue();
    expect(th.some((el) => (el.textContent || '').includes('Medicamento'))).toBeTrue();
  });

  it('cabecera y pie Cerrar exponen ids y emiten dismissed', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    expect(fixture.nativeElement.querySelector('#nurse-reports-header-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-reports-footer-close-btn')).toBeTruthy();
    (fixture.nativeElement.querySelector('#nurse-reports-header-close-btn') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('#nurse-reports-footer-close-btn') as HTMLButtonElement).click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });

  it('pie del modal incluye botón Cerrar localizable', () => {
    const close = fixture.nativeElement.querySelector('#nurse-reports-footer-close-btn') as HTMLButtonElement;
    expect(close).toBeTruthy();
    expect(close.textContent?.trim()).toContain('Cerrar');
  });

  it('plantilla: ids en KPI de cumplimiento y filtro cancelados por id', () => {
    expect(fixture.nativeElement.querySelector('#nurse-reports-kpi-scheduled-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-reports-kpi-completed-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-reports-kpi-missed-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-reports-kpi-cancelled-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-reports-kpi-rate-btn')).toBeTruthy();
    (fixture.nativeElement.querySelector('#nurse-reports-kpi-cancelled-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector(
      '.nurse-reports-section .empty-message'
    ) as HTMLElement;
    expect(empty?.textContent?.toLowerCase()).toContain('cancel');
  });
});
