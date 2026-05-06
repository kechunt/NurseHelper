import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MedicationForPharmacy } from '../../../services/nurse.service';
import { NursePharmacySectionComponent } from './nurse-pharmacy-section.component';

describe('NursePharmacySectionComponent', () => {
  let fixture: ComponentFixture<NursePharmacySectionComponent>;

  const meds: MedicationForPharmacy[] = [
    {
      name: 'Med A',
      dosage: '10mg',
      totalDoses: 2,
      patientsCount: 1,
      patients: [{ patientName: 'P', patientId: 1, bedNumber: '1', areaName: 'A' }],
      requested: false,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NursePharmacySectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePharmacySectionComponent);
    fixture.componentRef.setInput('medicationsForPharmacy', meds);
    fixture.componentRef.setInput('uniqueMedicationsCount', 1);
    fixture.componentRef.setInput('totalDosesToday', 2);
    fixture.detectChanges();
  });

  it('emite sendRequest al pulsar enviar', () => {
    spyOn(fixture.componentInstance.sendRequest, 'emit');
    const btn = fixture.nativeElement.querySelector('.pharmacy-footer button') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.sendRequest.emit).toHaveBeenCalled();
  });

  it('emite viewPatients al pulsar Ver pacientes', () => {
    spyOn(fixture.componentInstance.viewPatients, 'emit');
    const btn = fixture.nativeElement.querySelector('.pharmacy-view-patients-btn') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.viewPatients.emit).toHaveBeenCalledWith(meds[0]);
  });

  it('requestedCount refleja selección', () => {
    expect(fixture.componentInstance.requestedCount).toBe(0);
    meds[0].requested = true;
    fixture.detectChanges();
    expect(fixture.componentInstance.requestedCount).toBe(1);
  });

  it('toggleAllMedications marca todos vía cabecera', () => {
    const cb = fixture.nativeElement.querySelector('thead input[type="checkbox"]') as HTMLInputElement;
    expect(cb).toBeTruthy();
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(meds.every((m) => m.requested)).toBe(true);
  });
});
