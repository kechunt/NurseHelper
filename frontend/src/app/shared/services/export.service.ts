import { Injectable } from '@angular/core';
import {
  downloadPdfMultiSectionDocument,
  downloadPdfTableDocument,
  PdfMultiSectionDocumentOptions,
  PdfTableDocumentOptions,
} from '../utils/pdf-table-export.util';

export interface ExportOptions {
  filename?: string;
  headers?: string[];
}

export interface PdfExportOptions extends ExportOptions {
  title: string;
  generatedAtLabel?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Servicio para exportar datos a CSV y PDF
 */
@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Exporta datos a CSV
   */
  exportToCSV(data: any[], options: ExportOptions = {}): void {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    const filename = options.filename || `export-${new Date().toISOString().split('T')[0]}.csv`;
    const headers = options.headers || Object.keys(data[0]);

    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = this.getNestedValue(row, header);
          const stringValue = String(value ?? '').replace(/"/g, '""');
          return /[,\n"]/.test(stringValue) ? `"${stringValue}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    this.downloadBlob(new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
  }

  /**
   * Exporta datos tabulares a PDF
   */
  exportToPdf(data: any[], options: PdfExportOptions): void {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }
    if (!options.title) {
      throw new Error('Se requiere título para exportar PDF');
    }

    const headers = options.headers || Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => this.getNestedValue(row, header) ?? ''));
    const filename = options.filename || `export-${new Date().toISOString().split('T')[0]}.pdf`;

    downloadPdfTableDocument({
      title: options.title,
      filename,
      generatedAtLabel: options.generatedAtLabel,
      orientation: options.orientation,
      sections: [{ headers, rows }],
    });
  }

  /**
   * Exporta un documento PDF con varias secciones (tablas, pares clave-valor, texto)
   */
  exportMultiSectionPdf(options: PdfMultiSectionDocumentOptions): void {
    downloadPdfMultiSectionDocument(options);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export type { PdfMultiSectionDocumentOptions, PdfTableDocumentOptions };
