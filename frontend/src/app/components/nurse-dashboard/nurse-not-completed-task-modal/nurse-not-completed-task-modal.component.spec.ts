import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseNotCompletedTaskModalComponent } from './nurse-not-completed-task-modal.component';

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

describe('NurseNotCompletedTaskModalComponent', () => {
  let fixture: ComponentFixture<NurseNotCompletedTaskModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseNotCompletedTaskModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseNotCompletedTaskModalComponent);
    fixture.componentRef.setInput('task', {
      id: 10,
      patientName: '',
      description: 'Chequeo',
      medication: 'Paracetamol',
      dosage: '500mg',
    });
    fixture.componentRef.setInput('patientNameFallback', 'Paciente fallback');
    fixture.detectChanges();
  });

  it('usa fallback de paciente y descripción disponible', () => {
    expect(fixture.componentInstance.patientLine).toBe('Paciente fallback');
    expect(fixture.componentInstance.taskLine).toBe('Chequeo');
  });

  it('no confirma con motivo corto y sí con motivo válido', () => {
    spyOn(fixture.componentInstance.confirmed, 'emit');
    fixture.componentInstance.reason = 'corto';
    fixture.componentInstance.onConfirm();
    expect(fixture.componentInstance.confirmed.emit).not.toHaveBeenCalled();
    fixture.componentInstance.reason = 'Paciente no disponible';
    fixture.componentInstance.onConfirm();
    expect(fixture.componentInstance.confirmed.emit).toHaveBeenCalledWith({
      reason: 'Paciente no disponible',
    });
  });

  it('emite dismissed al cancelar', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    fixture.componentInstance.onCancel();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalled();
  });
});
