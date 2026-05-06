import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TreatmentTodayItem } from '../treatment-today-item.model';
import { NursePatientTreatmentsDayTabComponent } from './nurse-patient-treatments-day-tab.component';

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

const pendingItem = (): TreatmentTodayItem => ({
  scheduleId: 10,
  time: '10:00',
  scheduledTime: '2030-01-01T10:00:00',
  scheduleType: 'recurring',
  type: 'treatment',
  description: 'Curación herida',
  notes: '',
  completed: false,
  status: 'pending',
});

describe('NursePatientTreatmentsDayTabComponent', () => {
  let fixture: ComponentFixture<NursePatientTreatmentsDayTabComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePatientTreatmentsDayTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePatientTreatmentsDayTabComponent);
    fixture.componentRef.setInput('slots', [pendingItem()]);
    fixture.detectChanges();
  });

  it('typeLabel, slotPending y statusLabel usan los helpers', () => {
    const slot = pendingItem();
    expect(fixture.componentInstance.typeLabel(slot.scheduleType)).toBeTruthy();
    expect(fixture.componentInstance.slotPending(slot)).toBeTrue();
    expect(fixture.componentInstance.statusLabel(slot)).toContain('Pendiente');
  });

  it('emite addTreatment', () => {
    let n = 0;
    const sub = fixture.componentInstance.addTreatment.subscribe(() => n++);
    (fixture.nativeElement.querySelector('.add-med-btn') as HTMLButtonElement).click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('emite markDone desde modal de acciones al pulsar realizado', () => {
    let emitted: TreatmentTodayItem | undefined;
    const sub = fixture.componentInstance.markDone.subscribe((s) => {
      emitted = s;
    });
    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    row.click();
    fixture.detectChanges();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.admin-table-row-actions-buttons .neuro-btn')
    ) as HTMLButtonElement[];
    const btn = buttons.find((el) => (el.textContent || '').includes('Marcar como realizado')) as HTMLButtonElement;
    btn.click();
    expect(emitted?.scheduleId).toBe(10);
    sub.unsubscribe();
  });

  it('emite openSlotDetail al pulsar Horarios', () => {
    let emitted: TreatmentTodayItem | undefined;
    const sub = fixture.componentInstance.openSlotDetail.subscribe((s) => {
      emitted = s;
    });
    const btn = fixture.nativeElement.querySelector('.med-slots-toggle-neuro') as HTMLButtonElement;
    btn.click();
    expect(emitted?.description).toBe('Curación herida');
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
