import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardNavigationDirective } from '../../directives/keyboard-navigation.directive';
import { ModalFocusTrapDirective } from '../../shared/directives/modal-focus-trap.directive';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, KeyboardNavigationDirective, ModalFocusTrapDirective],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.css',
})
export class ConfirmationModalComponent {
  @Input() title: string = $localize`:@@confirmationModal.defaultTitle:Confirmar acción`;
  @Input() message: string = $localize`:@@confirmationModal.defaultMessage:¿Estás seguro de realizar esta acción?`;
  @Input() confirmText: string = $localize`:@@confirmationModal.defaultConfirmLabel:Confirmar`;
  @Input() cancelText: string = $localize`:@@confirmationModal.defaultCancelLabel:Cancelar`;
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
