import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { Subscription } from 'rxjs';

/**
 * Directiva para mostrar/ocultar contenido basado en estado de loading
 * Uso: <div *appLoading="loadingService.isLoading()">Contenido</div>
 */
@Directive({
  selector: '[appLoading]',
  standalone: true,
})
export class LoadingDirective implements OnInit, OnDestroy {
  @Input() appLoading: boolean = false;
  @Input() appLoadingMessage: string = 'Cargando...';
  private subscription?: Subscription;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private updateView(): void {
    if (this.appLoading) {
      this.viewContainer.clear();
      // Mostrar spinner o mensaje de carga
    } else {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
