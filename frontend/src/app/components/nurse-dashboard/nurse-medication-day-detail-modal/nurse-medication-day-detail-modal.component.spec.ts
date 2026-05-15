import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseMedicationDayDetailModalComponent } from './nurse-medication-day-detail-modal.component';

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

describe('NurseMedicationDayDetailModalComponent', () => {
  let fixture: ComponentFixture<NurseMedicationDayDetailModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseMedicationDayDetailModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseMedicationDayDetailModalComponent);
    fixture.componentRef.setInput('slot', {
      name: 'Paracetamol',
      dosage: '500mg',
      notes: '',
      time: '08:00',
      scheduledTime: '2026-05-05T08:00:00.000Z',
      status: 'pending',
    });
    fixture.componentRef.setInput('patientName', 'Ana');
    fixture.detectChanges();
  });

  it('plantilla: botón cerrar del pie y cabecera con id', () => {
    const btn = fixture.nativeElement.querySelector('#nurse-medication-day-detail-close-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent?.toLowerCase()).toContain('cerrar');
    expect(fixture.nativeElement.querySelector('#nurse-medication-day-detail-header-close-btn')).toBeTruthy();
  });

  it('emite dismissed por backdrop y botón cerrar', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-medication-day-detail-backdrop'
    ) as HTMLElement;
    backdrop.click();
    const close = fixture.nativeElement.querySelector('#nurse-medication-day-detail-header-close-btn') as HTMLButtonElement;
    close.click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });

  it('statusLabel interpreta banderas/estado', () => {
    expect(fixture.componentInstance.statusLabel({ status: 'completed' } as any)).toBe('Administrado');
    expect(fixture.componentInstance.statusLabel({ status: 'cancelled' } as any)).toBe('Cancelado');
    expect(fixture.componentInstance.statusLabel({ status: 'pending' } as any)).toBe('Pendiente');
  });

  it('selectedDayTimes devuelve solo horarios del día seleccionado', () => {
    const out = fixture.componentInstance.selectedDayTimes(
      {
        scheduleSlots: [
          { scheduledTime: '2026-05-05T08:00:00.000Z', timeLabel: '08:00' },
          { scheduledTime: '2026-05-05T20:00:00.000Z', timeLabel: '20:00' },
          { scheduledTime: '2026-05-06T08:00:00.000Z', timeLabel: '08:00' },
        ],
      },
      {
        name: 'Paracetamol',
        dosage: '500mg',
        notes: '',
        time: '08:00',
        scheduledTime: '2026-05-05T10:00:00.000Z',
        status: 'pending',
      }
    );
    expect(out).toEqual(['08:00', '20:00']);
  });

  it('emDash coincide con guión localizado', () => {
    expect(fixture.componentInstance.emDash()).toBe('—');
  });

  it('muestra «Fecha considerada» cuando hay pauta', () => {
    fixture.componentRef.setInput('pauta', { frequency: 'c/8h', scheduleSlots: [] });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/considerada/i);
  });
});
