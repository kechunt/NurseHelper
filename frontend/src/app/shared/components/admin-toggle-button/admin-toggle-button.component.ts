import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-toggle-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-toggle-button.component.html',
  styleUrl: './admin-toggle-button.component.css',
})
export class AdminToggleButtonComponent {
  @Input() expanded = false;
  @Input() showChevron = false;
  @Input() labelShow = 'Mostrar';
  @Input() labelHide = 'Ocultar';

  @Output() readonly toggle = new EventEmitter<void>();

  onToggle(event: MouseEvent): void {
    event.stopPropagation();
    this.toggle.emit();
  }
}
