import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-dashboard-user-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-user-profile-modal.component.html',
  styleUrls: [
    './dashboard-user-profile-modal.component.css',
    '../../styles/admin-panel-responsive.css',
  ],
})
export class DashboardUserProfileModalComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  visible = false;
  saving = false;
  profileForm: { firstName: string; lastName: string; username: string; email: string; phone: string } = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
  };

  open(): void {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }
    this.profileForm = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone != null ? String(user.phone) : '',
    };
    this.saving = false;
    this.visible = true;
  }

  close(): void {
    this.visible = false;
    this.saving = false;
  }

  save(): void {
    const user = this.auth.currentUser();
    if (!user?.id) {
      return;
    }
    const firstName = this.profileForm.firstName.trim();
    const lastName = this.profileForm.lastName.trim();
    const username = this.profileForm.username.trim();
    const email = this.profileForm.email.trim();
    const phoneTrim = (this.profileForm.phone || '').trim();
    if (phoneTrim.length > 30) {
      this.toast.warning('El teléfono no puede superar 30 caracteres.');
      return;
    }
    if (!firstName || !lastName || !username || !email) {
      this.toast.warning('Completa todos los campos obligatorios.');
      return;
    }

    this.saving = true;
    this.auth
      .updateMyProfile({
        firstName,
        lastName,
        username,
        email,
        phone: phoneTrim.length > 0 ? phoneTrim : '',
      })
      .subscribe({
      next: () => {
        this.saving = false;
        this.visible = false;
        this.toast.success('Información personal actualizada');
      },
      error: (error) => {
        this.saving = false;
        const msg =
          error?.error?.message || error?.message || 'No se pudo actualizar tu información';
        this.toast.error(msg);
      },
    });
  }
}
