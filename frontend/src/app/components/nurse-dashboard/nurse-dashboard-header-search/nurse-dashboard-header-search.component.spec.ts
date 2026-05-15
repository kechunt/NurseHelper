import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NurseDashboardHeaderSearchComponent } from './nurse-dashboard-header-search.component';

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

describe('NurseDashboardHeaderSearchComponent', () => {
  let fixture: ComponentFixture<NurseDashboardHeaderSearchComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseDashboardHeaderSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseDashboardHeaderSearchComponent);
    fixture.detectChanges();
  });

  it('expone aria-label, title y placeholder localizables en el buscador', () => {
    const input = fixture.nativeElement.querySelector('#nurse-dashboard-header-search-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-label')).toContain('Buscar');
    expect(input.getAttribute('title')).toContain('ficha');
    expect(input.placeholder.toLowerCase()).toContain('paciente');
  });

  it('plantilla: id estable en el input de búsqueda', () => {
    expect(fixture.nativeElement.querySelector('#nurse-dashboard-header-search-input')).toBeTruthy();
  });

  it('emite debounced con el valor del input tras el debounce', fakeAsync(() => {
    spyOn(fixture.componentInstance.debounced, 'emit');
    const input = fixture.nativeElement.querySelector('#nurse-dashboard-header-search-input') as HTMLInputElement;
    input.value = 'cama 12';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    tick(350);
    expect(fixture.componentInstance.debounced.emit).toHaveBeenCalledWith('cama 12');
  }));
});
