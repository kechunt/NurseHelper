import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MedicationForPharmacy, TaskItem } from '../../../services/nurse.service';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import { NurseDashboardOverlaysStackComponent } from './nurse-dashboard-overlays-stack.component';
import { nurseDashboardOverlaysStackVmForTesting } from './nurse-dashboard-overlays-stack.vm';

describe('NurseDashboardOverlaysStackComponent', () => {
  let fixture: ComponentFixture<NurseDashboardOverlaysStackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NurseDashboardOverlaysStackComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseDashboardOverlaysStackComponent);
    fixture.componentRef.setInput('vm', nurseDashboardOverlaysStackVmForTesting());
    fixture.detectChanges();
  });

  it('crea el componente con entradas obligatorias', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('no falla resetObservationEditState sin modal de paciente', () => {
    expect(() => fixture.componentInstance.resetObservationEditState()).not.toThrow();
  });

  it('propaga handoverDismissed desde el modal de entrega de turno', () => {
    spyOn(fixture.componentInstance.handoverDismissed, 'emit');
    fixture.componentRef.setInput(
      'vm',
      nurseDashboardOverlaysStackVmForTesting({
        showHandoverModal: true,
        handoverDate: '2030-01-10',
        handoverBody: 'nota',
      })
    );
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector(
      'app-nurse-handover-modal .nurse-modal-backdrop-dim'
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();
    backdrop.click();
    expect(fixture.componentInstance.handoverDismissed.emit).toHaveBeenCalled();
  });

  it('propaga pharmacyPatientsDismissed desde el modal de pacientes por medicamento', () => {
    spyOn(fixture.componentInstance.pharmacyPatientsDismissed, 'emit');
    const med: MedicationForPharmacy = {
      name: 'MedX',
      dosage: '5mg',
      totalDoses: 1,
      patientsCount: 0,
      patients: [],
      requested: false,
    };
    fixture.componentRef.setInput(
      'vm',
      nurseDashboardOverlaysStackVmForTesting({ pharmacyPatientsModalMed: med })
    );
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector(
      'app-nurse-pharmacy-patients-modal .nurse-pharmacy-patients-backdrop'
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();
    backdrop.click();
    expect(fixture.componentInstance.pharmacyPatientsDismissed.emit).toHaveBeenCalled();
  });

  it('propaga pendingTaskDetailCompleteRequested desde el modal de detalle de tarea', () => {
    spyOn(fixture.componentInstance.pendingTaskDetailCompleteRequested, 'emit');
    const task: TaskItem = {
      id: 1,
      time: '09:00',
      hour: '09',
      type: 'check',
      description: 'Chequeo',
      patientName: 'Ana',
      bedNumber: '1',
      medication: null,
      dosage: null,
      completed: false,
      status: 'pending',
    };
    fixture.componentRef.setInput(
      'vm',
      nurseDashboardOverlaysStackVmForTesting({
        pendingTaskDetailModalOpen: true,
        pendingTaskDetail: task,
      })
    );
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      'app-nurse-pending-task-detail-modal .nurse-pending-task-detail-action--complete'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(fixture.componentInstance.pendingTaskDetailCompleteRequested.emit).toHaveBeenCalledWith(task);
  });

  it('propaga pendingTaskDetailDismissed desde el modal de detalle de tarea', () => {
    spyOn(fixture.componentInstance.pendingTaskDetailDismissed, 'emit');
    const task: TaskItem = {
      id: 1,
      time: '09:00',
      hour: '09',
      type: 'check',
      description: 'Chequeo',
      patientName: 'Ana',
      bedNumber: '1',
      medication: null,
      dosage: null,
      completed: false,
      status: 'pending',
    };
    fixture.componentRef.setInput(
      'vm',
      nurseDashboardOverlaysStackVmForTesting({
        pendingTaskDetailModalOpen: true,
        pendingTaskDetail: task,
      })
    );
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector(
      'app-nurse-pending-task-detail-modal button.close-btn'
    ) as HTMLButtonElement;
    expect(close).toBeTruthy();
    close.click();
    expect(fixture.componentInstance.pendingTaskDetailDismissed.emit).toHaveBeenCalled();
  });

  it('propaga historyDetailDismissed desde el modal de detalle de historial', () => {
    spyOn(fixture.componentInstance.historyDetailDismissed, 'emit');
    const record: TreatmentRecord = {
      date: '2030-01-01',
      time: '10:00',
      type: 'medication',
      nurseName: 'N',
      description: 'Dosis',
      status: 'administered',
    };
    fixture.componentRef.setInput(
      'vm',
      nurseDashboardOverlaysStackVmForTesting({ historyDetailRecord: record })
    );
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector(
      'app-nurse-history-detail-modal .nurse-history-detail-backdrop'
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();
    backdrop.click();
    expect(fixture.componentInstance.historyDetailDismissed.emit).toHaveBeenCalled();
  });

  it('con Escape cierra el overlay de mayor prioridad (handover)', () => {
    spyOn(fixture.componentInstance.handoverDismissed, 'emit');
    fixture.componentRef.setInput(
      'vm',
      nurseDashboardOverlaysStackVmForTesting({
        showHandoverModal: true,
        showPatientModal: true,
        selectedPatient: {
          id: '1',
          name: 'Paciente Uno',
          bedNumber: 'A-1',
          age: 70,
          diagnosis: '',
          medications: [],
          treatmentHistory: [],
          pendingTasks: 0,
          priority: 'normal',
          medicalObservations: '',
          allergies: '',
          specialNeeds: '',
          generalObservations: '',
        },
      })
    );
    fixture.detectChanges();

    const ev = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(ev, 'preventDefault');
    spyOn(ev, 'stopPropagation');
    fixture.componentInstance.onEscapeKey(ev);

    expect(fixture.componentInstance.handoverDismissed.emit).toHaveBeenCalled();
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(ev.stopPropagation).toHaveBeenCalled();
  });

  it('con Escape no emite nada si no hay overlays abiertos', () => {
    spyOn(fixture.componentInstance.handoverDismissed, 'emit');
    const ev = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(ev, 'preventDefault');
    spyOn(ev, 'stopPropagation');

    fixture.componentInstance.onEscapeKey(ev);

    expect(fixture.componentInstance.handoverDismissed.emit).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(ev.stopPropagation).not.toHaveBeenCalled();
  });
});
