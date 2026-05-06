import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseScheduleSlotsModalComponent } from './nurse-schedule-slots-modal.component';

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

describe('NurseScheduleSlotsModalComponent', () => {
  let fixture: ComponentFixture<NurseScheduleSlotsModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseScheduleSlotsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseScheduleSlotsModalComponent);
    fixture.componentRef.setInput('kind', 'treatment');
    fixture.componentRef.setInput('title', 'Curación');
    fixture.componentRef.setInput('todaySlots', []);
    fixture.componentRef.setInput('otherSlots', []);
    fixture.componentRef.setInput('allSlots', []);
    fixture.detectChanges();
  });

  it('emite dismissed al cerrar por backdrop y botón', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    const backdrop = fixture.nativeElement.querySelector(
      '.schedule-slots-modal-backdrop'
    ) as HTMLElement;
    backdrop.click();
    const close = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    close.click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });

  it('slotStatusLabel traduce estados conocidos', () => {
    expect(fixture.componentInstance.slotStatusLabel('pending')).toBe('Pendiente');
    expect(fixture.componentInstance.slotStatusLabel('completed')).toBe('Completado');
    expect(fixture.componentInstance.slotStatusLabel('missed')).toBe('No realizado');
  });

  it('weeklyGridFromSlots agrupa horarios por día y elimina duplicados', () => {
    const monday = '2026-05-04T08:00:00.000Z';
    const grid = fixture.componentInstance.weeklyGridFromSlots([
      { scheduledTime: monday, timeLabel: '08:00' },
      { scheduledTime: monday, timeLabel: '08:00' },
    ]);
    expect(grid.length).toBe(7);
    expect(grid.some((c) => c.times.includes('08:00'))).toBeTrue();
  });
});
