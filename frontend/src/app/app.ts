import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmationWrapperComponent } from './components/confirmation-wrapper/confirmation-wrapper.component';
import { LoadingService } from './services/loading.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ToastContainerComponent, LoadingSpinnerComponent, ConfirmationWrapperComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('NurseHelper');
  private originalAlert: ((message?: any) => void) | null = null;

  constructor(
    private router: Router,
    public loadingService: LoadingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.patchNativeAlertForAdmin();
  }

  private patchNativeAlertForAdmin(): void {
    if (this.originalAlert) {
      return;
    }

    this.originalAlert = window.alert.bind(window);

    window.alert = (message?: any): void => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      const normalized = text.replace(/\n+/g, ' ').trim();
      const onAdminRoute = this.router.url.includes('/admin');

      if (!onAdminRoute) {
        this.originalAlert?.(message);
        return;
      }

      if (/^error/i.test(normalized)) {
        this.toastService.error(normalized);
        return;
      }

      if (/^advertencia/i.test(normalized) || /^warning/i.test(normalized)) {
        this.toastService.warning(normalized);
        return;
      }

      this.toastService.info(normalized);
    };
  }
}
