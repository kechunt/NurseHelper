import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
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

  getIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
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
