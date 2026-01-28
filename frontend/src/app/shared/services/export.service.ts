import { Injectable } from '@angular/core';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  headers?: string[];
}

/**
 * Servicio para exportar datos a CSV y Excel
 */
@Injectable({
  providedIn: 'root'
})
export class ExportService {
  
  /**
   * Exporta datos a CSV
   * @param data Array de objetos a exportar
   * @param options Opciones de exportación
   */
  exportToCSV(data: any[], options: ExportOptions = {}): void {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    const filename = options.filename || `export-${new Date().toISOString().split('T')[0]}.csv`;
    const headers = options.headers || Object.keys(data[0]);
    
    // Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = this.getNestedValue(row, header);
          // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
          const stringValue = String(value || '').replace(/"/g, '""');
          return /[,\n"]/.test(stringValue) ? `"${stringValue}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta datos a Excel (XLSX)
   * Intenta usar la librería xlsx si está disponible, sino usa CSV con extensión .xlsx
   * @param data Array de objetos a exportar
   * @param options Opciones de exportación
   */
  exportToExcel(data: any[], options: ExportOptions = {}): void {
    // Intentar usar librería xlsx si está disponible
    try {
      // @ts-ignore - xlsx puede no estar instalado
      const XLSX = require('xlsx');
      
      const filename = (options.filename || `export-${new Date().toISOString().split('T')[0]}`).replace('.csv', '.xlsx');
      const sheetName = options.sheetName || 'Datos';
      
      // Convertir datos a formato de hoja de cálculo
      const headers = options.headers || Object.keys(data[0]);
      const worksheetData = [
        headers,
        ...data.map(row => headers.map(header => {
          const value = this.getNestedValue(row, header);
          // Formatear fechas si son objetos Date
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value || '';
        }))
      ];
      
      // Crear workbook y worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generar archivo Excel
      XLSX.writeFile(workbook, filename);
      
      return;
    } catch (error) {
      // Si xlsx no está disponible, usar CSV con extensión .xlsx
      console.warn('Librería xlsx no disponible, usando CSV con extensión .xlsx. Instala xlsx para exportación Excel completa: npm install xlsx');
    }
    
    // Fallback: CSV con extensión .xlsx
    const filename = (options.filename || `export-${new Date().toISOString().split('T')[0]}`).replace('.csv', '.xlsx');
    this.exportToCSV(data, { ...options, filename });
  }

  /**
   * Obtiene un valor anidado de un objeto usando notación de punto
   * Ejemplo: getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Prepara datos para exportación formateando fechas y valores complejos
   */
  prepareDataForExport(data: any[], dateFields: string[] = []): any[] {
    return data.map(item => {
      const prepared = { ...item };
      dateFields.forEach(field => {
        if (prepared[field]) {
          prepared[field] = new Date(prepared[field]).toLocaleDateString('es-ES');
        }
      });
      return prepared;
    });
  }
}
