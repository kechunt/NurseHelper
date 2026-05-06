import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationModalComponent } from './confirmation-modal.component';

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

describe('ConfirmationModalComponent', () => {
  let fixture: ComponentFixture<ConfirmationModalComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [ConfirmationModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationModalComponent);
  });

  it('no muestra el panel hasta show es true', () => {
    fixture.componentRef.setInput('show', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeNull();
  });

  it('muestra título, mensaje y botones por defecto cuando show es true', () => {
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('.modal-title')?.textContent).toContain('Confirmar acción');
    expect(overlay.textContent).toContain('¿Estás seguro de realizar esta acción?');
    const buttons = overlay.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(labels.some((t) => t?.includes('Cancelar'))).toBeTrue();
    expect(labels.some((t) => t?.includes('Confirmar'))).toBeTrue();
    const closeBtn = overlay.querySelector('.modal-close') as HTMLButtonElement | null;
    expect(closeBtn?.getAttribute('aria-label')).toContain('Cerrar');
  });
});
