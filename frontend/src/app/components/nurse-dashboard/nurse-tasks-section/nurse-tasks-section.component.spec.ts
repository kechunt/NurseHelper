import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { NurseDayHistoryItem, TaskItem } from '../../../services/nurse.service';
import type { Patient } from '../nurse-dashboard.types';
import { NurseTasksSectionComponent } from './nurse-tasks-section.component';

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
    ensureLocalizeShim();
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
    const btn = fixture.nativeElement.querySelector('#nurse-tasks-section-add-task-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(fixture.componentInstance.addTaskClick.emit).toHaveBeenCalled();
  });

  it('sección pendientes: título, etiquetas de filtro y cabeceras de tabla localizables', () => {
    const h2 = fixture.nativeElement.querySelector('#nurse-tasks-pending-title') as HTMLElement;
    expect(h2?.textContent?.toLowerCase()).toContain('tareas');
    expect(h2?.textContent?.toLowerCase()).toContain('pendientes');
    const patientLabel = fixture.nativeElement.querySelector('label[for="tasks-patient-filter"]') as HTMLElement;
    expect(patientLabel?.textContent?.toLowerCase()).toContain('paciente');
    const th = Array.from(
      fixture.nativeElement.querySelectorAll('#tasks-section thead th')
    ) as HTMLElement[];
    expect(th.length).toBe(5);
    expect(th.some((c) => (c.textContent || '').includes('Hora'))).toBeTrue();
    expect(th.some((c) => (c.textContent || '').includes('Paciente'))).toBeTrue();
  });

  it('select de horario incluye opciones localizables', () => {
    const hourSelect = fixture.nativeElement.querySelector('#tasks-hour-filter') as HTMLSelectElement;
    const texts = Array.from(hourSelect.options).map((o) => o.textContent || '');
    expect(texts.some((t) => t.toLowerCase().includes('horas'))).toBeTrue();
  });

  it('cabecera de tareas: tooltips en acciones rápidas', () => {
    const addTask = fixture.nativeElement.querySelector('#nurse-tasks-section-add-task-btn') as HTMLButtonElement;
    const addMed = fixture.nativeElement.querySelector('#nurse-tasks-section-add-medication-btn') as HTMLButtonElement;
    expect(addTask?.title.toLowerCase()).toContain('tarea');
    expect(addMed?.title.toLowerCase()).toContain('medicamento');
  });

  it('historial del día: tooltip en exportar CSV cuando hay filas', () => {
    const row: NurseDayHistoryItem = {
      id: 1,
      scheduledTime: '2030-01-10T08:00:00.000Z',
      time: '08:00',
      type: 'medication',
      description: 'Dosis',
      patientName: 'Ana',
      bedNumber: '3A',
      medication: 'Jarabe',
      dosage: '5ml',
      status: 'completed',
      completed: true,
      missed: false,
    };
    fixture.componentRef.setInput('tasksDayHistoryItems', [row]);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector(
      '#nurse-tasks-section-day-history-toggle-btn'
    ) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    const exportBtn = fixture.nativeElement.querySelector(
      '#nurse-tasks-section-export-day-history-csv-btn'
    ) as HTMLButtonElement;
    expect(exportBtn).toBeTruthy();
    expect(exportBtn.title.toLowerCase()).toContain('csv');
  });

  it('emite clearTaskFilters', () => {
    spyOn(fixture.componentInstance.clearTaskFilters, 'emit');
    const clear = fixture.nativeElement.querySelector('#nurse-tasks-section-clear-filters-btn') as HTMLButtonElement;
    expect(clear).toBeTruthy();
    clear.click();
    expect(fixture.componentInstance.clearTaskFilters.emit).toHaveBeenCalled();
  });

  it('descriptionPreview delega en helper', () => {
    const prev = fixture.componentInstance.descriptionPreview(task);
    expect(typeof prev).toBe('string');
    expect(prev.length).toBeGreaterThan(0);
  });

  it('taskRowAriaLabel incluye tipo localizado y datos de fila', () => {
    const aria = fixture.componentInstance.taskRowAriaLabel(task);
    expect(aria).toContain('Medicamento');
    expect(aria).toContain('08:00');
    expect(aria).toContain('Ana');
    expect(aria).toContain('3A');
  });

  it('historial del día oculto por defecto', () => {
    expect(fixture.componentInstance.dayHistoryExpanded).toBeFalse();
    expect(fixture.nativeElement.querySelector('#nurse-tasks-day-history-panel')).toBeNull();
  });

  it('expande historial al pulsar Mostrar', () => {
    const toggle = fixture.nativeElement.querySelector(
      '#nurse-tasks-section-day-history-toggle-btn'
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
