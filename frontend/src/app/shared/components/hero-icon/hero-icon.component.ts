import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type HeroIconVariant = 'outline' | 'solid';

@Component({
  selector: 'app-hero-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="hero-icon"
      [style.--hero-icon-url]="iconUrl"
      [style.width.px]="size"
      [style.height.px]="size"
      [attr.aria-hidden]="ariaLabel ? null : 'true'"
      [attr.role]="ariaLabel ? 'img' : null"
      [attr.aria-label]="ariaLabel || null"
    ></span>
  `,
  styles: [
    `
      .hero-icon {
        display: inline-block;
        background: currentColor;
        -webkit-mask-image: var(--hero-icon-url);
        mask-image: var(--hero-icon-url);
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
        -webkit-mask-size: contain;
        mask-size: contain;
        flex: 0 0 auto;
      }
    `,
  ],
})
export class HeroIconComponent {
  /** Nombre del archivo sin `.svg` (p.ej. `chart-bar`, `printer`). */
  @Input({ required: true }) name!: string;
  @Input() variant: HeroIconVariant = 'outline';
  @Input() size = 18;
  /** Si se proporciona, el icono se vuelve accesible (role img). */
  @Input() ariaLabel: string | null = null;

  get iconUrl(): string {
    const safeName = String(this.name || '').trim();
    const v = this.variant === 'solid' ? 'solid' : 'outline';
    return `url('/heroicons/24/${v}/${safeName}.svg')`;
  }
}

