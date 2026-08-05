# ExportService

Servicio para exportar datos a CSV y PDF.

## Características

- Exportación a CSV (BOM UTF-8 para Excel)
- Exportación a PDF tabular (`exportToPdf`)
- PDF multi-sección (`exportMultiSectionPdf`)
- Valores anidados con notación de punto en headers
- Escapado de caracteres especiales en CSV

## Uso

```typescript
import { ExportService } from './export.service';

constructor(private exportService: ExportService) {}
```

## Métodos

### exportToCSV

```typescript
exportToCSV(data: any[], options?: ExportOptions): void
```

```typescript
this.exportService.exportToCSV(patients, {
  filename: 'pacientes-2024.csv',
  headers: ['Nombre', 'Edad', 'Fecha de Nacimiento'],
});
```

### exportToPdf

```typescript
exportToPdf(data: any[], options: PdfExportOptions): void
```

Requiere `title`. Opcional: `filename`, `headers`, `generatedAtLabel`, `orientation`.

```typescript
this.exportService.exportToPdf(patients, {
  title: 'Pacientes',
  filename: 'pacientes.pdf',
});
```

### exportMultiSectionPdf

```typescript
exportMultiSectionPdf(options: PdfMultiSectionDocumentOptions): void
```

Documento PDF con varias secciones (tablas, pares clave-valor, texto). Ver `pdf-table-export.util`.

## Tipos

```typescript
interface ExportOptions {
  filename?: string;
  headers?: string[];
}

interface PdfExportOptions extends ExportOptions {
  title: string;
  generatedAtLabel?: string;
  orientation?: 'portrait' | 'landscape';
}
```

## Valores anidados

```typescript
this.exportService.exportToCSV(data, {
  headers: ['user.name', 'user.contact.email'],
});
```

## Errores

Lanza si no hay datos (`exportToCSV` / `exportToPdf`) o si falta `title` en PDF.

## Testing

Ver `export.service.spec.ts`.
