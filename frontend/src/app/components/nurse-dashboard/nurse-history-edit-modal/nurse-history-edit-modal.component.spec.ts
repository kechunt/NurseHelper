import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { NurseHistoryEditRecord } from './nurse-history-edit-modal.component';
import { NurseHistoryEditModalComponent } from './nurse-history-edit-modal.component';
import { NurseService } from '../../../services/nurse.service';
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

describe('NurseHistoryEditModalComponent', () => {
  let fixture: ComponentFixture<NurseHistoryEditModalComponent>;
  const nurseMock = {
    patchAdministrationHistory: jasmine.createSpy('patchAdministrationHistory').and.returnValue(of({})),
    patchPatientSchedule: jasmine.createSpy('patchPatientSchedule').and.returnValue(of({})),
  };
  const toastMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  function setupRecord(record: NurseHistoryEditRecord): void {
    fixture.componentRef.setInput('patientId', 7);
    fixture.componentRef.setInput('record', record);
    fixture.detectChanges();
    nurseMock.patchAdministrationHistory.calls.reset();
    nurseMock.patchPatientSchedule.calls.reset();
    nurseMock.patchAdministrationHistory.and.returnValue(of({}));
    nurseMock.patchPatientSchedule.and.returnValue(of({}));
    toastMock.success.calls.reset();
    toastMock.error.calls.reset();
  }

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseHistoryEditModalComponent],
      providers: [
        { provide: NurseService, useValue: nurseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseHistoryEditModalComponent);
  });

  it('ngOnChanges copia campos desde record con historyId', () => {
    setupRecord({
      description: 'Curación',
      notes: 'Nota A',
      reasonNotAdministered: 'Paciente ausente',
      historyId: 10,
      status: 'not_administered',
    });
    expect(fixture.componentInstance.description).toBe('Curación');
    expect(fixture.componentInstance.notes).toBe('Nota A');
    expect(fixture.componentInstance.reason).toBe('Paciente ausente');
    expect(fixture.componentInstance.status).toBe('not_administered');
  });

  it('showsStatusSelect es false si source es postpone', () => {
    setupRecord({
      description: 'x',
      scheduleId: 5,
      source: 'postpone',
    });
    expect(fixture.componentInstance.showsStatusSelect()).toBeFalse();
  });

  it('showsStatusSelect es true con scheduleId y sin postpone', () => {
    setupRecord({
      description: 'x',
      scheduleId: 5,
      status: 'missed',
      source: 'schedule',
    });
    expect(fixture.componentInstance.showsStatusSelect()).toBeTrue();
  });

  it('save con historyId llama patchAdministrationHistory y emite saved', () => {
    setupRecord({
      description: 'D',
      notes: 'N',
      historyId: 99,
      status: 'administered',
    });
    let saved = false;
    const sub = fixture.componentInstance.saved.subscribe(() => {
      saved = true;
    });
    fixture.componentInstance.description = 'Nueva';
    fixture.componentInstance.save();
    expect(nurseMock.patchAdministrationHistory).toHaveBeenCalledWith(7, 99, jasmine.any(Object));
    expect(toastMock.success).toHaveBeenCalledWith('Historial actualizado');
    expect(saved).toBeTrue();
    sub.unsubscribe();
  });

  it('save con scheduleId llama patchPatientSchedule', () => {
    setupRecord({
      description: 'Trat',
      notes: 'Nn',
      scheduleId: 12,
      status: 'missed',
      source: 'schedule',
    });
    fixture.componentInstance.status = 'missed';
    fixture.componentInstance.save();
    expect(nurseMock.patchPatientSchedule).toHaveBeenCalledWith(7, 12, jasmine.objectContaining({
      description: 'Trat',
      notes: 'Nn',
      status: 'missed',
    }));
    expect(toastMock.success).toHaveBeenCalledWith('Registro actualizado');
  });

  it('save muestra error si patchAdministrationHistory falla', () => {
    setupRecord({ description: 'd', historyId: 1, status: 'administered' });
    nurseMock.patchAdministrationHistory.and.returnValue(throwError(() => ({ status: 500 })));
    fixture.componentInstance.save();
    expect(toastMock.error).toHaveBeenCalledWith('Error al guardar el historial');
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    setupRecord({ description: 'd', historyId: 1, status: 'administered' });
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.nurse-history-edit-backdrop') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });
});
