import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NurseService } from './nurse.service';
import { environment } from '../../environments/environment';

describe('NurseService (caché panel)', () => {
  let service: NurseService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/nurse`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NurseService],
    });
    service = TestBed.inject(NurseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    service.clearNurseCaches();
  });

  it('getNurseStats reutiliza caché en la segunda llamada', () => {
    const stats = {
      assignedPatientsCount: 1,
      maxPatients: 8,
      pendingTasksCount: 0,
      medicationsToday: 0,
      assignedArea: 'A',
      assignedAreaId: 1,
    };

    let a: unknown;
    let b: unknown;
    service.getNurseStats().subscribe((v) => (a = v));
    service.getNurseStats().subscribe((v) => (b = v));

    const req = http.expectOne(`${base}/stats`);
    expect(req.request.params.has('refresh')).toBeFalse();
    req.flush(stats);

    expect(a).toEqual(stats);
    expect(b).toEqual(stats);
  });

  it('getNurseStats(true) envía refresh=1 y vuelve a pedir datos', () => {
    service.getNurseStats().subscribe();
    http.expectOne(`${base}/stats`).flush({
      assignedPatientsCount: 0,
      maxPatients: 8,
      pendingTasksCount: 0,
      medicationsToday: 0,
      assignedArea: null,
      assignedAreaId: null,
    });

    service.getNurseStats(true).subscribe();
    const refreshed = http.expectOne((r) => r.url === `${base}/stats` && r.params.get('refresh') === '1');
    refreshed.flush({
      assignedPatientsCount: 2,
      maxPatients: 8,
      pendingTasksCount: 1,
      medicationsToday: 0,
      assignedArea: 'B',
      assignedAreaId: 2,
    });
  });

  it('clearNursePrimaryCaches fuerza nueva petición de stats', () => {
    service.getNurseStats().subscribe();
    http.expectOne(`${base}/stats`).flush({
      assignedPatientsCount: 0,
      maxPatients: 8,
      pendingTasksCount: 0,
      medicationsToday: 0,
      assignedArea: null,
      assignedAreaId: null,
    });

    service.clearNursePrimaryCaches();
    service.getNurseStats().subscribe();
    http.expectOne(`${base}/stats`).flush({
      assignedPatientsCount: 1,
      maxPatients: 8,
      pendingTasksCount: 0,
      medicationsToday: 0,
      assignedArea: 'A',
      assignedAreaId: 1,
    });
  });

  it('checkInShift limpia cachés tras éxito', () => {
    service.getNurseStats().subscribe();
    http.expectOne(`${base}/stats`).flush({
      assignedPatientsCount: 0,
      maxPatients: 8,
      pendingTasksCount: 0,
      medicationsToday: 0,
      assignedArea: null,
      assignedAreaId: null,
    });

    service.checkInShift().subscribe();
    const req = http.expectOne(`${base}/check-in`);
    expect(req.request.method).toBe('POST');
    req.flush({
      message: 'ok',
      punctuality: 'on_time',
      punctualityLabel: 'A tiempo',
      context: { onDuty: false, canCheckIn: false },
    });

    service.getNurseStats().subscribe();
    http.expectOne(`${base}/stats`).flush({
      assignedPatientsCount: 0,
      maxPatients: 8,
      pendingTasksCount: 0,
      medicationsToday: 0,
      assignedArea: null,
      assignedAreaId: null,
    });
  });

  it('admitPatient hace POST al endpoint de admisión', () => {
    service
      .admitPatient({
        firstName: 'Ana',
        lastName: 'Pérez',
        bedId: null,
      })
      .subscribe();
    const req = http.expectOne(`${base}/patients/admit`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', patient: {}, bedNumber: null });
  });
});
