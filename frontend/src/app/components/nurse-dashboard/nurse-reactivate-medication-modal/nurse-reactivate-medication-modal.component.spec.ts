import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseReactivateMedicationModalComponent } from './nurse-reactivate-medication-modal.component';

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

describe('NurseReactivateMedicationModalComponent', () => {
  let fixture: ComponentFixture<NurseReactivateMedicationModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseReactivateMedicationModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseReactivateMedicationModalComponent);
    fixture.componentRef.setInput('medication', { name: 'Metformina', dosage: '850mg' });
    fixture.detectChanges();
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let dismissed = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-reactivate-medication-backdrop'
    ) as HTMLElement;
    backdrop.click();
    expect(dismissed).toBe(1);
    sub.unsubscribe();
  });

  it('emite dismissed al cancelar', () => {
    let dismissed = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    fixture.componentInstance.onCancel();
    expect(dismissed).toBe(1);
    sub.unsubscribe();
  });

  it('onConfirm emite confirmed', () => {
    let confirmed = 0;
    const sub = fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.onConfirm();
    expect(confirmed).toBe(1);
    sub.unsubscribe();
  });
});
