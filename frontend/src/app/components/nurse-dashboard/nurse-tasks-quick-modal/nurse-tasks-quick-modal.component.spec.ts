import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TaskItem } from '../../../services/nurse.service';
import { NurseTasksQuickModalComponent } from './nurse-tasks-quick-modal.component';

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

function taskItem(over: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 1,
    time: '08:00',
    hour: '08',
    type: 'medication',
    description: 'Dosis matutina',
    patientName: 'Ana',
    bedNumber: '101',
    medication: null,
    dosage: null,
    completed: false,
    status: 'pending',
    ...over,
  };
}

describe('NurseTasksQuickModalComponent', () => {
  let fixture: ComponentFixture<NurseTasksQuickModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseTasksQuickModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseTasksQuickModalComponent);
    fixture.componentRef.setInput('hourGroups', [{ hour: '08:00', tasks: [taskItem()] }]);
    fixture.detectChanges();
  });

  it('descriptionPreview devuelve — si no hay descripción', () => {
    expect(fixture.componentInstance.descriptionPreview(taskItem({ description: '   ' }))).toBe('—');
  });

  it('descriptionPreview no trunca textos cortos', () => {
    const d = 'abc';
    expect(fixture.componentInstance.descriptionPreview(taskItem({ description: d }))).toBe(d);
  });

  it('descriptionPreview trunca textos largos', () => {
    const long = 'x'.repeat(80);
    const out = fixture.componentInstance.descriptionPreview(taskItem({ description: long }));
    expect(out.endsWith('…')).toBeTrue();
    expect(out.length).toBeLessThan(long.length);
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.nurse-modal-backdrop-dim') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('emite openTaskDetail al pulsar una fila', () => {
    const t = taskItem({ id: 99 });
    fixture.componentRef.setInput('hourGroups', [{ hour: '09:00', tasks: [t] }]);
    fixture.detectChanges();

    let emitted: TaskItem | undefined;
    const sub = fixture.componentInstance.openTaskDetail.subscribe((x) => {
      emitted = x;
    });
    const row = fixture.nativeElement.querySelector('tbody tr.task-row--clickable') as HTMLTableRowElement;
    row.click();
    expect(emitted?.id).toBe(99);
    sub.unsubscribe();
  });

  it('muestra estado vacío si hourGroups está vacío', () => {
    fixture.componentRef.setInput('hourGroups', []);
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });
});
