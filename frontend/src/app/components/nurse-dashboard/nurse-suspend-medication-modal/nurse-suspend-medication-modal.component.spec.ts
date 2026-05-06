import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseSuspendMedicationModalComponent } from './nurse-suspend-medication-modal.component';

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

describe('NurseSuspendMedicationModalComponent', () => {
  let fixture: ComponentFixture<NurseSuspendMedicationModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseSuspendMedicationModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseSuspendMedicationModalComponent);
    fixture.componentRef.setInput('medication', { name: 'Ibuprofeno', dosage: '400mg' });
    fixture.detectChanges();
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let dismissed = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-suspend-medication-backdrop'
    ) as HTMLElement;
    backdrop.click();
    expect(dismissed).toBe(1);
    sub.unsubscribe();
  });

  it('canSubmit es false si el motivo tiene menos de 10 caracteres', () => {
    fixture.componentInstance.reason = 'corto';
    expect(fixture.componentInstance.canSubmit).toBeFalse();
  });

  it('canSubmit es false en modo custom sin fecha', () => {
    fixture.componentInstance.durationType = 'custom';
    fixture.componentInstance.untilDate = '';
    fixture.componentInstance.reason = 'motivo largo suficiente';
    expect(fixture.componentInstance.canSubmit).toBeFalse();
  });

  it('canSubmit es true con motivo largo e indefinite', () => {
    fixture.componentInstance.durationType = 'indefinite';
    fixture.componentInstance.reason = 'motivo largo suficiente';
    expect(fixture.componentInstance.canSubmit).toBeTrue();
  });

  it('onConfirm no emite si canSubmit es false', () => {
    const payloads: unknown[] = [];
    const sub = fixture.componentInstance.confirmed.subscribe((p) => payloads.push(p));
    fixture.componentInstance.reason = '';
    fixture.componentInstance.onConfirm();
    expect(payloads.length).toBe(0);
    sub.unsubscribe();
  });

  it('onConfirm emite payload cuando es válido', () => {
    let payload: {
      durationType: string;
      untilDate: string;
      reason: string;
    } | undefined;
    const sub = fixture.componentInstance.confirmed.subscribe((p) => {
      payload = p;
    });
    fixture.componentInstance.durationType = '1week';
    fixture.componentInstance.reason = 'motivo largo suficiente';
    fixture.componentInstance.onConfirm();
    expect(payload).toEqual({
      durationType: '1week',
      untilDate: '',
      reason: 'motivo largo suficiente',
    });
    sub.unsubscribe();
  });

  it('ngOnChanges reinicia estado al cambiar medication', () => {
    fixture.componentInstance.durationType = 'custom';
    fixture.componentInstance.untilDate = '2030-01-01';
    fixture.componentInstance.reason = 'algún texto previo largo';
    fixture.componentRef.setInput('medication', { name: 'Paracetamol', dosage: '500mg' });
    fixture.detectChanges();
    expect(fixture.componentInstance.durationType).toBe('indefinite');
    expect(fixture.componentInstance.untilDate).toBe('');
    expect(fixture.componentInstance.reason).toBe('');
  });
});
