import { Directive, HostListener, ElementRef, Input } from '@angular/core';

/**
 * Directiva para mejorar navegación por teclado
 */
@Directive({
  selector: '[appKeyboardNav]',
  standalone: true,
})
export class KeyboardNavigationDirective {
  @Input() appKeyboardNav: 'horizontal' | 'vertical' | 'grid' = 'vertical';

  constructor(private el: ElementRef) {}

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(event.target as HTMLElement);

    if (currentIndex === -1) return;

    let nextIndex = -1;

    switch (event.key) {
      case 'ArrowDown':
        if (this.appKeyboardNav === 'vertical' || this.appKeyboardNav === 'grid') {
          event.preventDefault();
          nextIndex = currentIndex + 1;
        }
        break;

      case 'ArrowUp':
        if (this.appKeyboardNav === 'vertical' || this.appKeyboardNav === 'grid') {
          event.preventDefault();
          nextIndex = currentIndex - 1;
        }
        break;

      case 'ArrowRight':
        if (this.appKeyboardNav === 'horizontal' || this.appKeyboardNav === 'grid') {
          event.preventDefault();
          nextIndex = currentIndex + 1;
        }
        break;

      case 'ArrowLeft':
        if (this.appKeyboardNav === 'horizontal' || this.appKeyboardNav === 'grid') {
          event.preventDefault();
          nextIndex = currentIndex - 1;
        }
        break;

      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        nextIndex = focusableElements.length - 1;
        break;
    }

    if (nextIndex >= 0 && nextIndex < focusableElements.length) {
      focusableElements[nextIndex].focus();
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(this.el.nativeElement.querySelectorAll(selector));
  }
}
