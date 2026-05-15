import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { BedDisplay } from '../nurse-dashboard.types';
import { NurseBedsSectionComponent } from './nurse-beds-section.component';

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

describe('NurseBedsSectionComponent', () => {
  let fixture: ComponentFixture<NurseBedsSectionComponent>;

  const occupiedBed: BedDisplay = {
    id: 1,
    bedNumber: '12A',
    patient: { id: '9', name: 'Luis', age: 55, conditions: ['HTA'] },
  };

  const freeBed: BedDisplay = {
    id: 2,
    bedNumber: '12B',
    patient: null,
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseBedsSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseBedsSectionComponent);
    fixture.componentRef.setInput('assignedArea', 'UCI');
    fixture.componentRef.setInput('myBeds', [occupiedBed, freeBed]);
    fixture.detectChanges();
  });

  it('expone títulos localizables en tarjeta de cama y botón detalles', () => {
    const card = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-0') as HTMLElement;
    expect(card?.getAttribute('title')).toContain('cama');
    const btn = fixture.nativeElement.querySelector('#nurse-beds-section-view-patient-0') as HTMLButtonElement;
    expect(btn.getAttribute('title')).toContain('detalles');
  });

  it('plantilla: ids por índice en tarjetas y Ver paciente', () => {
    expect(fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-0')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-1')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-beds-section-view-patient-0')).toBeTruthy();
  });

  it('cabecera de sección y subtítulo con área localizables', () => {
    const h2 = fixture.nativeElement.querySelector('#nurse-beds-section-title') as HTMLElement;
    expect(h2?.textContent?.toLowerCase()).toContain('cama');
    const sub = fixture.nativeElement.querySelector('.beds-section-header .section-subtitle') as HTMLElement;
    expect(sub?.textContent).toContain('UCI');
    expect(sub?.textContent).toMatch(/2/);
  });

  it('estado ocupada y bloques clínicos compactos muestran etiquetas localizables', () => {
    const occupied = fixture.nativeElement.querySelector('.bed-card.occupied .bed-status-badge') as HTMLElement;
    expect(occupied?.textContent?.toLowerCase()).toContain('ocup');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.ncnsb__block-label')) as HTMLElement[];
    const joined = labels.map((el) => el.textContent || '').join(' ');
    expect(joined.toLowerCase()).toContain('diagn');
    expect(joined.toLowerCase()).toContain('obs');
  });

  it('cama libre muestra mensaje de disponible localizable', () => {
    const free = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-1') as HTMLElement;
    expect(free?.textContent?.toLowerCase()).toContain('disponible');
  });

  it('emite bedEditRequest al pulsar la tarjeta de cama', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    const card = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-0') as HTMLElement;
    expect(card).toBeTruthy();
    card.click();
    expect(fixture.componentInstance.bedEditRequest.emit).toHaveBeenCalledWith(occupiedBed);
  });

  it('emite viewPatientRequest al pulsar Ver detalles sin propagar edición de cama', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    spyOn(fixture.componentInstance.viewPatientRequest, 'emit');
    const btn = fixture.nativeElement.querySelector('#nurse-beds-section-view-patient-0') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.viewPatientRequest.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: '9', name: 'Luis' })
    );
    expect(fixture.componentInstance.bedEditRequest.emit).not.toHaveBeenCalled();
  });

  it('emite bedEditRequest en cama libre', () => {
    spyOn(fixture.componentInstance.bedEditRequest, 'emit');
    const card = fixture.nativeElement.querySelector('#nurse-beds-section-bed-card-1') as HTMLElement;
    card.click();
    expect(fixture.componentInstance.bedEditRequest.emit).toHaveBeenCalledWith(freeBed);
  });
});
