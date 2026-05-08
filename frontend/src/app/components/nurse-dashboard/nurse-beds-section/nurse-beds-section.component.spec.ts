import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { BedDisplay } from '../nurse-dashboard.types';
import { NurseBedsSectionComponent } from './nurse-beds-section.component';

describe('NurseBedsSectionComponent', () => {
  let fixture: ComponentFixture<NurseBedsSectionComponent>;

  const occupiedBed: BedDisplay = {
    id: 1,
    bedNumber: '12A',
    patient: { id: '9', name: 'Luis', age: 55, conditions: ['HTA'] },
  };

  const freeBed: BedDisplay = {
    id: 2,
    bedNumber: '12B',
    patient: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NurseBedsSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseBedsSectionComponent);
    fixture.componentRef.setInput('assignedArea', 'UCI');
    fixture.componentRef.setInput('myBeds', [occupiedBed, freeBed]);
    fixture.detectChanges();
  });

  it('emite bedEditRequest al pulsar la tarjeta de cama', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    const cards = fixture.nativeElement.querySelectorAll('.bed-card.clickable-bed');
    expect(cards.length).toBe(2);
    (cards[0] as HTMLElement).click();
    expect(fixture.componentInstance.bedEditRequest.emit).toHaveBeenCalledWith(occupiedBed);
  });

  it('emite viewPatientRequest al pulsar Ver detalles sin propagar edición de cama', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    spyOn(fixture.componentInstance.viewPatientRequest, 'emit');
    const btn = fixture.nativeElement.querySelector('.nurse-details-pill-btn') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.viewPatientRequest.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: '9', name: 'Luis' })
    );
    expect(fixture.componentInstance.bedEditRequest.emit).not.toHaveBeenCalled();
  });

  it('emite bedEditRequest en cama libre', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    const cards = fixture.nativeElement.querySelectorAll('.bed-card.clickable-bed');
    (cards[1] as HTMLElement).click();
    expect(fixture.componentInstance.bedEditRequest.emit).toHaveBeenCalledWith(freeBed);
  });
});
