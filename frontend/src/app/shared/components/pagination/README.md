# PaginationComponent

Componente reutilizable para paginación de tablas y listas.

## Características

- ✅ Paginación cliente-side flexible
- ✅ Configuración de items por página (10, 25, 50, 100)
- ✅ Navegación por páginas con números visibles
- ✅ Información de resultados (mostrando X - Y de Z)
- ✅ Diseño responsive y accesible
- ✅ Estilos neuro-mórficos consistentes

## Uso

### Importación

```typescript
import { PaginationComponent, PaginationConfig } from '@shared/components/pagination/pagination.component';
```

### En el componente

```typescript
export class MyComponent {
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalItems: 100,
    itemsPerPage: 25,
    totalPages: 4
  };

  onPageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.updatePaginatedData();
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.paginationConfig.itemsPerPage = itemsPerPage;
    this.paginationConfig.currentPage = 1;
    this.paginationConfig.totalPages = Math.ceil(
      this.paginationConfig.totalItems / itemsPerPage
    );
    this.updatePaginatedData();
  }

  updatePaginatedData(): void {
    const start = (this.paginationConfig.currentPage - 1) * this.paginationConfig.itemsPerPage;
    const end = start + this.paginationConfig.itemsPerPage;
    this.paginatedItems = this.filteredItems.slice(start, end);
  }
}
```

### En el template

```html
<app-pagination
  [config]="paginationConfig"
  (pageChange)="onPageChange($event)"
  (itemsPerPageChange)="onItemsPerPageChange($event)"
></app-pagination>
```

## API

### Inputs

| Propiedad | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `config` | `PaginationConfig` | Configuración de paginación | Sí |

### Outputs

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `pageChange` | `EventEmitter<number>` | Emitido cuando cambia la página |
| `itemsPerPageChange` | `EventEmitter<number>` | Emitido cuando cambia items por página |

### PaginationConfig

```typescript
interface PaginationConfig {
  currentPage: number;    // Página actual (1-indexed)
  totalItems: number;     // Total de items
  itemsPerPage: number;   // Items por página
  totalPages: number;     // Total de páginas calculado
}
```

## Accesibilidad

- ✅ ARIA labels en botones
- ✅ `aria-current="page"` en página actual
- ✅ `role="navigation"` en contenedor
- ✅ Navegación por teclado soportada

## Testing

Ver `pagination.component.spec.ts` para ejemplos de tests unitarios.

## Ejemplo Completo

```typescript
// Componente
export class PatientsListComponent {
  patients: Patient[] = [];
  paginatedPatients: Patient[] = [];
  
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 25,
    totalPages: 0
  };

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.patients = [...]; // Cargar datos
    this.paginationConfig.totalItems = this.patients.length;
    this.paginationConfig.totalPages = Math.ceil(
      this.paginationConfig.totalItems / this.paginationConfig.itemsPerPage
    );
    this.updatePagination();
  }

  updatePagination(): void {
    const start = (this.paginationConfig.currentPage - 1) * this.paginationConfig.itemsPerPage;
    const end = start + this.paginationConfig.itemsPerPage;
    this.paginatedPatients = this.patients.slice(start, end);
  }

  onPageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.updatePagination();
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.paginationConfig.itemsPerPage = itemsPerPage;
    this.paginationConfig.currentPage = 1;
    this.paginationConfig.totalPages = Math.ceil(
      this.paginationConfig.totalItems / itemsPerPage
    );
    this.updatePagination();
  }
}
```

```html
<!-- Template -->
<table>
  <tr *ngFor="let patient of paginatedPatients">
    <td>{{ patient.name }}</td>
  </tr>
</table>

<app-pagination
  [config]="paginationConfig"
  (pageChange)="onPageChange($event)"
  (itemsPerPageChange)="onItemsPerPageChange($event)"
></app-pagination>
```
