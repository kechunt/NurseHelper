import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DebounceDirective } from '../../../shared/directives/debounce.directive';

@Component({
  selector: 'app-nurse-dashboard-header-search',
  standalone: true,
  imports: [CommonModule, FormsModule, DebounceDirective],
  templateUrl: './nurse-dashboard-header-search.component.html',
  styleUrl: './nurse-dashboard-header-search.component.css',
})
export class NurseDashboardHeaderSearchComponent {
  @Output() readonly debounced = new EventEmitter<string>();
}
