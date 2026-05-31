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

  it('displayBody elimina fecha y hora en formato legacy', () => {
    const body = fixture.componentInstance.displayBody({
      id: null,
      body: '[5/5/2026 21:36:00] asdasdasd',
      authorName: null,
      createdAt: null,
      legacy: true,
    });
    expect(body).toBe('asdasdasd');
    expect(body).not.toContain('21:36');
  });

  it('openList muestra el modal en document.body', () => {
    fixture.componentRef.setInput('legacySingleFieldText', '[1/1/2026 10:00:00] Nota A');
    fixture.detectChanges();
    fixture.componentInstance.openList();
    fixture.detectChanges();
    const backdrop = document.body.querySelector('.ncnsb-notes-list-backdrop');
    expect(backdrop).toBeTruthy();
    fixture.componentInstance.closeList();
    fixture.detectChanges();
  });

  it('emite expandRequest cuando externalExpand está activo', () => {
    spyOn(fixture.componentInstance.expandRequest, 'emit');
    fixture.componentRef.setInput('externalExpand', true);
    fixture.componentRef.setInput('legacySingleFieldText', '[1/1/2026 10:00:00] Nota A');
    fixture.detectChanges();
    fixture.componentInstance.onExpandClick(new MouseEvent('click'));
    expect(fixture.componentInstance.expandRequest.emit).toHaveBeenCalled();
  });

  it('onTogglePin alterna el estado de pin', () => {
    fixture.componentRef.setInput('legacySingleFieldText', '[1/1/2026 10:00:00] Nota A');
    fixture.detectChanges();
    const note = fixture.componentInstance.effectiveNotes()[0];
    expect(fixture.componentInstance.isPinned(note)).toBe(false);
    fixture.componentInstance.onTogglePin(new MouseEvent('click'), note);
    expect(fixture.componentInstance.isPinned(note)).toBe(true);
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
