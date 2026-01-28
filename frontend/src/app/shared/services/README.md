# ExportService

Servicio para exportar datos a CSV y Excel (XLSX).

## Características

- ✅ Exportación a CSV
- ✅ Exportación a Excel (XLSX) con soporte para librería `xlsx`
- ✅ Formateo automático de fechas
- ✅ Manejo de valores anidados
- ✅ Escapado correcto de caracteres especiales
- ✅ Headers personalizables

## Uso

### Importación

```typescript
import { ExportService } from '@shared/services/export.service';
```

### Inyección

```typescript
constructor(private exportService: ExportService) {}
```

## Métodos

### exportToCSV

Exporta datos a formato CSV.

```typescript
exportToCSV(data: any[], options?: ExportOptions): void
```

**Parámetros:**
- `data`: Array de objetos a exportar
- `options`: Opciones de exportación (opcional)

**Ejemplo:**

```typescript
const patients = [
  { name: 'Juan Pérez', age: 30, birthDate: new Date('1990-01-15') },
  { name: 'María García', age: 25, birthDate: new Date('1995-05-20') }
];

// Exportación básica
this.exportService.exportToCSV(patients);

// Con opciones personalizadas
this.exportService.exportToCSV(patients, {
  filename: 'pacientes-2024.csv',
  headers: ['Nombre', 'Edad', 'Fecha de Nacimiento']
});
```

### exportToExcel

Exporta datos a formato Excel (XLSX).

```typescript
exportToExcel(data: any[], options?: ExportOptions): void
```

**Nota**: Si la librería `xlsx` está instalada, genera un archivo Excel real. Si no, genera CSV con extensión `.xlsx`.

**Instalación de xlsx:**

```bash
npm install xlsx
```

**Ejemplo:**

```typescript
const patients = [
  { name: 'Juan Pérez', age: 30 },
  { name: 'María García', age: 25 }
];

// Exportación básica
this.exportService.exportToExcel(patients);

// Con opciones personalizadas
this.exportService.exportToExcel(patients, {
  filename: 'pacientes-2024.xlsx',
  sheetName: 'Pacientes',
  headers: ['Nombre', 'Edad']
});
```

### prepareDataForExport

Prepara datos para exportación formateando fechas.

```typescript
prepareDataForExport(data: any[], dateFields?: string[]): any[]
```

**Ejemplo:**

```typescript
const rawData = [
  { name: 'Juan', birthDate: new Date('1990-01-15') }
];

const prepared = this.exportService.prepareDataForExport(rawData, ['birthDate']);
// prepared[0].birthDate será una cadena formateada como fecha
```

## ExportOptions

```typescript
interface ExportOptions {
  filename?: string;      // Nombre del archivo (por defecto: export-YYYY-MM-DD.csv/xlsx)
  sheetName?: string;     // Nombre de la hoja (solo para Excel, por defecto: 'Datos')
  headers?: string[];      // Headers personalizados (por defecto: keys del primer objeto)
}
```

## Ejemplo Completo

```typescript
import { Component } from '@angular/core';
import { ExportService } from '@shared/services/export.service';
import { Patient } from '@models/patient';

@Component({
  selector: 'app-patients-list',
  templateUrl: './patients-list.component.html'
})
export class PatientsListComponent {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];

  constructor(private exportService: ExportService) {}

  exportToCSV(): void {
    const data = this.filteredPatients.map(p => ({
      'Nombre': `${p.firstName} ${p.lastName}`,
      'DNI': p.identificationNumber,
      'Fecha de Ingreso': p.admissionDate ? new Date(p.admissionDate).toLocaleDateString('es-ES') : '',
      'Área': p.area?.name || '',
      'Cama': p.bed?.number || ''
    }));

    this.exportService.exportToCSV(data, {
      filename: `pacientes-${new Date().toISOString().split('T')[0]}.csv`
    });
  }

  exportToExcel(): void {
    const data = this.filteredPatients.map(p => ({
      'Nombre': `${p.firstName} ${p.lastName}`,
      'DNI': p.identificationNumber,
      'Fecha de Ingreso': p.admissionDate,
      'Área': p.area?.name || '',
      'Cama': p.bed?.number || ''
    }));

    // Preparar fechas
    const prepared = this.exportService.prepareDataForExport(data, ['Fecha de Ingreso']);

    this.exportService.exportToExcel(prepared, {
      filename: `pacientes-${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Pacientes'
    });
  }
}
```

```html
<!-- Template -->
<button (click)="exportToCSV()" class="neuro-button">
  📥 Exportar CSV
</button>

<button (click)="exportToExcel()" class="neuro-button">
  📊 Exportar Excel
</button>
```

## Valores Anidados

El servicio soporta valores anidados usando notación de punto:

```typescript
const data = [
  { 
    user: { 
      name: 'Juan',
      contact: { email: 'juan@example.com' }
    }
  }
];

// Los headers pueden usar notación de punto
this.exportService.exportToCSV(data, {
  headers: ['user.name', 'user.contact.email']
});
```

## Manejo de Errores

El servicio lanza un error si no hay datos:

```typescript
try {
  this.exportService.exportToCSV([]);
} catch (error) {
  console.error('Error:', error.message); // "No hay datos para exportar"
}
```

## Testing

Ver `export.service.spec.ts` para ejemplos de tests unitarios.

## Notas

- Los archivos CSV incluyen BOM UTF-8 (`\ufeff`) para compatibilidad con Excel
- Los valores con comas, comillas o saltos de línea se escapan correctamente
- Si `xlsx` no está instalado, `exportToExcel` genera CSV con extensión `.xlsx`
