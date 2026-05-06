import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { designCatalogGuard } from './dev-tools.guard';
import { environment } from '../../environments/environment';

describe('designCatalogGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let productionBackup: boolean;

  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    productionBackup = environment.production;
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }],
    });
  });

  afterEach(() => {
    environment.production = productionBackup;
  });

  it('permite acceso cuando no es producción', () => {
    environment.production = false;
    TestBed.runInInjectionContext(() => {
      expect(designCatalogGuard(route, state)).toBeTrue();
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirige a /login y bloquea cuando es producción', () => {
    environment.production = true;
    TestBed.runInInjectionContext(() => {
      expect(designCatalogGuard(route, state)).toBeFalse();
    });
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
