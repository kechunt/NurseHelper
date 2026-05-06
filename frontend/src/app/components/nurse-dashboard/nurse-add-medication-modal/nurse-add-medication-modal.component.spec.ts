import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NurseAddMedicationModalComponent } from './nurse-add-medication-modal.component';
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
