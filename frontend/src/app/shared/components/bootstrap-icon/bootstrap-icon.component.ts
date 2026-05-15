import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { resolveBootstrapIconClass } from './bootstrap-icon.map';

@Component({
  selector: 'app-bootstrap-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <i
      class="bi nh-bootstrap-icon"
      [ngClass]="iconClass"
      [style.font-size.px]="size"
      [attr.aria-hidden]="ariaLabel ? null : 'true'"
      [attr.role]="ariaLabel ? 'img' : null"
      [attr.aria-label]="ariaLabel || null"
    ></i>
  `,
  styles: [
    `
      .nh-bootstrap-icon {
        display: inline-block;
        line-height: 1;
        vertical-align: -0.125em;
        flex: 0 0 auto;
      }
    `,
  ],
})
export class BootstrapIconComponent {
  /** Nombre legacy o clase Bootstrap sin prefijo `bi-` (p. ej. `bell`, `chart-bar`). */
  @Input({ required: true }) name!: string;
  @Input() size = 18;
  @Input() ariaLabel: string | null = null;

  get iconClass(): string {
    return resolveBootstrapIconClass(this.name);
  }
}
