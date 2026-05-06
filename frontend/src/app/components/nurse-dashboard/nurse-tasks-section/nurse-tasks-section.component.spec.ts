import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TaskItem } from '../../../services/nurse.service';
import type { Patient } from '../nurse-dashboard.types';
import { NurseTasksSectionComponent } from './nurse-tasks-section.component';

describe('NurseTasksSectionComponent', () => {
  let fixture: ComponentFixture<NurseTasksSectionComponent>;

  const patients: Patient[] = [
    {
      id: '1',
      name: 'Ana',
      bedNumber: '3A',
      age: 40,
      diagnosis: '',
      medications: [],
      pendingTasks: 1,
      priority: 'normal',
    },
  ];

  const task: TaskItem = {
    id: 10,
    time: '08:00',
    hour: '08',
    type: 'medication',
    description: 'Tomar jarabe',
    patientName: 'Ana',
    bedNumber: '3A',
    medication: 'Jarabe',
    dosage: '5ml',
    completed: false,
    status: 'pending',
    scheduleId: 99,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NurseTasksSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseTasksSectionComponent);
    fixture.componentRef.setInput('patients', patients);
    fixture.componentRef.setInput('tasksGroupedByHour', [{ hour: '08', tasks: [task] }]);
    fixture.componentRef.setInput('tasksPatientFilter', '');
    fixture.componentRef.setInput('tasksHourFilter', 'all');
    fixture.componentRef.setInput('tasksDayHistoryDate', '2030-01-10');
    fixture.componentRef.setInput('tasksDayHistoryItems', []);
    fixture.componentRef.setInput('tasksDayHistoryLoading', false);
    fixture.componentRef.setInput('tasksDayHistoryError', null);
    fixture.detectChanges();
  });

  it('emite addTaskClick', () => {
    spyOn(fixture.componentInstance.addTaskClick, 'emit');
    const btn = fixture.nativeElement.querySelector(
      'button[title="Agregar nueva tarea"]'
    ) as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.addTaskClick.emit).toHaveBeenCalled();
  });

  it('emite clearTaskFilters', () => {
    spyOn(fixture.componentInstance.clearTaskFilters, 'emit');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button.neuro-btn-sm')
    ) as HTMLButtonElement[];
    const clear = buttons.find((b) => (b.textContent || '').includes('Limpiar'));
    expect(clear).toBeTruthy();
    clear!.click();
    expect(fixture.componentInstance.clearTaskFilters.emit).toHaveBeenCalled();
  });

  it('descriptionPreview delega en helper', () => {
    const prev = fixture.componentInstance.descriptionPreview(task);
    expect(typeof prev).toBe('string');
    expect(prev.length).toBeGreaterThan(0);
  });

  it('historial del día oculto por defecto', () => {
    expect(fixture.componentInstance.dayHistoryExpanded).toBeFalse();
    expect(fixture.nativeElement.querySelector('#nurse-tasks-day-history-panel')).toBeNull();
  });

  it('expande historial al pulsar Mostrar', () => {
    const toggle = fixture.nativeElement.querySelector(
      '.nurse-day-history-nested .toggle-btn-neuro'
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect((toggle.textContent || '').includes('Mostrar')).toBeTrue();
    toggle.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.dayHistoryExpanded).toBeTrue();
    expect(fixture.nativeElement.querySelector('#nurse-tasks-day-history-panel')).not.toBeNull();
  });

  it('emite openTaskDetail al hacer clic en la fila de tarea pendiente', () => {
    spyOn(fixture.componentInstance.openTaskDetail, 'emit');
    const row = fixture.nativeElement.querySelector(
      'tbody tr.task-row--clickable'
    ) as HTMLElement;
    expect(row).toBeTruthy();
    row.click();
    expect(fixture.componentInstance.openTaskDetail.emit).toHaveBeenCalledWith(task);
  });

  it('emite openTaskDetail al pulsar Enter en la fila', () => {
    spyOn(fixture.componentInstance.openTaskDetail, 'emit');
    const row = fixture.nativeElement.querySelector(
      'tbody tr.task-row--clickable'
    ) as HTMLElement;
    expect(row).toBeTruthy();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fixture.componentInstance.openTaskDetail.emit).toHaveBeenCalledWith(task);
  });
});
