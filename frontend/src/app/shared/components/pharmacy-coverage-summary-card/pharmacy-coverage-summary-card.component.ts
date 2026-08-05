import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PharmacyService,
  PharmacyShiftCoverageSummaryShift,
} from '../../../services/pharmacy.service';
import { BootstrapIconComponent } from '../bootstrap-icon/bootstrap-icon.component';
import { formatLocalDateIsoYmd } from '../../../components/nurse-dashboard/nurse-dashboard-local-date.helpers';

@Component({
  selector: 'app-pharmacy-coverage-summary-card',
  standalone: true,
  imports: [CommonModule, FormsModule, BootstrapIconComponent],
  templateUrl: './pharmacy-coverage-summary-card.component.html',
  styleUrl: './pharmacy-coverage-summary-card.component.css',
})
export class PharmacyCoverageSummaryCardComponent implements OnInit {
  coverageDate = formatLocalDateIsoYmd(new Date());
  shifts: PharmacyShiftCoverageSummaryShift[] = [];
  loading = false;
  error: string | null = null;

  readonly pharmacyCoverageErrLoad = $localize`:@@pharmacyCoverageCard.errLoad:No se pudo cargar la cobertura de farmacia`;

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
        this.error = err?.error?.message || this.pharmacyCoverageErrLoad;
      },
    });
  }

  onDateChange(): void {
    this.load();
  }
}
