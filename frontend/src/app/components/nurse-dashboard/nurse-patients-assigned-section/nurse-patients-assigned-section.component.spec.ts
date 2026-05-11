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
    },
  ];

  function dosesFn(p: Patient): number {
    return p.id === '1' ? 3 : 0;
  }

  function treatmentsFn(p: Patient): number {
    return p.id === '1' ? 1 : 2;
  }

  beforeEach(async () => {
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
    expect(fixture.nativeElement.querySelector('.filter-box-actions button')).toBeTruthy();
  });

  it('muestra limpiar si el filtro no es el predeterminado (mine)', () => {
    fixture.componentRef.setInput('searchTerm', '');
    fixture.componentRef.setInput('selectedFilter', 'all');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.filter-box-actions button')).toBeTruthy();
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
    const btn = fixture.nativeElement.querySelector('.filter-box-actions button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(fixture.componentInstance.clearPatientFiltersClick.emit).toHaveBeenCalled();
  });

  it('emite openPatientDetails al pulsar la tarjeta', () => {
    spyOn(fixture.componentInstance.openPatientDetails, 'emit');
    const card = fixture.nativeElement.querySelector('.patient-assigned-card') as HTMLElement;
    card.click();
    expect(fixture.componentInstance.openPatientDetails.emit).toHaveBeenCalledWith(patients[0]);
  });

  it('emite openPatientDetails al pulsar el botón Detalles', () => {
    spyOn(fixture.componentInstance.openPatientDetails, 'emit');
    const btn = fixture.nativeElement.querySelector('.nurse-details-pill-btn') as HTMLButtonElement;
    expect(btn?.textContent?.trim()).toBe('Detalles');
    btn.click();
    expect(fixture.componentInstance.openPatientDetails.emit).toHaveBeenCalledWith(patients[0]);
  });

  it('no muestra botón de "ver dosis hoy" en la tarjeta', () => {
    const badge = fixture.nativeElement.querySelector('.patient-assigned-meds-trigger');
    expect(badge).toBeFalsy();
  });

  it('muestra KPIs separados para medicamentos y tratamientos', () => {
    const pills = Array.from(
      fixture.nativeElement.querySelectorAll('.patient-assigned-task-pill')
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
    expect((empty as HTMLElement).textContent).toContain('No se encontraron pacientes');
  });
});
