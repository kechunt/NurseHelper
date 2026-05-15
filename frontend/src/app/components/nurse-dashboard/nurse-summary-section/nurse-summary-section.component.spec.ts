import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseSummarySectionComponent } from './nurse-summary-section.component';

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

describe('NurseSummarySectionComponent', () => {
  let fixture: ComponentFixture<NurseSummarySectionComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
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
    const card = fixture.nativeElement.querySelector('#nurse-summary-section-stat-area-card') as HTMLElement;
    expect(card).toBeTruthy();
    card.click();
    expect(fixture.componentInstance.areaSummaryClick.emit).toHaveBeenCalled();
  });

  it('emite openHandoverClick al pulsar el botón de entrega', () => {
    spyOn(fixture.componentInstance.openHandoverClick, 'emit');
    const handover = fixture.nativeElement.querySelector('#nurse-summary-section-handover-btn') as HTMLButtonElement;
    expect(handover).toBeTruthy();
    handover.click();
    expect(fixture.componentInstance.openHandoverClick.emit).toHaveBeenCalled();
  });

  it('tarjeta de nota de turno expone title localizable', () => {
    const handover = fixture.nativeElement.querySelector('#nurse-summary-section-handover-btn') as HTMLButtonElement;
    expect(handover.title.toLowerCase()).toContain('nota');
  });

  it('plantilla: ids estables en las ocho tarjetas KPI y acciones', () => {
    const root = fixture.nativeElement;
    expect(root.querySelector('#nurse-summary-section-stat-area-card')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-stat-patients-card')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-stat-pending-tasks-card')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-stat-medications-today-card')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-attention-pharmacy-btn')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-attention-tasks-next-hour-btn')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-handover-btn')).toBeTruthy();
    expect(root.querySelector('#nurse-summary-section-reports-btn')).toBeTruthy();
  });

  it('título de sección y etiquetas KPI visibles localizables', () => {
    const title = fixture.nativeElement.querySelector('#nurse-summary-section-title') as HTMLElement;
    expect(title?.textContent?.toLowerCase()).toContain('resumen');
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.stat-label')
    ) as HTMLElement[];
    expect(labels.length).toBeGreaterThanOrEqual(8);
    expect(labels.some((el) => (el.textContent || '').toLowerCase().includes('área'))).toBeTrue();
    expect(labels.some((el) => (el.textContent || '').toLowerCase().includes('paciente'))).toBeTrue();
    expect(labels.some((el) => (el.textContent || '').toLowerCase().includes('reporte'))).toBeTrue();
  });
});
