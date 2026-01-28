import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent, PaginationConfig } from './pagination.component';
import { CommonModule } from '@angular/common';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  const mockConfig: PaginationConfig = {
    currentPage: 1,
    totalItems: 100,
    itemsPerPage: 25,
    totalPages: 4
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent, CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    component.config = mockConfig;
    fixture.detectChanges();
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería calcular correctamente las páginas a mostrar', () => {
    component.config = { ...mockConfig, currentPage: 2 };
    fixture.detectChanges();
    
    const pages = component.pages;
    expect(pages.length).toBeGreaterThan(0);
    expect(pages).toContain(2);
  });

  it('debería mostrar máximo 7 páginas', () => {
    component.config = { ...mockConfig, totalPages: 20, currentPage: 10 };
    fixture.detectChanges();
    
    const pages = component.pages;
    expect(pages.length).toBeLessThanOrEqual(7);
  });

  it('debería calcular correctamente startItem y endItem', () => {
    component.config = { ...mockConfig, currentPage: 2, itemsPerPage: 25 };
    fixture.detectChanges();
    
    expect(component.startItem).toBe(26);
    expect(component.endItem).toBe(50);
  });

  it('debería emitir pageChange al cambiar de página', () => {
    spyOn(component.pageChange, 'emit');
    
    component.goToPage(2);
    
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('no debería emitir pageChange si la página es inválida', () => {
    spyOn(component.pageChange, 'emit');
    
    component.goToPage(0); // Página inválida
    component.goToPage(5); // Página fuera de rango
    component.goToPage(1); // Página actual
    
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('debería navegar a página anterior', () => {
    component.config = { ...mockConfig, currentPage: 2 };
    fixture.detectChanges();
    
    spyOn(component, 'goToPage');
    
    component.previousPage();
    
    expect(component.goToPage).toHaveBeenCalledWith(1);
  });

  it('no debería navegar a página anterior si está en la primera página', () => {
    component.config = { ...mockConfig, currentPage: 1 };
    fixture.detectChanges();
    
    spyOn(component, 'goToPage');
    
    component.previousPage();
    
    expect(component.goToPage).not.toHaveBeenCalled();
  });

  it('debería navegar a página siguiente', () => {
    component.config = { ...mockConfig, currentPage: 2 };
    fixture.detectChanges();
    
    spyOn(component, 'goToPage');
    
    component.nextPage();
    
    expect(component.goToPage).toHaveBeenCalledWith(3);
  });

  it('no debería navegar a página siguiente si está en la última página', () => {
    component.config = { ...mockConfig, currentPage: 4 };
    fixture.detectChanges();
    
    spyOn(component, 'goToPage');
    
    component.nextPage();
    
    expect(component.goToPage).not.toHaveBeenCalled();
  });

  it('debería emitir itemsPerPageChange al cambiar items por página', () => {
    spyOn(component.itemsPerPageChange, 'emit');
    
    const select = document.createElement('select');
    select.value = '50';
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: select });
    
    component.onItemsPerPageChange(event);
    
    expect(component.itemsPerPageChange.emit).toHaveBeenCalledWith(50);
  });

  it('debería calcular correctamente endItem cuando es la última página', () => {
    component.config = { ...mockConfig, currentPage: 4, totalItems: 100, itemsPerPage: 25 };
    fixture.detectChanges();
    
    expect(component.endItem).toBe(100);
  });
});
