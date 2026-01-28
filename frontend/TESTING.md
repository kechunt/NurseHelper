# Guía de Testing - Frontend

Esta guía explica cómo ejecutar y escribir tests para el frontend de NurseHelper.

## Estructura de Testing

El proyecto usa:
- **Jasmine** + **Karma** para tests unitarios
- **Playwright** para tests end-to-end (E2E)

## Ejecutar Tests

### Tests Unitarios

```bash
# Ejecutar todos los tests unitarios
npm test

# Ejecutar en modo watch (se re-ejecutan al cambiar archivos)
npm run test:watch

# Ejecutar con cobertura de código
npm run test:coverage
```

### Tests E2E

```bash
# Ejecutar tests E2E
npm run e2e

# Ejecutar con UI interactiva
npm run e2e:ui

# Ejecutar en modo headed (con navegador visible)
npm run e2e:headed
```

## Estructura de Archivos de Test

Los archivos de test deben seguir esta convención:
- Tests unitarios: `*.spec.ts` (junto al componente/servicio)
- Tests E2E: `e2e/**/*.spec.ts`

## Escribir Tests Unitarios

### Ejemplo: Componente

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';
import { MyService } from './my.service';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let service: jasmine.SpyObj<MyService>;

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('MyService', ['getData']);

    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        { provide: MyService, useValue: serviceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(MyService) as jasmine.SpyObj<MyService>;
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería cargar datos al inicializar', () => {
    const mockData = [{ id: 1, name: 'Test' }];
    service.getData.and.returnValue(of(mockData));

    component.ngOnInit();

    expect(service.getData).toHaveBeenCalled();
    expect(component.data).toEqual(mockData);
  });
});
```

### Ejemplo: Directiva

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebounceDirective } from './debounce.directive';
import { Component } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';

@Component({
  template: `<input appDebounce (debounced)="onDebounced($event)" />`,
  standalone: true,
  imports: [DebounceDirective]
})
class TestComponent {
  value = '';
  onDebounced(v: string) { this.value = v; }
}

describe('DebounceDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  it('debería emitir después del debounce', fakeAsync(() => {
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'test';
    input.dispatchEvent(new Event('input'));

    expect(component.value).toBe('');
    
    tick(300);
    
    expect(component.value).toBe('test');
  }));
});
```

### Ejemplo: Servicio

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MyService]
    });

    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener datos', () => {
    const mockData = [{ id: 1, name: 'Test' }];

    service.getData().subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
```

## Tests E2E con Playwright

### Ejemplo Básico

```typescript
import { test, expect } from '@playwright/test';

test('debería hacer login correctamente', async ({ page }) => {
  await page.goto('http://localhost:4200/login');
  
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

## Mejores Prácticas

### 1. Aislar Tests

Cada test debe ser independiente y no depender de otros tests.

```typescript
// ❌ Mal
it('test 1', () => {
  component.data = [1, 2, 3];
});

it('test 2', () => {
  expect(component.data.length).toBe(3); // Depende de test 1
});

// ✅ Bien
it('test 1', () => {
  component.data = [1, 2, 3];
  expect(component.data.length).toBe(3);
});

it('test 2', () => {
  component.data = [1, 2, 3]; // Setup independiente
  expect(component.data.length).toBe(3);
});
```

### 2. Usar Mocks y Spies

```typescript
// Mock de servicio
const serviceSpy = jasmine.createSpyObj('MyService', ['method1', 'method2']);
serviceSpy.method1.and.returnValue(of(mockData));
```

### 3. Testear Comportamiento, No Implementación

```typescript
// ❌ Mal - testea implementación
it('debería llamar a filter', () => {
  spyOn(component, 'filter');
  component.search('test');
  expect(component.filter).toHaveBeenCalled();
});

// ✅ Bien - testea comportamiento
it('debería filtrar resultados al buscar', () => {
  component.allItems = [{ name: 'Test' }, { name: 'Other' }];
  component.search('Test');
  expect(component.filteredItems).toEqual([{ name: 'Test' }]);
});
```

### 4. Usar `fakeAsync` y `tick` para Tests Asíncronos

```typescript
it('debería actualizar después de delay', fakeAsync(() => {
  component.delayedUpdate();
  expect(component.updated).toBeFalsy();
  
  tick(1000);
  
  expect(component.updated).toBeTruthy();
}));
```

## Cobertura de Código

El objetivo es mantener una cobertura mínima del 70%:

```bash
npm run test:coverage
```

Los reportes se generan en `coverage/`.

## Componentes con Tests

- ✅ `PaginationComponent` - `pagination.component.spec.ts`
- ✅ `DebounceDirective` - `debounce.directive.spec.ts`
- ✅ `ExportService` - `export.service.spec.ts`
- ✅ `LoginComponent` - `login.component.spec.ts`

## Recursos

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Playwright Documentation](https://playwright.dev/)
