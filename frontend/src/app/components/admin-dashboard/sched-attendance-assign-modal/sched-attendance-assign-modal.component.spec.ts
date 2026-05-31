import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchedAttendanceAssignModalComponent } from './sched-attendance-assign-modal.component';

describe('SchedAttendanceAssignModalComponent', () => {
  let fixture: ComponentFixture<SchedAttendanceAssignModalComponent>;

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

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [SchedAttendanceAssignModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedAttendanceAssignModalComponent);
    fixture.componentRef.setInput('personName', 'Ana López');
    fixture.componentRef.setInput('personRoleLabel', 'Enfermera:');
    fixture.componentRef.setInput('shiftLabel', 'Matutino (08:00 - 15:00)');
    fixture.componentRef.setInput('intro', 'Confirma el área y marca su asistencia.');
    fixture.componentRef.setInput('areaLabel', 'Área asignada');
    fixture.componentRef.setInput('noAreaOptionLabel', 'Sin área');
    fixture.componentRef.setInput('suggestedHint', 'Área sugerida según turnos anteriores.');
    fixture.componentRef.setInput('areas', [{ id: 1, name: 'UCI' }]);
    fixture.detectChanges();
  });

  it('renderiza resumen y botones de asistencia', () => {
    expect(fixture.nativeElement.querySelectorAll('.task-info-summary').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('.sched-attendance-status-btn').length).toBe(5);
  });

  it('emite saveAreaOnly desde el footer', () => {
    spyOn(fixture.componentInstance.saveAreaOnly, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-primary-neuro') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.saveAreaOnly.emit).toHaveBeenCalled();
  });

  it('emite markAttendance al pulsar Presente', () => {
    spyOn(fixture.componentInstance.markAttendance, 'emit');
    const btn = fixture.nativeElement.querySelector(
      '.sched-attendance-status-btn--present',
    ) as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.markAttendance.emit).toHaveBeenCalledWith('present');
  });
});
