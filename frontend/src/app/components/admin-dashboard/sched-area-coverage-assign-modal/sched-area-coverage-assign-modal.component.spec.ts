import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { User } from '../../../services/auth.service';
import { SchedAreaCoverageAssignModalComponent } from './sched-area-coverage-assign-modal.component';

describe('SchedAreaCoverageAssignModalComponent', () => {
  let fixture: ComponentFixture<SchedAreaCoverageAssignModalComponent>;

  const nurses: User[] = [
    { id: 1, username: 'ana', firstName: 'Ana', lastName: 'López', assignedAreaId: 2 } as User,
    { id: 2, username: 'bea', firstName: 'Beatriz', lastName: 'Ruiz', assignedAreaId: 3 } as User,
  ];

  function nurseRowLabel(nurse: User): string {
    return `${nurse.firstName} ${nurse.lastName} · Área ${nurse.assignedAreaId}`;
  }

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

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [SchedAreaCoverageAssignModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedAreaCoverageAssignModalComponent);
    fixture.componentRef.setInput('areaName', 'UCI');
    fixture.componentRef.setInput('shiftLabel', 'Matutino');
    fixture.componentRef.setInput('nurses', nurses);
    fixture.componentRef.setInput('selectedNurseIds', [1]);
    fixture.componentRef.setInput('defaultNurseIds', [1]);
    fixture.componentRef.setInput('nurseRowLabel', nurseRowLabel);
    fixture.detectChanges();
  });

  it('renderiza tabla de enfermeras', () => {
    const rows = fixture.nativeElement.querySelectorAll('.sched-area-coverage-table tbody tr');
    expect(rows.length).toBe(2);
  });

  it('muestra badge Sugerida para enfermeras por defecto', () => {
    const badges = fixture.nativeElement.querySelectorAll('.coverage-assign-nurse-badge');
    expect(badges.length).toBe(1);
    expect((badges[0] as HTMLElement).textContent?.toLowerCase()).toContain('sugerida');
  });

  it('emite save al pulsar Asignar al área', () => {
    spyOn(fixture.componentInstance.save, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-primary-neuro') as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.save.emit).toHaveBeenCalled();
  });

  it('emite toggleNurse al marcar checkbox', () => {
    spyOn(fixture.componentInstance.toggleNurse, 'emit');
    const checkbox = fixture.nativeElement.querySelector(
      '.sched-area-coverage-table tbody tr:nth-child(2) input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.toggleNurse.emit).toHaveBeenCalledWith({
      nurseId: 2,
      checked: true,
    });
  });
});
