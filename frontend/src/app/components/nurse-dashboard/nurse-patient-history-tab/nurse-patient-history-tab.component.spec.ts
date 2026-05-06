import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import { NursePatientHistoryTabComponent } from './nurse-patient-history-tab.component';

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

const sampleRecord = (): TreatmentRecord => ({
  date: '2026-05-01',
  time: '09:00',
  type: 'medicamento',
  nurseName: 'Ana',
  description: 'Dosis mañana',
  status: 'administered',
  medication: 'Med X',
  dosage: '10mg',
  notes: 'Paciente en ayunas',
  historyId: 100,
  scheduleId: null,
  source: 'administration',
});

describe('NursePatientHistoryTabComponent', () => {
  let fixture: ComponentFixture<NursePatientHistoryTabComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePatientHistoryTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePatientHistoryTabComponent);
    fixture.componentRef.setInput('records', [sampleRecord()]);
    fixture.componentRef.setInput('periodFilter', 'week');
    fixture.componentRef.setInput('outcomeFilter', 'all');
    fixture.detectChanges();
  });

  it('delegados statusLabel, notesPreview y notesBlockVisible devuelven texto coherente', () => {
    const r = sampleRecord();
    expect(fixture.componentInstance.statusLabel(r).length).toBeGreaterThan(0);
    expect(fixture.componentInstance.notesPreview(r)).toContain('Paciente');
    expect(fixture.componentInstance.notesBlockVisible(r)).toBeTrue();
  });

  it('emite periodFilterChange al cambiar periodo', () => {
    const vals: string[] = [];
    const sub = fixture.componentInstance.periodFilterChange.subscribe((v) => vals.push(v));
    const buttons = fixture.nativeElement.querySelectorAll(
      '.history-filter-row .filter-btn-neuro'
    ) as NodeListOf<HTMLButtonElement>;
    const hoy = Array.from(buttons).find((b) => b.textContent?.trim() === 'Hoy');
    expect(hoy).toBeTruthy();
    hoy!.click();
    expect(vals).toEqual(['today']);
    sub.unsubscribe();
  });

  it('emite outcomeFilterChange al cambiar resultado', () => {
    const vals: string[] = [];
    const sub = fixture.componentInstance.outcomeFilterChange.subscribe((v) => vals.push(v));
    const rows = fixture.nativeElement.querySelectorAll('.history-filter-row');
    const outcomeBtns = rows[1].querySelectorAll('.filter-btn-neuro');
    const realizados = Array.from(outcomeBtns as NodeListOf<HTMLButtonElement>).find(
      (b) => b.textContent?.trim() === 'Realizados'
    );
    expect(realizados).toBeTruthy();
    realizados!.click();
    expect(vals).toEqual(['done']);
    sub.unsubscribe();
  });

  it('emite openEdit y deleteRecord desde el modal de acciones de fila', () => {
    let edits = 0;
    let deletes = 0;
    const subE = fixture.componentInstance.openEdit.subscribe(() => edits++);
    const subD = fixture.componentInstance.deleteRecord.subscribe(() => deletes++);
    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(row).toBeTruthy();
    row.click();
    fixture.detectChanges();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.admin-table-row-actions-buttons .neuro-btn')
    ) as HTMLButtonElement[];
    const editBtn = buttons.find((b) => (b.textContent || '').includes('Editar')) as HTMLButtonElement;
    const delBtn = buttons.find((b) => (b.textContent || '').includes('Eliminar')) as HTMLButtonElement;
    expect(editBtn && delBtn).toBeTruthy();
    editBtn.click();
    expect(edits).toBe(1);

    // Al editar se cierra el modal; reabrimos para eliminar.
    row.click();
    fixture.detectChanges();
    const buttons2 = Array.from(
      fixture.nativeElement.querySelectorAll('.admin-table-row-actions-buttons .neuro-btn')
    ) as HTMLButtonElement[];
    const delBtn2 = buttons2.find((b) => (b.textContent || '').includes('Eliminar')) as HTMLButtonElement;
    expect(delBtn2).toBeTruthy();
    delBtn2.click();
    expect(deletes).toBe(1);
    subE.unsubscribe();
    subD.unsubscribe();
  });

  it('muestra mensaje vacío si no hay registros', () => {
    fixture.componentRef.setInput('records', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nurse-patient-history-tab-empty')).toBeTruthy();
  });
});
