import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NurseAddMedicationModalComponent } from './nurse-add-medication-modal.component';
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

describe('NurseAddMedicationModalComponent', () => {
  let fixture: ComponentFixture<NurseAddMedicationModalComponent>;
  const nurseServiceMock = {
    addMedication: jasmine.createSpy('addMedication').and.returnValue(of({ schedulesCreated: 2 })),
  };
  const toastMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseAddMedicationModalComponent],
      providers: [
        NurseDashboardPatientCareCreateFacade,
        { provide: NurseService, useValue: nurseServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseAddMedicationModalComponent);
    fixture.componentRef.setInput('patients', [
      { id: '1', name: 'Ana', bedNumber: '101' },
      { id: '2', name: 'Luis', bedNumber: '102' },
    ]);
    fixture.detectChanges();
  });

  afterEach(() => {
    nurseServiceMock.addMedication.and.returnValue(of({ schedulesCreated: 2 }));
    fixture.componentRef.setInput('initialPatientId', '');
    fixture.componentInstance.ngOnInit();
  });

  it('plantilla: título modal y opción Meses en duración', () => {
    const h3 = fixture.nativeElement.querySelector('h3');
    expect(h3?.textContent).toContain('Medicamento');
    const unitSelect = fixture.nativeElement.querySelector('select[name="durationUnit"]') as HTMLSelectElement;
    expect(unitSelect?.options.length).toBeGreaterThanOrEqual(3);
    expect(Array.from(unitSelect.options).map((o) => o.textContent || '').join(' ')).toContain('Mes');
  });

  it('plantilla: botón enviar alta medicamento con id', () => {
    const btn = fixture.nativeElement.querySelector('#nurse-add-medication-submit-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('#nurse-add-medication-header-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-add-medication-cancel-btn')).toBeTruthy();
  });

  it('emite dismissed al pulsar Cancelar', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    (fixture.nativeElement.querySelector('#nurse-add-medication-cancel-btn') as HTMLButtonElement).click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('inicializa selectedPatientId desde initialPatientId', () => {
    fixture.componentRef.setInput('initialPatientId', '2');
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.selectedPatientId).toBe('2');
  });

  it('updateTimeSuggestions ajusta horarios sugeridos', () => {
    fixture.componentInstance.newMedication.frequency = 'twice';
    fixture.componentInstance.updateTimeSuggestions();
    expect(fixture.componentInstance.suggestedTimes).toBe('08:00, 20:00');
    expect(fixture.componentInstance.newMedication.times).toEqual(['08:00', '20:00']);
  });

  it('toggleDay pasa de all a selección explícita', () => {
    fixture.componentInstance.newMedication.days = 'all';
    fixture.componentInstance.toggleDay('monday');
    expect(fixture.componentInstance.newMedication.days as any).toEqual(['monday']);
    expect(fixture.componentInstance.selectedDays).toEqual(['monday']);
  });

  it('confirmAdd valida campos obligatorios', () => {
    nurseServiceMock.addMedication.calls.reset();
    fixture.componentInstance.selectedPatientId = '';
    fixture.componentInstance.confirmAdd();
    expect(toastMock.warning).toHaveBeenCalled();
    expect(nurseServiceMock.addMedication).not.toHaveBeenCalled();
  });

  it('confirmAdd guarda y emite saved en éxito', () => {
    let savedPayload: { patientId: number } | undefined;
    const sub = fixture.componentInstance.saved.subscribe((v) => {
      savedPayload = v;
    });
    fixture.componentInstance.selectedPatientId = '1';
    fixture.componentInstance.newMedication.medication = 'Paracetamol';
    fixture.componentInstance.newMedication.dosage = '500mg';
    fixture.componentInstance.newMedication.frequency = 'once';
    fixture.componentInstance.newMedication.times = ['08:00'];
    fixture.componentInstance.confirmAdd();
    expect(nurseServiceMock.addMedication).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
    expect(savedPayload).toEqual({ patientId: 1 });
    expect(fixture.componentInstance.isAdding).toBeFalse();
    sub.unsubscribe();
  });

  it('confirmAdd muestra error cuando falla el servicio', () => {
    nurseServiceMock.addMedication.and.returnValue(
      throwError(() => ({ error: { message: 'fallo backend' } }))
    );
    fixture.componentInstance.selectedPatientId = '1';
    fixture.componentInstance.newMedication.medication = 'Paracetamol';
    fixture.componentInstance.newMedication.dosage = '500mg';
    fixture.componentInstance.newMedication.times = ['08:00'];
    fixture.componentInstance.confirmAdd();
    expect(toastMock.error).toHaveBeenCalledWith('fallo backend');
    expect(fixture.componentInstance.isAdding).toBeFalse();
  });
});
