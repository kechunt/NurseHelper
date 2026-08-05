import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';
import { NurseHandoverModalComponent } from './nurse-handover-modal.component';

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

describe('NurseHandoverModalComponent', () => {
  let fixture: ComponentFixture<NurseHandoverModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseHandoverModalComponent],
      providers: [
        {
          provide: NurseService,
          useValue: {
            getCoordinationNote: jasmine
              .createSpy('getCoordinationNote')
              .and.returnValue(of({ note: null })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseHandoverModalComponent);
    fixture.componentRef.setInput('handoverDate', '2030-01-15');
    fixture.componentRef.setInput('handoverShift', 'morning');
    fixture.componentRef.setInput('handoverBody', 'texto');
    fixture.detectChanges();
  });

  it('emite dismissed al pulsar backdrop', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement;
    backdrop.click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalled();
  });

  it('emite handoverDateChange y handoverDateCommitted al cambiar fecha', () => {
    spyOn(fixture.componentInstance.handoverDateChange, 'emit');
    spyOn(fixture.componentInstance.handoverDateCommitted, 'emit');
    const dateEl = fixture.debugElement.query(By.css('#handover-date'));
    dateEl.triggerEventHandler('ngModelChange', '2030-02-01');
    expect(fixture.componentInstance.handoverDateChange.emit).toHaveBeenCalledWith('2030-02-01');
    expect(fixture.componentInstance.handoverDateCommitted.emit).toHaveBeenCalled();
  });

  it('emite saveRequested al guardar', () => {
    spyOn(fixture.componentInstance.saveRequested, 'emit');
    const saveBtn = fixture.nativeElement.querySelector('#handover-save-btn') as HTMLButtonElement;
    saveBtn.click();
    expect(fixture.componentInstance.saveRequested.emit).toHaveBeenCalled();
  });

  it('emite dismissed al cerrar cabecera, cancelar o backdrop', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    (fixture.nativeElement.querySelector('#nurse-handover-modal-close-btn') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('#nurse-handover-cancel-btn') as HTMLButtonElement).click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });

  it('emite acknowledgeRequested al pulsar Aceptar cuando handoverCanAcknowledge', () => {
    fixture.componentRef.setInput('handoverCanAcknowledge', true);
    fixture.detectChanges();
    spyOn(fixture.componentInstance.acknowledgeRequested, 'emit');
    const ack = fixture.nativeElement.querySelector('#nurse-handover-acknowledge-btn') as HTMLButtonElement;
    expect(ack).toBeTruthy();
    ack.click();
    expect(fixture.componentInstance.acknowledgeRequested.emit).toHaveBeenCalled();
  });

  it('intro y opciones de turno muestran textos localizables', () => {
    const intros = Array.from(fixture.nativeElement.querySelectorAll('.handover-modal-intro')) as HTMLElement[];
    const joined = intros.map((p) => p.textContent || '').join(' ');
    expect(joined.toLowerCase()).toContain('turno');
    const select = fixture.nativeElement.querySelector('#handover-shift') as HTMLSelectElement;
    const opts = Array.from(select.options).map((o) => o.textContent || '');
    expect(opts.some((t) => t.toLowerCase().includes('mañana') || t.toLowerCase().includes('manana'))).toBeTrue();
  });

  it('expone patrón de diálogo accesible (role=dialog, título etiquetado)', () => {
    const panel = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    const labelledBy = panel?.getAttribute('aria-labelledby');
    expect(labelledBy).toBe('nurse-handover-dialog-title');
    const title = fixture.nativeElement.querySelector(`#${labelledBy}`);
    expect(title?.textContent).toContain('Nota de entrega');
  });
});
