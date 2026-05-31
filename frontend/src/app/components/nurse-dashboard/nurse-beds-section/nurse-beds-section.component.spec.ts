import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { BedDisplay } from '../nurse-dashboard.types';
import { NurseBedsSectionComponent } from './nurse-beds-section.component';

import { ensureLocalizeShim } from '../../../testing/localize-shim';

describe('NurseBedsSectionComponent', () => {
  let fixture: ComponentFixture<NurseBedsSectionComponent>;

  const occupiedBed: BedDisplay = {
    id: 1,
    bedNumber: '12A',
    patient: {
      id: '9',
      name: 'Luis',
      age: 55,
      clinicalNotes: {
        diagnosis: [
          {
            id: 1,
            body: 'Hipertensión',
            authorName: 'Dr. Ana',
            createdAt: '2026-01-01T10:00:00.000Z',
            legacy: false,
          },
        ],
        medical: [],
        allergies: [],
        specialNeeds: [],
        general: [],
      },
    },
  };

  const freeBed: BedDisplay = {
    id: 2,
    bedNumber: '12B',
    patient: null,
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseBedsSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseBedsSectionComponent);
    fixture.componentRef.setInput('assignedArea', 'UCI');
    fixture.componentRef.setInput('myBeds', [occupiedBed, freeBed]);
    fixture.detectChanges();
  });

  it('expone títulos localizables en tarjeta de cama y botón detalles', () => {
    const card = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-0') as HTMLElement;
    expect(card?.getAttribute('title')).toContain('cama');
    const btn = fixture.nativeElement.querySelector('#nurse-beds-section-view-patient-0') as HTMLButtonElement;
    expect(btn.getAttribute('title')).toContain('detalles');
  });

  it('plantilla: ids por índice en tarjetas y Ver paciente', () => {
    expect(fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-0')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-1')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-beds-section-view-patient-0')).toBeTruthy();
  });

  it('cabecera de sección y subtítulo con área localizables', () => {
    const h2 = fixture.nativeElement.querySelector('#nurse-beds-section-title') as HTMLElement;
    expect(h2?.textContent?.toLowerCase()).toContain('cama');
    const sub = fixture.nativeElement.querySelector('.beds-section-header .section-subtitle') as HTMLElement;
    expect(sub?.textContent).toContain('UCI');
    expect(sub?.textContent).toMatch(/2/);
  });

  it('estado ocupada y bloques clínicos compactos muestran etiquetas localizables', () => {
    const occupied = fixture.nativeElement.querySelector('.nurse-bed-card--occupied .apm-status-pill') as HTMLElement;
    expect(occupied?.textContent?.toLowerCase()).toContain('ocup');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.ncnsb__block-label')) as HTMLElement[];
    const joined = labels.map((el) => el.textContent || '').join(' ');
    expect(joined.toLowerCase()).toContain('diagn');
    expect(joined.toLowerCase()).toContain('obs');
  });

  it('cama libre muestra mensaje de disponible localizable', () => {
    const free = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-1') as HTMLElement;
    expect(free?.textContent?.toLowerCase()).toContain('disponible');
  });

  it('emite bedEditRequest al pulsar la tarjeta de cama (zona no interactiva)', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    const card = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-0') as HTMLElement;
    const header = card.querySelector('.apm-area-card__header') as HTMLElement;
    expect(header).toBeTruthy();
    header.click();
    expect(fixture.componentInstance.bedEditRequest.emit).toHaveBeenCalledWith(occupiedBed);
  });

  it('emite viewPatientRequest al pulsar Ver detalles sin propagar edición de cama', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    spyOn(fixture.componentInstance.viewPatientRequest, 'emit');
    const btn = fixture.nativeElement.querySelector('#nurse-beds-section-view-patient-0') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.viewPatientRequest.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: '9', name: 'Luis' })
    );
    expect(fixture.componentInstance.bedEditRequest.emit).not.toHaveBeenCalled();
  });

  it('emite bedEditRequest en cama libre', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    const card = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-1') as HTMLElement;
    card.click();
    expect(fixture.componentInstance.bedEditRequest.emit).toHaveBeenCalledWith(freeBed);
  });

  it('emite openClinicalNotesRequest al pulsar Ver y gestionar', () => {
    spyOn(fixture.componentInstance.openClinicalNotesRequest, 'emit');
    const btn = fixture.nativeElement.querySelector('.ncnsb__expand-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(fixture.componentInstance.openClinicalNotesRequest.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ scope: 'diagnosis', patient: jasmine.objectContaining({ id: '9' }) })
    );
  });
});
