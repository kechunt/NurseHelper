import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NurseScheduleEditModalComponent } from './nurse-schedule-edit-modal.component';
import { NurseDashboardPatientRecordPatchFacade } from '../facades/nurse-dashboard-patient-record-patch.facade';
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

describe('NurseScheduleEditModalComponent', () => {
  let fixture: ComponentFixture<NurseScheduleEditModalComponent>;
  const nurseMock = {
    patchPatientSchedule: jasmine.createSpy('patchPatientSchedule').and.returnValue(of({ ok: true })),
  };
  const toastMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseScheduleEditModalComponent],
      providers: [
        NurseDashboardPatientRecordPatchFacade,
        { provide: NurseService, useValue: nurseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseScheduleEditModalComponent);
    fixture.componentRef.setInput('patientId', 5);
    fixture.componentRef.setInput('edit', {
      scheduleId: 99,
      description: 'Curación inicial',
      notes: 'Nota previa',
    });
    fixture.detectChanges();
    nurseMock.patchPatientSchedule.calls.reset();
    nurseMock.patchPatientSchedule.and.returnValue(of({ ok: true }));
    toastMock.success.calls.reset();
    toastMock.error.calls.reset();
  });

  it('plantilla: título y placeholders en descripción y notas', () => {
    const h3 = (fixture.nativeElement.querySelector('h3')?.textContent || '').toLowerCase();
    expect(h3).toContain('tratamiento');
    const d = fixture.nativeElement.querySelector('#schedule-edit-desc') as HTMLTextAreaElement;
    const n = fixture.nativeElement.querySelector('#schedule-edit-notes') as HTMLTextAreaElement;
    expect((d?.getAttribute('placeholder') || '').length).toBeGreaterThan(5);
    expect((n?.getAttribute('placeholder') || '').length).toBeGreaterThan(5);
    const saveBtn = fixture.nativeElement.querySelector('#nurse-schedule-edit-save-btn') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-schedule-edit-header-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-schedule-edit-cancel-btn')).toBeTruthy();
  });

  it('emite dismissed al pulsar Cancelar', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    (fixture.nativeElement.querySelector('#nurse-schedule-edit-cancel-btn') as HTMLButtonElement).click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('ngOnChanges copia descripción y notas desde edit', () => {
    expect(fixture.componentInstance.description).toBe('Curación inicial');
    expect(fixture.componentInstance.notes).toBe('Nota previa');
  });

  it('save delega patchPatientSchedule vía facade y emite saved en éxito', () => {
    let saved = false;
    const sub = fixture.componentInstance.saved.subscribe(() => {
      saved = true;
    });
    fixture.componentInstance.description = 'Nueva desc';
    fixture.componentInstance.notes = 'Nueva nota';
    fixture.componentInstance.save();
    expect(nurseMock.patchPatientSchedule).toHaveBeenCalledWith(5, 99, {
      description: 'Nueva desc',
      notes: 'Nueva nota',
    });
    expect(toastMock.success).toHaveBeenCalled();
    expect(saved).toBeTrue();
    sub.unsubscribe();
  });

  it('save muestra error si el servicio falla', () => {
    nurseMock.patchPatientSchedule.and.returnValue(throwError(() => ({ status: 500 })));
    fixture.componentInstance.save();
    expect(toastMock.error).toHaveBeenCalledWith('Error al guardar');
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.nurse-schedule-edit-backdrop') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });
});
