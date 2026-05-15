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
    const close = fixture.nativeElement.querySelector('#nurse-schedule-slots-header-close-btn') as HTMLButtonElement;
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

  it('icono de notas en tabla de hoy tiene title localizable', () => {
    fixture.componentRef.setInput('todaySlots', [
      {
        scheduledTime: '2026-05-04T09:00:00.000Z',
        timeLabel: '09:00',
        dateLabel: '2026-05-04',
        status: 'pending',
        notes: 'Tomar con comida',
      },
    ]);
    fixture.detectChanges();
    const noteSpan = fixture.nativeElement.querySelector(
      '.slots-modal-notes-cell span[title]'
    ) as HTMLSpanElement;
    expect(noteSpan).toBeTruthy();
    expect(noteSpan.title.toLowerCase()).toContain('nota');
  });

  it('botón otras fechas muestra ver más y alterna a ver menos', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      scheduledTime: `2026-05-${10 + i}T10:00:00.000Z`,
      timeLabel: '10:00',
      dateLabel: `2026-05-${10 + i}`,
      status: 'pending',
    }));
    fixture.componentRef.setInput('otherSlots', rows);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('#nurse-schedule-slots-toggle-other-btn') as HTMLButtonElement;
    expect(btn?.textContent?.toLowerCase()).toContain('más');
    btn.click();
    fixture.detectChanges();
    expect(btn?.textContent?.toLowerCase()).toContain('menos');
  });

  it('pie del modal: botón cerrar con id', () => {
    const closeFooter = fixture.nativeElement.querySelector('#nurse-schedule-slots-close-btn') as HTMLButtonElement;
    expect(closeFooter).toBeTruthy();
  });

  it('slotNotesList usa etiqueta localizable cuando falta fecha/hora', () => {
    fixture.componentRef.setInput('allSlots', [
      {
        scheduledTime: '2026-05-04T11:00:00.000Z',
        timeLabel: '',
        dateLabel: '',
        status: 'pending',
        notes: 'Solo nota',
      },
    ]);
    const list = fixture.componentInstance.slotNotesList(4);
    expect(list.length).toBe(1);
    expect(list[0].when.toLowerCase()).toContain('horario');
  });
});
