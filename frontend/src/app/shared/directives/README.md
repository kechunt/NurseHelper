# DebounceDirective

Directiva reutilizable para agregar debounce a eventos de input.

## Características

- ✅ Debounce configurable en tiempo
- ✅ Solo emite valores distintos (`distinctUntilChanged`)
- ✅ Limpieza automática de suscripciones
- ✅ Compatible con Angular Reactive Forms

## Uso

### Importación

```typescript
import { DebounceDirective } from '@shared/directives/debounce.directive';
```

### En el componente

```typescript
export class SearchComponent {
  searchTerm = '';

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.performSearch(value);
  }

  performSearch(term: string): void {
    // Lógica de búsqueda
  }
}
```

### En el template

```html
<input 
  appDebounce
  [debounceTime]="300"
  (debounced)="onSearchInput($event)"
  type="text"
  placeholder="Buscar..."
/>
```

## API

### Inputs

| Propiedad | Tipo | Descripción | Por defecto |
|-----------|------|-------------|-------------|
| `debounceTime` | `number` | Tiempo de debounce en milisegundos | `300` |

### Outputs

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `debounced` | `EventEmitter<string>` | Emitido después del tiempo de debounce con el valor del input |

## Ejemplo Completo

```typescript
// Componente
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export class PatientsSearchComponent implements OnInit, OnDestroy {
  searchTerm = '';
  patients: Patient[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Opción 1: Usar la directiva (recomendado)
    // Solo usar el evento (debounced) en el template
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.filterPatients(value);
  }

  filterPatients(term: string): void {
    // Lógica de filtrado
    this.patients = this.allPatients.filter(p => 
      p.name.toLowerCase().includes(term.toLowerCase())
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

```html
<!-- Template -->
<input 
  appDebounce
  [debounceTime]="300"
  (debounced)="onSearchInput($event)"
  type="text"
  placeholder="Buscar pacientes..."
  class="neuro-input"
/>
```

## Beneficios

1. **Rendimiento**: Reduce llamadas innecesarias mientras el usuario escribe
2. **UX**: Búsqueda más fluida sin lag
3. **Eficiencia**: Menos carga en el servidor/cliente

## Testing

Ver `debounce.directive.spec.ts` para ejemplos de tests unitarios.

## Notas

- La directiva usa `distinctUntilChanged` internamente, por lo que solo emite si el valor cambió
- La suscripción se limpia automáticamente cuando el componente se destruye
- Compatible con inputs de tipo `text`, `search`, `email`, etc.
