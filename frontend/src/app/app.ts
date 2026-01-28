import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmationWrapperComponent } from './components/confirmation-wrapper/confirmation-wrapper.component';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ToastContainerComponent, LoadingSpinnerComponent, ConfirmationWrapperComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('NurseHelper');

  constructor(
    private router: Router,
    public loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Verificar que el router esté funcionando (solo en desarrollo)
    if (!environment.production) {
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: any) => {
          console.log('📍 Navegación a:', event.url);
        });
    }
  }
}
