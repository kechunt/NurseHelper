import { Injectable, InjectionToken, inject, signal } from '@angular/core';

export interface DashboardTabStateConfig {
  readonly storageKey: string;
  /** Claves de pestaña permitidas (mismo orden que la barra si se usa para teclado). */
  readonly allowedTabs: readonly string[];
  /** Pestaña por defecto si no hay valor en `localStorage`. */
  readonly defaultTab?: string;
}

export const DASHBOARD_TAB_STATE_CONFIG = new InjectionToken<DashboardTabStateConfig>(
  'DashboardTabStateConfig'
);

/**
 * Estado de pestañas con persistencia en `localStorage` y conjunto de pestañas ya visitadas
 * (para montar una vez y ocultar con `[hidden]`).
 */
@Injectable()
export class DashboardTabStateService {
  private readonly config = inject(DASHBOARD_TAB_STATE_CONFIG);
  private readonly allowed = new Set(this.config.allowedTabs);
  /** Siempre incluye `overview` para poder montar el panel inicial una vez. */
  private readonly visited = new Set<string>(['overview']);

  readonly activeTab = signal<string>(this.config.defaultTab ?? 'overview');

  constructor() {
    this.restoreFromStorage();
  }

  hasVisitedTab(tab: string): boolean {
    return this.visited.has(tab);
  }

  setActiveTab(tab: string): void {
    if (!this.allowed.has(tab)) {
      return;
    }
    this.activeTab.set(tab);
    this.visited.add(tab);
    localStorage.setItem(this.config.storageKey, tab);
  }

  /** Restaura desde `localStorage` sin persistir de nuevo (útil si el constructor ya corrió). */
  restoreFromStorage(): void {
    const fallback = this.config.defaultTab ?? 'overview';
    const saved = localStorage.getItem(this.config.storageKey);
    const next = saved && this.allowed.has(saved) ? saved : fallback;
    this.activeTab.set(next);
    this.visited.add(next);
  }
}
