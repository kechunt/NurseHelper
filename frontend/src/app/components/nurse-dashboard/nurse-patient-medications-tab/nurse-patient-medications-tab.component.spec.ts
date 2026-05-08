import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import { NursePatientMedicationsTabComponent } from './nurse-patient-medications-tab.component';

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

const pendingSlot = (): MedicationTodaySlot => ({
  scheduleId: 1,
  name: 'Paracetamol',
  dosage: '500mg',
  notes: '',
  time: '08:00',
  scheduledTime: '2030-01-01T08:00:00',
  status: 'pending',
});

describe('NursePatientMedicationsTabComponent', () => {
  let fixture: ComponentFixture<NursePatientMedicationsTabComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePatientMedicationsTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePatientMedicationsTabComponent);
    fixture.componentRef.setInput('slots', [pendingSlot()]);
    fixture.componentRef.setInput('bedNumber', '401');
    fixture.componentRef.setInput('age', 72);
    fixture.componentRef.setInput('diagnosis', 'Hipertensión');
    fixture.detectChanges();
  });

  it('slotPending y slotStatusLabel delegan a los helpers', () => {
    const slot = pendingSlot();
    expect(fixture.componentInstance.slotPending(slot)).toBeTrue();
    expect(fixture.componentInstance.slotStatusLabel(slot)).toContain('Pendiente');

    const done = { ...slot, status: 'completed' as const, completed: true };
    expect(fixture.componentInstance.slotPending(done)).toBeFalse();
    expect(fixture.componentInstance.slotStatusLabel(done)).toContain('Administrado');
  });

  it('muestra resumen de cama, edad y diagnóstico', () => {
    const root = fixture.nativeElement.textContent;
    expect(root).toContain('401');
    expect(root).toContain('72 años');
    expect(root).toContain('Hipertensión');
  });

  it('cuando no hay diagnóstico muestra CTA para agregarlo', () => {
    fixture.componentRef.setInput('diagnosis', '');
    fixture.detectChanges();
    const root = fixture.nativeElement.textContent;
    expect(root).toContain('Sin diagnóstico');
    expect(root).toContain('Agregar');
  });

  it('emite saveDiagnosis al guardar desde el editor rápido', () => {
    fixture.componentRef.setInput('diagnosis', '');
    fixture.detectChanges();
    let saved = '';
    const sub = fixture.componentInstance.saveDiagnosis.subscribe((v) => {
      saved = v;
    });
    const addBtn = fixture.nativeElement.querySelector('.btn-diagnosis-summary') as HTMLButtonElement;
    expect(addBtn).toBeTruthy();
    addBtn.click();
    fixture.detectChanges();
    fixture.componentInstance.diagnosisDraft = 'DM2 bien controlada';
    const saveBtn = fixture.nativeElement.querySelector('.btn-diagnosis-summary--primary') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();
    expect(saved).toBe('DM2 bien controlada');
    sub.unsubscribe();
  });

  it('emite addMedication al pulsar agregar', () => {
    let n = 0;
    const sub = fixture.componentInstance.addMedication.subscribe(() => n++);
    const btn = fixture.nativeElement.querySelector('.add-med-btn') as HTMLButtonElement;
    btn.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('emite markGiven desde el modal al pulsar "Marcar administrado"', () => {
    let emitted: MedicationTodaySlot | undefined;
    const sub = fixture.componentInstance.markGiven.subscribe((s) => {
      emitted = s;
    });
    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    row.click();
    fixture.detectChanges();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.admin-table-row-actions-buttons .neuro-btn')
    ) as HTMLButtonElement[];
    const btn = buttons.find((b) => (b.textContent || '').includes('Marcar administrado')) as HTMLButtonElement;
    btn.click();
    expect(emitted?.scheduleId).toBe(1);
    sub.unsubscribe();
  });

  it('emite openDayDetail al pulsar ver detalle', () => {
    let emitted: MedicationTodaySlot | undefined;
    const sub = fixture.componentInstance.openDayDetail.subscribe((s) => {
      emitted = s;
    });
    const btn = fixture.nativeElement.querySelector('.med-notes-cell .neuro-btn-sm') as HTMLButtonElement;
    btn.click();
    expect(emitted?.name).toBe('Paracetamol');
    sub.unsubscribe();
  });

  it('abre modal de acciones al pulsar una fila', () => {
    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    row.click();
    fixture.detectChanges();
    const modalTitle = fixture.nativeElement.querySelector('.admin-table-row-actions-header h3') as HTMLElement;
    expect(modalTitle.textContent || '').toContain('Acciones');
  });
});
