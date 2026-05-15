import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NurseAddTreatmentModalComponent } from './nurse-add-treatment-modal.component';
import { NurseDashboardPatientCareCreateFacade } from '../facades/nurse-dashboard-patient-care-create.facade';
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

describe('NurseAddTreatmentModalComponent', () => {
  let fixture: ComponentFixture<NurseAddTreatmentModalComponent>;
  const nurseServiceMock = {
    addTreatment: jasmine.createSpy('addTreatment').and.returnValue(of({ count: 1 })),
  };
  const toastMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseAddTreatmentModalComponent],
      providers: [
        NurseDashboardPatientCareCreateFacade,
        { provide: NurseService, useValue: nurseServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseAddTreatmentModalComponent);
    fixture.componentRef.setInput('patients', [{ id: '1', name: 'Ana', bedNumber: '101' }]);
    fixture.detectChanges();
  });

  afterEach(() => {
    nurseServiceMock.addTreatment.and.returnValue(of({ count: 1 }));

    fixture.componentRef.setInput('mode', 'global');
    fixture.componentRef.setInput('fromPatientContext', null);
    fixture.componentRef.setInput('initialPatientId', '');
    fixture.componentInstance.ngOnInit();
  });

  it('plantilla: opción Meses en unidad de duración (recurrente)', () => {
    const unitSelect = fixture.nativeElement.querySelector('select[name="durationUnit"]') as HTMLSelectElement;
    expect(unitSelect).toBeTruthy();
    expect(Array.from(unitSelect.options).map((o) => o.textContent || '').join(' ')).toContain('Mes');
  });

  it('plantilla: botón enviar alta tratamiento con id', () => {
    const btn = fixture.nativeElement.querySelector('#nurse-add-treatment-submit-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('#nurse-add-treatment-header-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-add-treatment-cancel-btn')).toBeTruthy();
  });

  it('emite dismissed al pulsar Cancelar', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    (fixture.nativeElement.querySelector('#nurse-add-treatment-cancel-btn') as HTMLButtonElement).click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('en modo fromPatient inicializa paciente y tipo recurrente', () => {
    fixture.componentRef.setInput('mode', 'fromPatient');
    fixture.componentRef.setInput('fromPatientContext', { id: '1', name: 'Ana', bedNumber: '101' });
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.newTreatment.patientId).toBe('1');
    expect(fixture.componentInstance.newTreatment.scheduleType).toBe('recurring');
  });

  it('toggleTreatmentDay agrega y ordena días', () => {
    fixture.componentInstance.newTreatment.daysOfWeek = [];
    fixture.componentInstance.toggleTreatmentDay('friday');
    fixture.componentInstance.toggleTreatmentDay('monday');
    expect(fixture.componentInstance.newTreatment.daysOfWeek).toEqual([1, 5]);
  });

  it('confirmAdd valida en modo global campos obligatorios', () => {
    nurseServiceMock.addTreatment.calls.reset();
    fixture.componentInstance.newTreatment.patientId = '';
    fixture.componentInstance.newTreatment.description = '';
    fixture.componentInstance.confirmAdd();
    expect(toastMock.warning).toHaveBeenCalled();
    expect(nurseServiceMock.addTreatment).not.toHaveBeenCalled();
  });

  it('confirmAdd usa addTreatment en modo fromPatient', () => {
    let savedPayload: { patientId: number } | undefined;
    const sub = fixture.componentInstance.saved.subscribe((v) => {
      savedPayload = v;
    });
    fixture.componentRef.setInput('mode', 'fromPatient');
    fixture.componentRef.setInput('fromPatientContext', { id: '1', name: 'Ana', bedNumber: '101' });
    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.newTreatment.description = 'Control glucosa';
    fixture.componentInstance.newTreatment.scheduleType = 'recurring';
    fixture.componentInstance.newTreatment.daysOfWeek = [1, 3, 5];
    fixture.componentInstance.newTreatment.times = ['09:00'];
    fixture.componentInstance.confirmAdd();
    expect(nurseServiceMock.addTreatment).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
    expect(savedPayload).toEqual({ patientId: 1 });
    sub.unsubscribe();
  });

  it('confirmAdd usa addTreatment en modo global', () => {
    let savedPayload: { patientId: number } | undefined;
    const sub = fixture.componentInstance.saved.subscribe((v) => {
      savedPayload = v;
    });
    fixture.componentInstance.newTreatment.patientId = '1';
    fixture.componentInstance.newTreatment.description = 'Curación';
    fixture.componentInstance.newTreatment.scheduleType = 'recurring';
    fixture.componentInstance.newTreatment.daysOfWeek = [1];
    fixture.componentInstance.newTreatment.times = ['08:00'];
    fixture.componentInstance.confirmAdd();
    expect(nurseServiceMock.addTreatment).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
    expect(savedPayload).toEqual({ patientId: 1 });
    sub.unsubscribe();
  });

  it('confirmAdd muestra error al fallar addTreatment', () => {
    nurseServiceMock.addTreatment.and.returnValue(
      throwError(() => ({ error: { message: 'fallo tratamiento' } }))
    );
    fixture.componentInstance.newTreatment.patientId = '1';
    fixture.componentInstance.newTreatment.description = 'Curación';
    fixture.componentInstance.newTreatment.scheduleType = 'recurring';
    fixture.componentInstance.newTreatment.daysOfWeek = [1];
    fixture.componentInstance.newTreatment.times = ['08:00'];
    fixture.componentInstance.confirmAdd();
    expect(toastMock.error).toHaveBeenCalled();
    expect(fixture.componentInstance.isAdding).toBeFalse();
  });
});
