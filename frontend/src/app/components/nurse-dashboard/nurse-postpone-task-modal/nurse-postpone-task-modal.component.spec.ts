import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NursePostponeTaskModalComponent } from './nurse-postpone-task-modal.component';
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

describe('NursePostponeTaskModalComponent', () => {
  let fixture: ComponentFixture<NursePostponeTaskModalComponent>;
  const toastMock = { warning: jasmine.createSpy('warning') };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePostponeTaskModalComponent],
      providers: [{ provide: ToastService, useValue: toastMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePostponeTaskModalComponent);
    fixture.componentRef.setInput('task', {
      id: 1,
      time: '08:30:00',
      patientName: 'Ana',
      description: 'Control',
    });
    fixture.detectChanges();
  });

  it('inicializa hora recortada al recibir task', () => {
    expect(fixture.componentInstance.postponeNewTime).toBe('08:30');
  });

  it('emite dismissed al cerrar por backdrop', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-postpone-task-backdrop'
    ) as HTMLElement;
    backdrop.click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalled();
  });

  it('valida fecha futura antes de confirmar', () => {
    spyOn(fixture.componentInstance.confirmed, 'emit');
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    fixture.componentInstance.postponeNewDate = `${y}-${mo}-${da}`;
    fixture.componentInstance.postponeNewTime = '00:00';
    fixture.componentInstance.onConfirm();
    expect(toastMock.warning).toHaveBeenCalled();
    expect(fixture.componentInstance.confirmed.emit).not.toHaveBeenCalled();
  });
});
