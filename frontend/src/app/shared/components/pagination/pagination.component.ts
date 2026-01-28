import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationConfig {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent {
  @Input() config!: PaginationConfig;
  @Output() pageChange = new EventEmitter<number>();
  @Output() itemsPerPageChange = new EventEmitter<number>();

  get pages(): number[] {
    const pages: number[] = [];
    const total = this.config.totalPages;
    const current = this.config.currentPage;
    
    // Mostrar máximo 7 páginas
    let start = Math.max(1, current - 3);
    let end = Math.min(total, current + 3);
    
    // Ajustar si estamos cerca del inicio o final
    if (end - start < 6) {
      if (start === 1) {
        end = Math.min(total, start + 6);
      } else if (end === total) {
        start = Math.max(1, end - 6);
      }
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.config.totalPages && page !== this.config.currentPage) {
      this.pageChange.emit(page);
    }
  }

  previousPage(): void {
    if (this.config.currentPage > 1) {
      this.goToPage(this.config.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.config.currentPage < this.config.totalPages) {
      this.goToPage(this.config.currentPage + 1);
    }
  }

  onItemsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = parseInt(select.value, 10);
    this.itemsPerPageChange.emit(value);
  }

  get startItem(): number {
    return (this.config.currentPage - 1) * this.config.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.config.currentPage * this.config.itemsPerPage, this.config.totalItems);
  }
}
