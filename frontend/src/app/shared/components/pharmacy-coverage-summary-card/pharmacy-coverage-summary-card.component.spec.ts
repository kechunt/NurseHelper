import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PharmacyCoverageSummaryCardComponent } from './pharmacy-coverage-summary-card.component';
import { PharmacyService } from '../../../services/pharmacy.service';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

describe('PharmacyCoverageSummaryCardComponent', () => {
  let fixture: ComponentFixture<PharmacyCoverageSummaryCardComponent>;

  const pharmacyMock = {
    getPharmacyShiftAttendanceSummary: jasmine
      .createSpy('getPharmacyShiftAttendanceSummary')
      .and.returnValue(of({ shifts: [] })),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [PharmacyCoverageSummaryCardComponent],
      providers: [{ provide: PharmacyService, useValue: pharmacyMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PharmacyCoverageSummaryCardComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone mensaje de error de carga localizable', () => {
    expect(fixture.componentInstance.pharmacyCoverageErrLoad).toContain('cobertura');
  });

  it('tras load exitoso deja loading en false', () => {
    expect(fixture.componentInstance.loading).toBe(false);
    expect(pharmacyMock.getPharmacyShiftAttendanceSummary).toHaveBeenCalled();
  });
});

describe('PharmacyCoverageSummaryCardComponent (error de carga)', () => {
  const pharmacyFailMock = {
    getPharmacyShiftAttendanceSummary: jasmine
      .createSpy('getPharmacyShiftAttendanceSummary')
      .and.returnValue(throwError(() => ({}))),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [PharmacyCoverageSummaryCardComponent],
      providers: [{ provide: PharmacyService, useValue: pharmacyFailMock }],
    }).compileComponents();
  });

  it('asigna mensaje localizado cuando falla el servicio', () => {
    const f = TestBed.createComponent(PharmacyCoverageSummaryCardComponent);
    f.detectChanges();
    expect(f.componentInstance.error).toContain('cobertura');
  });
});
