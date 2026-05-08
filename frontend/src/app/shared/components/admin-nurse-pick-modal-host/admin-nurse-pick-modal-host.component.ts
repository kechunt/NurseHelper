import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNursePickModalService } from '../../../services/admin-nurse-pick-modal.service';

@Component({
  selector: 'app-admin-nurse-pick-modal-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-nurse-pick-modal-host.component.html',
  styleUrl: './admin-nurse-pick-modal-host.component.css',
})
export class AdminNursePickModalHostComponent {
  constructor(readonly nursePick: AdminNursePickModalService) {}

  onBackdrop(): void {
    if (this.nursePick.vm.open) {
      this.nursePick.cancelSelection();
    }
  }
}
