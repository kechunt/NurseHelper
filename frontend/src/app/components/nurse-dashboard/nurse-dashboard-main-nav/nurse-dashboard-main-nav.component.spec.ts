import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { NurseDashboardMainNavComponent } from './nurse-dashboard-main-nav.component';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part =
        idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

describe('NurseDashboardMainNavComponent', () => {
  let fixture: ComponentFixture<NurseDashboardMainNavComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseDashboardMainNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseDashboardMainNavComponent);
    fixture.componentRef.setInput('nurseMainView', 'summary');
    fixture.detectChanges();
  });

  it('expone tablist con etiqueta para vistas principales', () => {
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(tablist.getAttribute('aria-label')).toContain('Vistas del panel de enfermería');
  });

  it('emite viewSelect al elegir vista Tareas', () => {
    spyOn(fixture.componentInstance.viewSelect, 'emit');
    const buttons = fixture.nativeElement.querySelectorAll('.nurse-nav-tablist button.nav-link');
    (buttons[1] as HTMLButtonElement).click();
    expect(fixture.componentInstance.viewSelect.emit).toHaveBeenCalledWith('tasks');
  });

  it('emite entregaClick y reportesClick', () => {
    spyOn(fixture.componentInstance.entregaClick, 'emit');
    spyOn(fixture.componentInstance.reportesClick, 'emit');
    const quickButtons = fixture.nativeElement.querySelectorAll(
      '.nurse-nav-quick-group button'
    ) as NodeListOf<HTMLButtonElement>;
    const entrega = quickButtons[0];
    const reportes = quickButtons[1];
    entrega.click();
    reportes.click();
    expect(fixture.componentInstance.entregaClick.emit).toHaveBeenCalled();
    expect(fixture.componentInstance.reportesClick.emit).toHaveBeenCalled();
  });

  it('onMainViewTabKeydown con ArrowRight activa la siguiente vista', () => {
    const c = fixture.componentInstance;
    spyOn(c.viewSelect, 'emit');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    spyOn(ev, 'preventDefault');
    c.onMainViewTabKeydown(ev, 'summary');
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(c.viewSelect.emit).toHaveBeenCalledWith('tasks');
  });

  it('onMainViewTabKeydown con End activa la última vista', () => {
    const c = fixture.componentInstance;
    spyOn(c.viewSelect, 'emit');
    const ev = new KeyboardEvent('keydown', { key: 'End' });
    spyOn(ev, 'preventDefault');
    c.onMainViewTabKeydown(ev, 'summary');
    expect(c.viewSelect.emit).toHaveBeenCalledWith('patients');
  });

  it('onMainViewTabKeydown ignora teclas no gestionadas', () => {
    const c = fixture.componentInstance;
    spyOn(c.viewSelect, 'emit');
    const ev = new KeyboardEvent('keydown', { key: 'a' });
    spyOn(ev, 'preventDefault');
    c.onMainViewTabKeydown(ev, 'summary');
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(c.viewSelect.emit).not.toHaveBeenCalled();
  });

  it('tras cambiar con teclado enfoca el botón de pestaña destino', fakeAsync(() => {
    const c = fixture.componentInstance;
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    c.onMainViewTabKeydown(ev, 'summary');
    flushMicrotasks();
    expect(document.activeElement?.id).toBe('nurse-tab-tasks');
  }));
});
