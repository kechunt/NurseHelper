import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NurseClinicalNotesScopeBlockComponent } from './nurse-clinical-notes-scope-block.component';

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

describe('NurseClinicalNotesScopeBlockComponent', () => {
  let fixture: ComponentFixture<NurseClinicalNotesScopeBlockComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseClinicalNotesScopeBlockComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseClinicalNotesScopeBlockComponent);
    fixture.componentRef.setInput('patientId', 'p1');
    fixture.componentRef.setInput('scope', 'general');
    fixture.componentRef.setInput('notesFromApi', []);
    fixture.componentRef.setInput('legacySingleFieldText', '');
    fixture.detectChanges();
  });

  it('muestra etiqueta vacía localizada por defecto', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toMatch(/Sin datos|datos/i);
  });

  it('expandAllLabel incluye el conteo', () => {
    expect(fixture.componentInstance.expandAllLabel(4)).toContain('4');
    expect(fixture.componentInstance.expandAllLabel(4).toLowerCase()).toContain('ver');
  });

  it('detailDateLabel sin fecha devuelve guión localizado', () => {
    expect(
      fixture.componentInstance.detailDateLabel({
        id: null,
        body: 'x',
        authorName: null,
        createdAt: null,
        legacy: true,
      })
    ).toBe('—');
  });

  it('detailDateLabel formatea ISO con locale', () => {
    const s = fixture.componentInstance.detailDateLabel({
      id: 1,
      body: 'x',
      authorName: 'Ana',
      createdAt: '2026-06-01T14:30:00.000Z',
      legacy: false,
    });
    expect(s.length).toBeGreaterThan(6);
  });

  it('detailAuthorLabel distingue legacy sin autor', () => {
    const legacy = fixture.componentInstance.detailAuthorLabel({
      id: null,
      body: 'x',
      authorName: null,
      createdAt: null,
      legacy: true,
    });
    expect(legacy.length).toBeGreaterThan(5);
    const api = fixture.componentInstance.detailAuthorLabel({
      id: 1,
      body: 'x',
      authorName: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      legacy: false,
    });
    expect(api.length).toBeGreaterThan(3);
  });
});
