# Catálogo de diseño y módulos — NurseHelper

Carpeta **aparte del código de producción** con tokens visuales, patrones HTML/CSS y snippets TypeScript para copiar y reutilizar. El diseño real vive en `frontend/src/app` y `frontend/src/styles.css`.

**Vista en vivo (Angular, solo QA):** con el frontend en marcha, abre la ruta oculta **`/design-catalog`** (no está enlazada en la navegación). Agrupa tablas (`neuro-table`, `shifts-table-neuro`, `unified-tasks-table`, `patients-table`), filtros, tarjetas (overview, `role-card`, `nurse-card`), turnos/resumen, farmacia, modales y fragmentos de código bajo cada bloque; los estilos se importan desde los `*.component.css` del proyecto (farmacia, usuarios, staff y nurse al final del bundle de estilos del catálogo).

## Contenido de esta carpeta

| Ruta | Propósito |
|------|-----------|
| `css/design-tokens.css` | Variables CSS (`--nh-*`) alineadas con el neumorfismo del proyecto |
| `css/neuro-base.css` | Clases base `.neuro-input`, `.neuro-btn`, `.neuro-card`, `.error-message` |
| `snippets/*.ts` | Plantillas e imports usados en componentes standalone |
| `html/*.html` | Fragmentos de plantilla (formularios, tabla, paginación, debounce) |

## Módulos npm (frontend)

Proyecto Angular 20 **sin NgModules**: todo es **standalone** (`standalone: true`).

| Paquete | Uso en el diseño / app |
|---------|----------------------|
| `@angular/core` | Componentes, `signal`, `inject`, DI |
| `@angular/common` | `CommonModule` → `*ngIf`, `*ngFor`, `async`, `date`, pipes |
| `@angular/forms` | `FormsModule` (`ngModel`), `ReactiveFormsModule` (formularios reactivos) |
| `@angular/router` | `RouterModule`, `RouterOutlet`, `provideRouter`, `loadComponent`, guards |
| `@angular/platform-browser` | `bootstrapApplication` en `main.ts` |
| `@angular/platform-browser-dynamic` | arranque dinámico (CLI) |
| `@angular/common/http` | `provideHttpClient`, `withInterceptors`, APIs |
| `rxjs` | Observables en servicios e interceptores |
| `xlsx` | Exportación Excel (`shared/services/export.service.ts`) |
| `tslib`, `zone.js` | runtime Angular |

**Código mínimo de arranque:** ver `snippets/app-config.providers.ts` y el archivo real `frontend/src/app/app.config.ts`.

## Módulos funcionales (rutas / pantallas)

Rutas definidas en `frontend/src/app/app.routes.ts`:

| Ruta | Componente | Imports típicos |
|------|------------|-----------------|
| `/login` | `LoginComponent` | `CommonModule`, `FormsModule`, `RouterModule` |
| `/register` | `RegisterComponent` | + `TermsModalComponent` |
| `/verify-email` | `VerifyEmailComponent` | `CommonModule`, `FormsModule`, `RouterModule` |
| `/admin` | `AdminDashboardComponent` (lazy) | `CommonModule`, `RouterModule` + hijos admin |
| `/supervisor` | `SupervisorDashboardComponent` (lazy) | ver fichero del componente |
| `/nurse-dashboard` | `NurseDashboardComponent` (lazy) | `CommonModule`, `FormsModule` |
| `/pharmacy` | `PharmacyDashboardComponent` (lazy) | `CommonModule`, `FormsModule` |
| `/use-case-diagram` | `UseCaseDiagramComponent` (lazy) | `CommonModule` |

Matrices de `imports` por tipo de pantalla: **`snippets/imports-por-pantalla.ts`**.

## Piezas de UI reutilizables (código fuente)

| Pieza | Ubicación en el repo |
|-------|----------------------|
| Paginación | `frontend/src/app/shared/components/pagination/` |
| Toast (duplicado legacy en `components/toast` y `shared/components/toast`; contenedor usa `components/toast`) | `toast-container`, `toast.service` |
| Spinner global | `frontend/src/app/components/loading-spinner/` |
| Confirmación modal + wrapper | `confirmation-modal`, `confirmation-wrapper`, `confirmation.service` |
| Tablas / botones acción compactos | `frontend/src/app/shared/styles/table-actions-normalized.css` (importado en `styles.css`) |
| Export Excel | `frontend/src/app/shared/services/export.service.ts` |
| Guards | `frontend/src/app/guards/auth.guard.ts` |
| Interceptor JWT | `frontend/src/app/interceptors/auth.interceptor.ts` |

Ejemplos de uso: `snippets/toast-usage.example.ts`, `confirmation-usage.example.ts`, `loading-service.example.ts`, `html/pagination-usage.example.html`.

## Directivas

| Directiva | Archivo |
|-----------|---------|
| `DebounceDirective` | `frontend/src/app/shared/directives/debounce.directive.ts` |
| `KeyboardNavigationDirective` | `frontend/src/app/directives/keyboard-navigation.directive.ts` |
| `LoadingDirective` | `frontend/src/app/directives/loading.directive.ts` |
| `AriaLabelsDirective` | `frontend/src/app/directives/aria-labels.directive.ts` |

Resumen en `snippets/directives-usage.example.ts`.

## Estilos globales

- `frontend/src/styles.css` — reset, body, scrollbar, accesibilidad, import de tablas.
- Componentes grandes (pharmacy, schedules) amplían el mismo lenguaje **neuro** (`.neuro-table`, `.neuro-btn-icon`, `.btn-primary-neuro`, etc.).

Para nuevas pantallas: importa `css/design-tokens.css` y `css/neuro-base.css` desde esta carpeta **o** copia variables a tu `styles.css`; para tablas idénticas al resto del proyecto, mantén el `@import` de `table-actions-normalized.css`.

## Backend (referencia)

No usa módulos Nest; dependencias relevantes: **Express**, **TypeORM**, **class-validator**, **helmet**, **JWT**, **Swagger**. No forma parte del sistema visual Angular, pero completa el “proyecto” si buscas APIs homogéneas.

---

**Nuevo componente standalone:** copia `snippets/standalone-component.template.ts`, ajusta selector/rutas de template y añade imports según `snippets/imports-por-pantalla.ts`.
