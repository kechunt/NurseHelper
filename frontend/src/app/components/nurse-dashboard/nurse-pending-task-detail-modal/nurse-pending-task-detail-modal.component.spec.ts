import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TaskItem } from '../../../services/nurse.service';
import { NursePendingTaskDetailModalComponent } from './nurse-pending-task-detail-modal.component';

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

function baseTask(over: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 1,
    time: '08:00',
    hour: '08',
    type: 'medication',
    description: 'Control',
    patientName: 'Ana',
    bedNumber: '101',
    medication: 'Paracetamol',
    dosage: '500mg',
    completed: false,
    status: 'pending',
    ...over,
  };
}

describe('NursePendingTaskDetailModalComponent', () => {
  let fixture: ComponentFixture<NursePendingTaskDetailModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePendingTaskDetailModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePendingTaskDetailModalComponent);
    fixture.componentRef.setInput('task', baseTask());
    fixture.detectChanges();
  });

  it('typeLabel devuelve etiquetas por tipo', () => {
    const c = fixture.componentInstance;
    expect(c.typeLabel(baseTask({ type: 'medication' }))).toContain('Medicamento');
    expect(c.typeLabel(baseTask({ type: 'treatment' }))).toContain('Tratamiento');
    expect(c.typeLabel(baseTask({ type: 'check' }))).toContain('Chequeo');
    expect(c.typeLabel(baseTask({ type: 'otro' }))).toContain('Otro');
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('emite completeRequested al pulsar Marcar completada', () => {
    const t = baseTask();
    spyOn(fixture.componentInstance.completeRequested, 'emit');
    fixture.componentRef.setInput('task', t);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      '.nurse-pending-task-detail-action--complete'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(fixture.componentInstance.completeRequested.emit).toHaveBeenCalledWith(t);
  });

  it('emite notCompletedRequested y postponeRequested', () => {
    const t = baseTask();
    spyOn(fixture.componentInstance.notCompletedRequested, 'emit');
    spyOn(fixture.componentInstance.postponeRequested, 'emit');
    fixture.componentRef.setInput('task', t);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.nurse-pending-task-detail-action--missed') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.nurse-pending-task-detail-action--postpone') as HTMLButtonElement).click();
    expect(fixture.componentInstance.notCompletedRequested.emit).toHaveBeenCalledWith(t);
    expect(fixture.componentInstance.postponeRequested.emit).toHaveBeenCalledWith(t);
  });
});
