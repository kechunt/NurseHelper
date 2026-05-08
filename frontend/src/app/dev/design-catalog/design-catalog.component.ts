import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DESIGN_CATALOG_SNIPPETS } from './design-catalog.snippets';
import { HeroIconComponent } from '../../shared/components/hero-icon/hero-icon.component';

/**
 * Catálogo de patrones UI: importa los mismos CSS que producción para vista previa y normalización.
 * Solo desarrollo — ver designCatalogGuard. Ruta: /design-catalog
 */
@Component({
  selector: 'app-design-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroIconComponent],
  templateUrl: './design-catalog.component.html',
  styleUrls: ['./design-catalog.component.css'],
})
export class DesignCatalogComponent {
  protected readonly snip = DESIGN_CATALOG_SNIPPETS;
}
