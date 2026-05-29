import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfTableSection {
  title?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface PdfTableDocumentOptions {
  title: string;
  filename: string;
  generatedAtLabel?: string;
  sections: PdfTableSection[];
  orientation?: 'portrait' | 'landscape';
}

export interface PdfKeyValueSection {
  title?: string;
  rows: Array<[string, string | number]>;
}

export interface PdfMultiSectionDocumentOptions {
  title: string;
  filename: string;
  generatedAtLabel?: string;
  subtitle?: string;
  keyValueSections?: PdfKeyValueSection[];
  tableSections?: PdfTableSection[];
  textSections?: Array<{ title: string; body: string }>;
  orientation?: 'portrait' | 'landscape';
}

function appendGeneratedAt(doc: jsPDF, y: number, label?: string): number {
  const prefix = label || 'Generado:';
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `${prefix} ${new Date().toLocaleString('es-ES')}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: 'center' }
  );
  doc.setTextColor(0);
  return y + 8;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    return 18;
  }
  return y;
}

export function downloadPdfTableDocument(options: PdfTableDocumentOptions): void {
  downloadPdfMultiSectionDocument({
    title: options.title,
    filename: options.filename,
    generatedAtLabel: options.generatedAtLabel,
    orientation: options.orientation,
    tableSections: options.sections,
  });
}

export function downloadPdfMultiSectionDocument(options: PdfMultiSectionDocumentOptions): void {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFontSize(16);
  doc.text(options.title, pageWidth / 2, y, { align: 'center' });
  y += 8;

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.text(options.subtitle, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  y = appendGeneratedAt(doc, y, options.generatedAtLabel);

  for (const section of options.keyValueSections || []) {
    y = ensureSpace(doc, y, 14);
    if (section.title) {
      doc.setFontSize(12);
      doc.text(section.title, 14, y);
      y += 6;
    }
    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Valor']],
      body: section.rows.map(([k, v]) => [k, String(v ?? '')]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  for (const section of options.tableSections || []) {
    y = ensureSpace(doc, y, 14);
    if (section.title) {
      doc.setFontSize(12);
      doc.text(section.title, 14, y);
      y += 6;
    }
    autoTable(doc, {
      startY: y,
      head: [section.headers],
      body: section.rows.map((row) => row.map((cell) => String(cell ?? ''))),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  for (const section of options.textSections || []) {
    y = ensureSpace(doc, y, 14);
    doc.setFontSize(12);
    doc.text(section.title, 14, y);
    y += 6;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(section.body || '—', pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 6;
  }

  doc.save(options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`);
}
