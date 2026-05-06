import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import type { Patient } from '../nurse-dashboard.types';
import { NursePatientModalShellComponent } from './nurse-patient-modal-shell.component';

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

const patientStub: Patient = {
  id: '42',
  name: 'María López',
  bedNumber: '305',
  age: 65,
  diagnosis: 'Seguimiento',
  medications: [],
  pendingTasks: 0,
  priority: 'normal',
};

describe('NursePatientModalShellComponent', () => {
  let fixture: ComponentFixture<NursePatientModalShellComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePatientModalShellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePatientModalShellComponent);
    fixture.componentRef.setInput('patient', patientStub);
    fixture.componentRef.setInput('activeTab', 'medications');
    fixture.componentRef.setInput('newDiagnosisNote', '');
    fixture.componentRef.setInput('newMedicalObservationNote', '');
    fixture.componentRef.setInput('newAllergiesNote', '');
    fixture.componentRef.setInput('newSpecialNeedsNote', '');
    fixture.componentRef.setInput('newGeneralObservationNote', '');
    fixture.componentRef.setInput('isSavingObservation', false);
    fixture.componentRef.setInput('historyFilter', 'week');
    fixture.componentRef.setInput('historyOutcomeFilter', 'all');
    fixture.componentRef.setInput('medicationsSlots', []);
    fixture.componentRef.setInput('treatmentsSlots', []);
    fixture.componentRef.setInput('historyRecords', []);
    fixture.detectChanges();
  });

  it('emite closed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.closed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('emite printRequested al pulsar Imprimir', () => {
    let n = 0;
    const sub = fixture.componentInstance.printRequested.subscribe(() => n++);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    const printBtn = buttons.find((b) => b.textContent?.includes('Imprimir'));
    expect(printBtn).toBeTruthy();
    printBtn!.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('muestra CSV y Excel en el footer y emite eventos con pestaña', () => {
    fixture.componentRef.setInput('activeTab', 'history');
    fixture.detectChanges();

    const emittedCsv: any[] = [];
    const emittedXls: any[] = [];
    const subC = fixture.componentInstance.exportCsvRequested.subscribe((v) => emittedCsv.push(v));
    const subX = fixture.componentInstance.exportExcelRequested.subscribe((v) => emittedXls.push(v));

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const csvBtn = buttons.find((b) => (b.textContent || '').includes('CSV'));
    const xlsBtn = buttons.find((b) => (b.textContent || '').includes('Excel'));
    expect(csvBtn && xlsBtn).toBeTruthy();

    csvBtn!.click();
    xlsBtn!.click();
    expect(emittedCsv).toEqual([{ tab: 'history' }]);
    expect(emittedXls).toEqual([{ tab: 'history' }]);

    fixture.componentRef.setInput('activeTab', 'medications');
    fixture.detectChanges();
    csvBtn!.click();
    xlsBtn!.click();
    expect(emittedCsv[1]).toEqual({ tab: 'medications' });
    expect(emittedXls[1]).toEqual({ tab: 'medications' });

    subC.unsubscribe();
    subX.unsubscribe();
  });

  it('emite activeTabChange al cambiar de pestaña', () => {
    const tabs: string[] = [];
    const sub = fixture.componentInstance.activeTabChange.subscribe((t) => tabs.push(t));
    const navButtons = fixture.nativeElement.querySelectorAll('.patient-modal-nav .nav-link');
    expect(navButtons.length).toBe(4);
    (navButtons[1] as HTMLButtonElement).click();
    expect(tabs).toEqual(['schedule']);
    sub.unsubscribe();
  });

  it('ArrowRight emite siguiente pestaña y mueve el foco', fakeAsync(() => {
    const emitted: string[] = [];
    const sub = fixture.componentInstance.activeTabChange.subscribe((t) => emitted.push(t));
    const medsTab = fixture.nativeElement.querySelector(
      '#nurse-patient-tab-medications'
    ) as HTMLButtonElement;
    medsTab.focus();
    medsTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    tick();
    expect(emitted).toEqual(['schedule']);
    expect(document.activeElement?.id).toBe('nurse-patient-tab-schedule');
    sub.unsubscribe();
  }));

  it('Home desde la última pestaña emite medications y enfoca su botón', fakeAsync(() => {
    fixture.componentRef.setInput('activeTab', 'history');
    fixture.detectChanges();

    const emitted: string[] = [];
    const sub = fixture.componentInstance.activeTabChange.subscribe((t) => emitted.push(t));
    const historyTab = fixture.nativeElement.querySelector('#nurse-patient-tab-history') as HTMLButtonElement;
    historyTab.focus();
    historyTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    tick();
    expect(emitted).toEqual(['medications']);
    expect(document.activeElement?.id).toBe('nurse-patient-tab-medications');
    sub.unsubscribe();
  }));

  it('expone tablist ARIA y pestaña activa con aria-selected', () => {
    const tablist = fixture.nativeElement.querySelector('.patient-modal-nav') as HTMLElement;
    expect(tablist.getAttribute('role')).toBe('tablist');
    expect(tablist.getAttribute('aria-label')).toContain('ficha');

    const firstTab = fixture.nativeElement.querySelector('#nurse-patient-tab-medications') as HTMLElement;
    expect(firstTab?.getAttribute('role')).toBe('tab');
    expect(firstTab?.getAttribute('aria-selected')).toBe('true');
    expect(firstTab?.getAttribute('aria-controls')).toBe('nurse-patient-panel-medications');

    const panel = fixture.nativeElement.querySelector('#nurse-patient-panel-medications') as HTMLElement;
    expect(panel?.getAttribute('role')).toBe('tabpanel');
  });

  it('muestra el nombre del paciente en la cabecera', () => {
    expect(fixture.nativeElement.querySelector('.modal-header h3')?.textContent).toContain('María López');
  });
});
