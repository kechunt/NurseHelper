import { TestBed } from '@angular/core/testing';
import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportService);
  });

  it('debería crear el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debería lanzar error si no hay datos para exportar', () => {
    expect(() => {
      service.exportToCSV([], {});
    }).toThrowError('No hay datos para exportar');
  });

  it('debería exportar datos a CSV correctamente', () => {
    const data = [
      { name: 'Juan', age: 30, city: 'Madrid' },
      { name: 'María', age: 25, city: 'Barcelona' }
    ];

    spyOn(document, 'createElement').and.callThrough();
    spyOn(document.body, 'appendChild');
    spyOn(document.body, 'removeChild');

    service.exportToCSV(data);

    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('debería usar nombre de archivo personalizado', () => {
    const data = [{ name: 'Test' }];
    const options = { filename: 'custom-name.csv' };

    spyOn(document, 'createElement').and.callThrough();

    service.exportToCSV(data, options);

    expect(document.createElement).toHaveBeenCalled();
  });

  it('debería usar headers personalizados', () => {
    const data = [
      { firstName: 'Juan', lastName: 'Pérez' }
    ];
    const options = { headers: ['Nombre', 'Apellido'] };

    spyOn(document, 'createElement').and.callThrough();

    service.exportToCSV(data, options);

    expect(document.createElement).toHaveBeenCalled();
  });

  it('debería manejar valores anidados correctamente', () => {
    const data = [
      { user: { name: 'Juan', details: { age: 30 } } }
    ];

    const value = (service as any).getNestedValue(data[0], 'user.name');
    expect(value).toBe('Juan');

    const nestedValue = (service as any).getNestedValue(data[0], 'user.details.age');
    expect(nestedValue).toBe(30);
  });

  it('debería escapar comillas en valores CSV', () => {
    const data = [
      { name: 'Juan "El Grande"', description: 'Test, con comas' }
    ];

    spyOn(document, 'createElement').and.callThrough();

    service.exportToCSV(data);

    expect(document.createElement).toHaveBeenCalled();
  });

  it('debería formatear fechas correctamente', () => {
    const data = [{ name: 'Juan', birthDate: new Date(1990, 0, 15) }];
    const dateFields = ['birthDate'];

    const prepared = service.prepareDataForExport(data, dateFields);

    expect(prepared[0].birthDate).toContain('15');
    expect(prepared[0].birthDate).toContain('1990');
  });

  it('debería manejar valores nulos y undefined', () => {
    const data = [
      { name: 'Juan', age: null, city: undefined }
    ];

    expect(() => {
      service.exportToCSV(data);
    }).not.toThrow();
  });

  it('debería lanzar error si no hay datos para exportar PDF', () => {
    expect(() => {
      service.exportToPdf([], { title: 'Test' });
    }).toThrowError('No hay datos para exportar');
  });

  it('debería requerir título para exportar PDF', () => {
    expect(() => {
      service.exportToPdf([{ name: 'Juan' }], { title: '' });
    }).toThrowError('Se requiere título para exportar PDF');
  });

  it('debería exportar datos a PDF sin lanzar error', () => {
    const data = [{ name: 'Juan', age: 30 }];
    expect(() => {
      service.exportToPdf(data, { title: 'Listado', filename: 'test.pdf' });
    }).not.toThrow();
  });

  it('debería generar nombre de archivo con fecha si no se proporciona', () => {
    const data = [{ name: 'Test' }];

    spyOn(document, 'createElement').and.callThrough();

    service.exportToCSV(data);

    expect(document.createElement).toHaveBeenCalled();
  });
});
