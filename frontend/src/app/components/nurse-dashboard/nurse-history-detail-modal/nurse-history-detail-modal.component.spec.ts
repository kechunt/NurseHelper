import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseHistoryDetailModalComponent } from './nurse-history-detail-modal.component';

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

describe('NurseHistoryDetailModalComponent', () => {
  let fixture: ComponentFixture<NurseHistoryDetailModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseHistoryDetailModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseHistoryDetailModalComponent);
    fixture.componentRef.setInput('record', {
      date: '2026-05-05',
      time: '10:00',
      type: 'medication',
      nurseName: 'Ana',
      description: 'Dosis',
      status: 'administered',
    });
    fixture.detectChanges();
  });

  it('emite dismissed en backdrop y cerrar', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    const backdrop = fixture.nativeElement.querySelector(
      '.nurse-history-detail-backdrop'
    ) as HTMLElement;
    backdrop.click();
    const close = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    close.click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });

  it('statusLabel mapea estados principales', () => {
    expect(fixture.componentInstance.statusLabel({ status: 'administered' } as any)).toBe('Realizado');
    expect(fixture.componentInstance.statusLabel({ status: 'postponed' } as any)).toBe('Pospuesto');
    expect(fixture.componentInstance.statusLabel({ status: 'missed' } as any)).toBe('Omitido');
  });

  it('notesBlockVisible detecta campos de notas/registro', () => {
    expect(fixture.componentInstance.notesBlockVisible({ notes: 'x' } as any)).toBeTrue();
    expect(fixture.componentInstance.notesBlockVisible({ reasonNotAdministered: 'motivo' } as any)).toBeTrue();
    expect(fixture.componentInstance.notesBlockVisible({} as any)).toBeFalse();
  });
});
