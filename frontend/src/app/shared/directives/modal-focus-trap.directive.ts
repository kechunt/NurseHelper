import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  inject,
} from '@angular/core';

/**
 * Mantiene el foco (Tab / Mayús+Tab) dentro del host y enfoca el primer control al abrir.
 * Pensado para contenedores `role="dialog"` de modales neumórficos.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Directive({
  selector: '[appModalFocusTrap]',
  standalone: true,
})
export class ModalFocusTrapDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private previousActive: HTMLElement | null = null;

  @HostBinding('attr.tabindex')
  readonly hostTabindex = '-1';

  ngAfterViewInit(): void {
    const active = document.activeElement;
    this.previousActive = active instanceof HTMLElement ? active : null;
    queueMicrotask(() => this.focusInitial());
  }

  ngOnDestroy(): void {
    const prev = this.previousActive;
    queueMicrotask(() => prev?.focus());
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const root = this.host.nativeElement;
    const items = this.listFocusable();
    if (items.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === root || !root.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusInitial(): void {
    const root = this.host.nativeElement;
    const items = this.listFocusable();
    if (items.length > 0) {
      items[0].focus();
    } else {
      root.focus();
    }
  }

  private listFocusable(): HTMLElement[] {
    const root = this.host.nativeElement;
    const nodes = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
    return nodes.filter((el) => this.isProbablyVisible(el));
  }

  private isProbablyVisible(el: HTMLElement): boolean {
    if (el.hasAttribute('hidden')) {
      return false;
    }
    if (!el.getClientRects().length) {
      return false;
    }
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    return true;
  }
}
