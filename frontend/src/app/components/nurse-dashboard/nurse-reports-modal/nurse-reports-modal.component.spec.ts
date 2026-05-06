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
    const buttons = fixture.nativeElement.querySelectorAll('.modal-footer .neuro-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
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
});
