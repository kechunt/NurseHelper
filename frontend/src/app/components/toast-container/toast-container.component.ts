import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastComponent } from '../toast/toast.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
