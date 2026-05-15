import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseTreatmentPostponeModalComponent } from './nurse-treatment-postpone-modal.component';
import { ToastService } from '../../../services/toast.service';

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

describe('NurseTreatmentPostponeModalComponent', () => {
  let fixture: ComponentFixture<NurseTreatmentPostponeModalComponent>;
  const toastMock = { warning: jasmine.createSpy('warning') };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseTreatmentPostponeModalComponent],
      providers: [{ provide: ToastService, useValue: toastMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseTreatmentPostponeModalComponent);
    fixture.componentRef.setInput('item', {
      scheduleId: 10,
      description: 'Curación',
      time: '09:00',
      scheduledTime: '2030-03-10T15:30:00.000Z',
    });
    fixture.detectChanges();
    toastMock.warning.calls.reset();
  });

  it('inicializa fecha y hora desde scheduledTime en ngOnChanges', () => {
    expect(fixture.componentInstance.newDate).toBe('2030-03-10');
    expect(fixture.componentInstance.newTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('canSubmit es false si falta fecha u hora', () => {
    fixture.componentInstance.newDate = '';
    fixture.componentInstance.newTime = '12:00';
    expect(fixture.componentInstance.canSubmit).toBeFalse();
    fixture.componentInstance.newDate = '2030-01-01';
    fixture.componentInstance.newTime = '';
    expect(fixture.componentInstance.canSubmit).toBeFalse();
  });

  it('plantilla: título, pista fecha/hora y botón Guardar con id estable', () => {
    const h3 = (fixture.nativeElement.querySelector('h3')?.textContent || '').toLowerCase();
    expect(h3).toContain('tratamiento');
    const hint = fixture.nativeElement.querySelector('.hint-text');
    expect((hint?.textContent || '').trim().length).toBeGreaterThan(10);
    const save = fixture.nativeElement.querySelector('#nurse-treatment-postpone-save-btn') as HTMLButtonElement;
    expect(save).toBeTruthy();
    expect(save.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('#nurse-treatment-postpone-cancel-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-treatment-postpone-header-close-btn')).toBeTruthy();
  });

  it('emite dismissed al hacer clic en backdrop', () => {
    let n = 0;
    const sub = fixture.componentInstance.dismissed.subscribe(() => n++);
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-treatment-postpone-backdrop'
    ) as HTMLElement;
    backdrop.click();
    expect(n).toBe(1);
    sub.unsubscribe();
  });

  it('onConfirm avisa si falta fecha u hora', () => {
    let emitted = false;
    const sub = fixture.componentInstance.confirmed.subscribe(() => {
      emitted = true;
    });
    fixture.componentInstance.newDate = '';
    fixture.componentInstance.newTime = '';
    fixture.componentInstance.onConfirm();
    expect(toastMock.warning).toHaveBeenCalledWith('Indique fecha y hora');
    expect(emitted).toBeFalse();
    sub.unsubscribe();
  });

  it('onConfirm emite fecha y hora', () => {
    let payload: { date: string; time: string } | undefined;
    const sub = fixture.componentInstance.confirmed.subscribe((p) => {
      payload = p;
    });
    fixture.componentInstance.newDate = '2031-02-02';
    fixture.componentInstance.newTime = '16:45';
    fixture.componentInstance.onConfirm();
    expect(payload).toEqual({ date: '2031-02-02', time: '16:45' });
    sub.unsubscribe();
  });
});
