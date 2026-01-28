import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardNavigationDirective } from '../../directives/keyboard-navigation.directive';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, KeyboardNavigationDirective],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.css',
})
export class ConfirmationModalComponent {
  @Input() title: string = 'Confirmar acción';
  @Input() message: string = '¿Estás seguro de realizar esta acción?';
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';
  @Input() type: 'danger' | 'warning' | 'info' = 'info';
  @Input() show: boolean = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  confirm(): void {
    this.confirmed.emit();
    this.close();
  }

  cancel(): void {
    this.cancelled.emit();
    this.close();
  }

  close(): void {
    this.show = false;
    this.closed.emit();
  }

  @HostListener('keydown.escape', ['$event'])
  handleEscape(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Escape' || keyboardEvent.code === 'Escape') {
      this.close();
    }
  }
}
