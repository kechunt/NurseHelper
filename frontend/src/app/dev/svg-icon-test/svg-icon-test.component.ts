import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-svg-icon-test',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="svg-icon-test-root">
      <header class="svg-icon-test-header">
        <div>
          <h1>Heroicons · Prueba Neumórfica</h1>
          <p>
            Comparación visual usando la librería <strong>Heroicons</strong> (assets) en dos variantes:
            <strong>outline</strong> y <strong>solid</strong>, renderizados con <strong>mask CSS</strong> para poder
            colorearlos con <code>color</code> (flat) manteniendo el look neumórfico.
          </p>
        </div>
        <div class="svg-icon-test-header-actions">
          <a routerLink="/design-catalog" class="svg-icon-test-link">← Design catalog</a>
        </div>
      </header>

      <section class="svg-icon-test-grid" aria-label="Listado de iconos SVG">
        <div class="svg-icon-tile">
          <div class="svg-icon-row">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/document-text.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/document-text.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">CSV (document)</div>
        </div>

        <div class="svg-icon-tile">
          <div class="svg-icon-row">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/table-cells.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/table-cells.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Excel (table)</div>
        </div>

        <div class="svg-icon-tile">
          <div class="svg-icon-row">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/printer.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/printer.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Imprimir</div>
        </div>

        <div class="svg-icon-tile">
          <div class="svg-icon-row">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/user-group.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/user-group.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Coordinación</div>
        </div>

        <div class="svg-icon-tile">
          <div class="svg-icon-row">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/chart-bar.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/chart-bar.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Reportes</div>
        </div>

        <div class="svg-icon-tile svg-icon-tile--pending">
          <div class="svg-icon-row" style="color:#9c4221;">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/exclamation-circle.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/exclamation-circle.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Pendiente</div>
        </div>

        <div class="svg-icon-tile svg-icon-tile--present">
          <div class="svg-icon-row" style="color:#276749;">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/check-circle.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/check-circle.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Presente</div>
        </div>

        <div class="svg-icon-tile svg-icon-tile--late">
          <div class="svg-icon-row" style="color:#b7791f;">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/clock.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/clock.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Tarde</div>
        </div>

        <div class="svg-icon-tile svg-icon-tile--justified">
          <div class="svg-icon-row" style="color:#2b6cb0;">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/shield-check.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/shield-check.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Justificada</div>
        </div>

        <div class="svg-icon-tile svg-icon-tile--absent">
          <div class="svg-icon-row" style="color:#c53030;">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/x-circle.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/x-circle.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Ausente</div>
        </div>

        <div class="svg-icon-tile svg-icon-tile--missing">
          <div class="svg-icon-row" style="color:#9f7aea;">
            <span class="icon-mask icon-mask--outline" style="--icon-url: url('/heroicons/24/outline/exclamation-triangle.svg')"></span>
            <span class="icon-mask icon-mask--solid" style="--icon-url: url('/heroicons/24/solid/exclamation-triangle.svg')"></span>
          </div>
          <div class="svg-icon-tile-label">Falta</div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .svg-icon-test-root {
        padding: 2rem;
        background: #e0e5ec;
        min-height: 100%;
        color: #4a5568;
      }

      .svg-icon-test-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .svg-icon-test-header h1 {
        margin: 0 0 0.35rem;
        font-size: 1.7rem;
        font-weight: 700;
      }

      .svg-icon-test-header p {
        margin: 0;
        color: #718096;
        max-width: 62ch;
        line-height: 1.45;
      }

      .svg-icon-test-header-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .svg-icon-test-link {
        text-decoration: none;
        padding: 8px 14px;
        border-radius: 999px;
        background: #e0e5ec;
        color: #4a5568;
        box-shadow: 6px 6px 12px #bebebe, -6px -6px 12px #ffffff;
        border: 1px solid rgba(174, 174, 192, 0.2);
        font-weight: 700;
        font-size: 0.9rem;
      }

      .svg-icon-test-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 1rem;
      }

      .svg-icon-tile {
        background: #e0e5ec;
        border-radius: 18px;
        padding: 1.05rem 1rem 1.1rem;
        border: 1px solid rgba(174, 174, 192, 0.22);
        box-shadow: 10px 10px 20px #bebebe, -10px -10px 20px #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
        min-height: 160px;
      }

      .svg-icon-tile:active {
        box-shadow: inset 10px 10px 20px #bebebe, inset -10px -10px 20px #ffffff;
      }

      .svg-icon {
        width: 46px;
        height: 46px;
        color: #4a5568;
      }

      .svg-icon-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
      }

      .icon-mask {
        width: 46px;
        height: 46px;
        display: inline-block;
        background: currentColor;
        -webkit-mask-image: var(--icon-url);
        mask-image: var(--icon-url);
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
        -webkit-mask-size: contain;
        mask-size: contain;
      }

      .icon-mask--outline {
        opacity: 0.92;
      }

      .icon-mask--solid {
        opacity: 0.62;
      }

      .svg-icon-tile-label {
        font-size: 0.92rem;
        font-weight: 800;
        color: #4a5568;
        text-align: center;
      }

      .svg-icon-tile--present {
        box-shadow: 12px 12px 24px rgba(39, 102, 73, 0.18), -12px -12px 24px #ffffff;
      }
      .svg-icon-tile--late {
        box-shadow: 12px 12px 24px rgba(183, 119, 31, 0.18), -12px -12px 24px #ffffff;
      }
      .svg-icon-tile--justified {
        box-shadow: 12px 12px 24px rgba(43, 108, 179, 0.18), -12px -12px 24px #ffffff;
      }
      .svg-icon-tile--absent {
        box-shadow: 12px 12px 24px rgba(197, 48, 48, 0.18), -12px -12px 24px #ffffff;
      }
      .svg-icon-tile--missing {
        box-shadow: 12px 12px 24px rgba(159, 122, 234, 0.22), -12px -12px 24px #ffffff;
      }
      .svg-icon-tile--pending {
        box-shadow: 12px 12px 24px rgba(156, 66, 33, 0.18), -12px -12px 24px #ffffff;
      }
    `,
  ],
})
export class SvgIconTestComponent {}
