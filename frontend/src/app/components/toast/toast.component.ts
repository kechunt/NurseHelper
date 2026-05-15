import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastType } from '../../services/toast.service';
import { BootstrapIconComponent } from '../../shared/components/bootstrap-icon/bootstrap-icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  @Input() toast!: Toast;

  constructor(private toastService: ToastService) {}

  close(): void {
    this.toastService.remove(this.toast.id);
  }

  handleAction(): void {
    if (this.toast.action) {
      this.toast.action.handler();
      this.close();
    }
  }

  getIconName(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'x-circle';
      case 'warning':
        return 'exclamation-triangle';
      case 'info':
        return 'exclamation-circle';
      default:
        return 'exclamation-circle';
    }
  }

  getAriaLabel(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'Notificación de éxito';
      case 'error':
        return 'Notificación de error';
      case 'warning':
        return 'Notificación de advertencia';
      case 'info':
        return 'Notificación informativa';
      default:
        return 'Notificación';
    }
  }
}
