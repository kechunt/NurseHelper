import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PharmacyService,
  PharmacyShiftCoverageSummaryShift,
} from '../../../services/pharmacy.service';
import { HeroIconComponent } from '../hero-icon/hero-icon.component';

function formatLocalDateIsoYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-pharmacy-coverage-summary-card',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroIconComponent],
  templateUrl: './pharmacy-coverage-summary-card.component.html',
  styleUrl: './pharmacy-coverage-summary-card.component.css',
})
export class PharmacyCoverageSummaryCardComponent implements OnInit {
  coverageDate = formatLocalDateIsoYmd(new Date());
  shifts: PharmacyShiftCoverageSummaryShift[] = [];
  loading = false;
  error: string | null = null;

  constructor(private pharmacyService: PharmacyService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const date = (this.coverageDate || '').trim();
    if (!date) {
      this.shifts = [];
      return;
    }
    this.loading = true;
    this.error = null;
    this.pharmacyService.getPharmacyShiftAttendanceSummary(date).subscribe({
      next: (res) => {
        this.shifts = res?.shifts ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.shifts = [];
        this.error = err?.error?.message || 'No se pudo cargar la cobertura de farmacia';
      },
    });
  }

  onDateChange(): void {
    this.load();
  }
}
