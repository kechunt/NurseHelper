import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseSummarySectionComponent } from './nurse-summary-section.component';

describe('NurseSummarySectionComponent', () => {
  let fixture: ComponentFixture<NurseSummarySectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NurseSummarySectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseSummarySectionComponent);
    fixture.componentRef.setInput('assignedArea', 'UCI');
    fixture.componentRef.setInput('assignedPatientsCount', 3);
    fixture.componentRef.setInput('maxPatients', 8);
    fixture.componentRef.setInput('pendingTasksCount', 5);
    fixture.componentRef.setInput('medicationsToday', 2);
    fixture.componentRef.setInput('attentionPharmacyNotRequestedCount', 1);
    fixture.componentRef.setInput('attentionTasksNextHourCount', 4);
    fixture.detectChanges();
  });

  it('emite areaSummaryClick al pulsar tarjeta de área', () => {
    spyOn(fixture.componentInstance.areaSummaryClick, 'emit');
    const first = fixture.nativeElement.querySelector(
      '.overview-container > .stats-grid .stat-card.clickable'
    ) as HTMLElement;
    first.click();
    expect(fixture.componentInstance.areaSummaryClick.emit).toHaveBeenCalled();
  });

  it('emite openHandoverClick desde la fila de acciones', () => {
    spyOn(fixture.componentInstance.openHandoverClick, 'emit');
    const actions = fixture.nativeElement.querySelectorAll('.nurse-summary-unified-stats-grid .nurse-attention-tile');
    expect(actions.length).toBe(4);
    (actions[2] as HTMLButtonElement).click();
    expect(fixture.componentInstance.openHandoverClick.emit).toHaveBeenCalled();
  });
});
