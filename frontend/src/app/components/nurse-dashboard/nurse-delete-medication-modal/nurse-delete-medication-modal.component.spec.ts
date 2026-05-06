import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseDeleteMedicationModalComponent } from './nurse-delete-medication-modal.component';
import { ToastService } from '../../../services/toast.service';

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

describe('NurseDeleteMedicationModalComponent', () => {
  let fixture: ComponentFixture<NurseDeleteMedicationModalComponent>;
  const toastMock = { warning: jasmine.createSpy('warning') };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseDeleteMedicationModalComponent],
      providers: [{ provide: ToastService, useValue: toastMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseDeleteMedicationModalComponent);
    fixture.componentRef.setInput('medication', { name: 'Omeprazol', dosage: '20mg' });
    fixture.detectChanges();
    toastMock.warning.calls.reset();
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let dismissed = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-delete-medication-backdrop'
    ) as HTMLElement;
    backdrop.click();
    expect(dismissed).toBe(1);
    sub.unsubscribe();
  });

  it('canSubmit es false con motivo corto', () => {
    fixture.componentInstance.deleteReason = 'abc';
    expect(fixture.componentInstance.canSubmit).toBeFalse();
  });

  it('onConfirm muestra aviso y no emite si el motivo es corto', () => {
    let emitted = false;
    const sub = fixture.componentInstance.confirmed.subscribe(() => {
      emitted = true;
    });
    fixture.componentInstance.deleteReason = 'corto';
    fixture.componentInstance.onConfirm();
    expect(toastMock.warning).toHaveBeenCalledWith('El motivo debe tener al menos 10 caracteres');
    expect(emitted).toBeFalse();
    sub.unsubscribe();
  });

  it('onConfirm emite reason cuando el motivo es válido', () => {
    let payload: { reason: string } | undefined;
    const sub = fixture.componentInstance.confirmed.subscribe((p) => {
      payload = p;
    });
    fixture.componentInstance.deleteReason = '  Fin del tratamiento por alta médica  ';
    fixture.componentInstance.onConfirm();
    expect(payload).toEqual({ reason: 'Fin del tratamiento por alta médica' });
    expect(toastMock.warning).not.toHaveBeenCalled();
    sub.unsubscribe();
  });
});
