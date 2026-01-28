import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';
import { ConfirmationService } from '../../services/confirmation.service';
import { Subscription } from 'rxjs';

/**
 * Componente wrapper para mostrar modales de confirmación globalmente
 * Se integra automáticamente con ConfirmationService
 */
@Component({
  selector: 'app-confirmation-wrapper',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
  template: `
    <app-confirmation-modal
      [show]="showModal"
      [title]="modalData?.title || 'Confirmar acción'"
      [message]="modalData?.message || ''"
      [confirmText]="modalData?.confirmText || 'Confirmar'"
      [cancelText]="modalData?.cancelText || 'Cancelar'"
      [type]="modalData?.type || 'info'"
      (confirmed)="handleConfirm()"
      (cancelled)="handleCancel()"
      (closed)="handleClose()"
    ></app-confirmation-modal>
  `,
})
export class ConfirmationWrapperComponent implements OnInit, OnDestroy {
  showModal = false;
  modalData?: any;
  private resolveFn?: (value: boolean) => void;
  private subscription?: Subscription;

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit(): void {
    this.subscription = this.confirmationService.getConfirmation().subscribe((data) => {
      this.modalData = data;
      this.resolveFn = data.resolve;
      this.showModal = true;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  handleConfirm(): void {
    if (this.resolveFn) {
      this.resolveFn(true);
    }
    this.showModal = false;
  }

  handleCancel(): void {
    if (this.resolveFn) {
      this.resolveFn(false);
    }
    this.showModal = false;
  }

  handleClose(): void {
    if (this.resolveFn) {
      this.resolveFn(false);
    }
    this.showModal = false;
  }
}
