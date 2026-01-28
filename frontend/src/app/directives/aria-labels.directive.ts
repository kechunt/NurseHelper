import { Directive, Input, ElementRef, OnInit } from '@angular/core';

/**
 * Directiva para agregar ARIA labels automáticamente
 */
@Directive({
  selector: '[appAriaLabel]',
  standalone: true,
})
export class AriaLabelDirective implements OnInit {
  @Input() appAriaLabel?: string;
  @Input() appAriaDescribedBy?: string;
  @Input() appAriaLive?: 'polite' | 'assertive' | 'off';
  @Input() appAriaAtomic?: boolean;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    const element = this.el.nativeElement;

    if (this.appAriaLabel) {
      element.setAttribute('aria-label', this.appAriaLabel);
    }

    if (this.appAriaDescribedBy) {
      element.setAttribute('aria-describedby', this.appAriaDescribedBy);
    }

    if (this.appAriaLive) {
      element.setAttribute('aria-live', this.appAriaLive);
    }

    if (this.appAriaAtomic !== undefined) {
      element.setAttribute('aria-atomic', this.appAriaAtomic.toString());
    }
  }
}
