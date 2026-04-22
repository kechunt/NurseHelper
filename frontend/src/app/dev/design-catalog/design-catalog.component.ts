import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DESIGN_CATALOG_SNIPPETS } from './design-catalog.snippets';

/**
 * Catálogo visual de neumorfismo para QA. No enlazar desde la UI de producción.
 * Abrir en el navegador: /design-catalog
 */
@Component({
  selector: 'app-design-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './design-catalog.component.html',
  styleUrls: ['./design-catalog.component.css'],
})
export class DesignCatalogComponent {
  protected readonly snip = DESIGN_CATALOG_SNIPPETS;
}
