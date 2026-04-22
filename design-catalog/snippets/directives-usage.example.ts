/**
 * Directivas standalone del proyecto — imports y uso breve.
 * Rutas bajo frontend/src/app/
 */

// DebounceDirective — shared/directives/debounce.directive.ts
// imports: [DebounceDirective]
// template: `<input appDebounce [debounceTime]="300" (debounced)="buscar($event)" />`

// KeyboardNavigationDirective — directives/keyboard-navigation.directive.ts
// imports: [KeyboardNavigationDirective]
// template: `<div appKeyboardNav="vertical">...</div>`  // 'horizontal' | 'vertical' | 'grid'

// LoadingDirective — directives/loading.directive.ts
// imports: [LoadingDirective]
// Implementación con TemplateRef; revisa el archivo para el patrón exacto (selector `[appLoading]`).

// AriaLabelsDirective — directives/aria-labels.directive.ts
// Revisa el archivo para el selector y @Inputs concretos del proyecto.
