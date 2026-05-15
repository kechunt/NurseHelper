import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Estado vacío compacto para listas de roles en gestión de usuarios. */
@Component({
  selector: 'app-admin-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-empty-state.component.html',
  styleUrl: './admin-empty-state.component.css',
})
export class AdminEmptyStateComponent {
  @Input({ required: true }) message!: string;
}
