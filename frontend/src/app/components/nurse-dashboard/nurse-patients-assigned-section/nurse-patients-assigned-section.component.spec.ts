import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Patient } from '../nurse-dashboard.types';
import { NursePatientsAssignedSectionComponent } from './nurse-patients-assigned-section.component';

describe('NursePatientsAssignedSectionComponent', () => {
  let fixture: ComponentFixture<NursePatientsAssignedSectionComponent>;

  const patients: Patient[] = [
    {
      id: '1',
      name: 'María',
      bedNumber: '1A',
      age: 70,
      diagnosis: 'Neumonía',
      medications: [],
      pendingTasks: 2,
      priority: 'normal',
      isAssignedToMe: true,
    },
    {
      id: '2',
      name: 'Pedro',
      bedNumber: '2B',
      age: 45,
      diagnosis: 'Control',
      medications: [],
      pendingTasks: 0,
      priority: 'critical',
      isAssignedToMe: false,
      assignedToName: 'Beatriz',
    },
    {
      id: '3',
      name: 'Juan',
      bedNumber: '3C',
      age: 62,
      diagnosis: 'Seguimiento',
      medications: [],
      pendingTasks: 0,
      priority: 'normal',
    },
  ];

  function dosesFn(p: Patient): number {
    if (p.id === '1') {
      return 3;
    }
    if (p.id === '2') {
      return 0;
    }
    return 0;
  }

  function treatmentsFn(p: Patient): number {
    if (p.id === '1') {
      return 1;
    }
    if (p.id === '2') {
      return 2;
    }
    return 0;
  }

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

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NursePatientsAssignedSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NursePatientsAssignedSectionComponent);
    fixture.componentRef.setInput('patients', patients);
    fixture.componentRef.setInput('medicationDosesToday', dosesFn);
    fixture.componentRef.setInput('treatmentsTodayCount', treatmentsFn);
    fixture.componentRef.setInput('searchTerm', '');
    fixture.componentRef.setInput('selectedFilter', 'mine');
    fixture.detectChanges();
  });

  it('patientCardAriaLabel incluye el nombre del paciente', () => {
    expect(fixture.componentInstance.patientCardAriaLabel(patients[0])).toContain('María');
  });

  it('el buscador de pacientes expone placeholder localizable', () => {
    const input = fixture.nativeElement.querySelector('#nurse-patient-search') as HTMLInputElement;
    expect(input.placeholder.toLowerCase()).toMatch(/maría|maria|ej/);
  });

  it('emite searchTermChange al escribir en el buscador', () => {
    spyOn(fixture.componentInstance.searchTermChange, 'emit');
    const input = fixture.nativeElement.querySelector('#nurse-patient-search') as HTMLInputElement;
    input.value = 'mar';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.searchTermChange.emit).toHaveBeenCalledWith('mar');
  });

  it('emite selectedFilterChange al cambiar el desplegable', () => {
    spyOn(fixture.componentInstance.selectedFilterChange, 'emit');
    const select = fixture.nativeElement.querySelector('#nurse-patient-filter-type') as HTMLSelectElement;
    select.value = 'critical';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedFilterChange.emit).toHaveBeenCalledWith('critical');
  });

  it('muestra limpiar filtros cuando hay búsqueda', () => {
    fixture.componentRef.setInput('searchTerm', '  ana ');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#nurse-patients-assigned-section-clear-filters-btn')).toBeTruthy();
  });

  it('muestra limpiar si el filtro no es el predeterminado (mine)', () => {
    fixture.componentRef.setInput('searchTerm', '');
    fixture.componentRef.setInput('selectedFilter', 'all');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#nurse-patients-assigned-section-clear-filters-btn')).toBeTruthy();
  });

  it('no muestra limpiar filtros con valores por defecto', () => {
    fixture.componentRef.setInput('searchTerm', '');
    fixture.componentRef.setInput('selectedFilter', 'mine');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.filter-box-actions')).toBeFalsy();
  });

  it('emite clearPatientFiltersClick al pulsar limpiar', () => {
    spyOn(fixture.componentInstance.clearPatientFiltersClick, 'emit');
    fixture.componentRef.setInput('selectedFilter', 'critical');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      '#nurse-patients-assigned-section-clear-filters-btn'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(fixture.componentInstance.clearPatientFiltersClick.emit).toHaveBeenCalled();
  });

  it('badges de asignación y botón Detalles exponen title localizable', () => {
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll('.patient-assigned-card')
    ) as HTMLElement[];
    expect(cards.length).toBe(3);
    const mineBadge = cards[0].querySelector('.patient-assignment-badge--mine') as HTMLSpanElement;
    expect(mineBadge?.title.toLowerCase()).toContain('asign');
    const otherBadge = cards[1].querySelector('.patient-assignment-badge--other') as HTMLSpanElement;
    expect(otherBadge?.title.toLowerCase()).toContain('turno');
    expect(otherBadge?.textContent?.toLowerCase()).toContain('asignado a');
    expect(otherBadge?.textContent).toContain('Beatriz');
    const pendingBadge = cards[2].querySelector('.patient-assignment-badge--pending') as HTMLSpanElement;
    expect(pendingBadge?.title.toLowerCase()).toContain('enfermera');
    const btn = cards[0].querySelector('#nurse-patients-assigned-section-view-details-0') as HTMLButtonElement;
    expect(btn.title.toLowerCase()).toContain('detalle');
    expect(cards[0].querySelector('.patient-assigned-card-footer')).toBeTruthy();
  });

  it('muestra botón Asignarme solo en pacientes sin enfermera', () => {
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll('.patient-assigned-card')
    ) as HTMLElement[];
    expect(cards[0].querySelector('.nurse-claim-pill-btn')).toBeFalsy();
    expect(cards[1].querySelector('.nurse-claim-pill-btn')).toBeFalsy();
    expect(cards[2].querySelector('.nurse-claim-pill-btn')).toBeTruthy();
  });

  it('emite claimPatient al pulsar Asignarme', () => {
    spyOn(fixture.componentInstance.claimPatient, 'emit');
    const btn = fixture.nativeElement.querySelector(
      '#nurse-patients-assigned-section-claim-2'
    ) as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.claimPatient.emit).toHaveBeenCalledWith(patients[2]);
  });

  it('plantilla: id limpiar filtros y Ver detalles por fila', () => {
    fixture.componentRef.setInput('selectedFilter', 'all');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#nurse-patients-assigned-section-clear-filters-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-patients-assigned-section-view-details-0')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nurse-patients-assigned-section-view-details-1')).toBeTruthy();
  });

  it('emite openPatientDetails al pulsar la tarjeta', () => {
    spyOn(fixture.componentInstance.openPatientDetails, 'emit');
    const card = fixture.nativeElement.querySelector('.patient-assigned-card') as HTMLElement;
    card.click();
    expect(fixture.componentInstance.openPatientDetails.emit).toHaveBeenCalledWith(patients[0]);
  });

  it('emite openPatientDetails al pulsar el botón Detalles', () => {
    spyOn(fixture.componentInstance.openPatientDetails, 'emit');
    const btn = fixture.nativeElement.querySelector(
      '#nurse-patients-assigned-section-view-details-0'
    ) as HTMLButtonElement;
    expect(btn?.textContent?.trim().toLowerCase()).toContain('detalle');
    btn.click();
    expect(fixture.componentInstance.openPatientDetails.emit).toHaveBeenCalledWith(patients[0]);
  });

  it('no muestra botón de "ver dosis hoy" en la tarjeta', () => {
    const badge = fixture.nativeElement.querySelector('.patient-assigned-meds-trigger');
    expect(badge).toBeFalsy();
  });

  it('muestra KPIs separados para medicamentos y tratamientos', () => {
    const pills = Array.from(
      fixture.nativeElement.querySelectorAll('.patient-assigned-card:first-child .patient-assigned-task-pill')
    ) as HTMLElement[];
    const text = pills.map((p) => p.textContent || '').join(' ');
    expect(text).toContain('3 medicamentos');
    expect(text).toContain('1 tratamientos');
  });

  it('muestra mensaje vacío si no hay pacientes', () => {
    fixture.componentRef.setInput('patients', []);
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.empty-message');
    expect(empty).toBeTruthy();
    expect((empty as HTMLElement).textContent?.toLowerCase()).toContain('paciente');
  });

  it('título de sección y opciones del filtro localizables', () => {
    const h2 = fixture.nativeElement.querySelector('#nurse-patients-area-title') as HTMLElement;
    expect(h2?.textContent?.toLowerCase()).toContain('paciente');
    const select = fixture.nativeElement.querySelector('#nurse-patient-filter-type') as HTMLSelectElement;
    const opts = Array.from(select.options).map((o) => o.textContent || '');
    expect(opts.some((t) => t.toLowerCase().includes('medicamento'))).toBeTrue();
    expect(opts.some((t) => t.toLowerCase().includes('crítico') || t.toLowerCase().includes('critico'))).toBeTrue();
  });

  it('bloques clínico compacto reciben etiquetas localizables desde el padre', () => {
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.ncnsb__block-label')) as HTMLElement[];
    const texts = labels.map((el) => el.textContent || '').join(' ');
    expect(texts.toLowerCase()).toContain('diagn');
    expect(texts.toLowerCase()).toContain('obs');
  });
});
