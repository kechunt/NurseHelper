import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
    }).compileComponents();

    fixture = TestBed.createComponent(NurseHandoverModalComponent);
    fixture.componentRef.setInput('handoverDate', '2030-01-15');
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
    const saveBtn = fixture.nativeElement.querySelector('.btn-primary-neuro') as HTMLButtonElement;
    saveBtn.click();
    expect(fixture.componentInstance.saveRequested.emit).toHaveBeenCalled();
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
