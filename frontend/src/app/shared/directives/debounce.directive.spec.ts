import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebounceDirective } from './debounce.directive';
import { fakeAsync, tick } from '@angular/core/testing';

@Component({
  template: `
    <input 
      appDebounce 
      [debounceTime]="debounceTime"
      (debounced)="onDebounced($event)" 
      type="text" 
    />
  `,
  standalone: true,
  imports: [DebounceDirective]
})
class TestComponent {
  debounceTime = 300;
  debouncedValue = '';

  onDebounced(value: string): void {
    this.debouncedValue = value;
  }
}

describe('DebounceDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let inputElement: HTMLInputElement;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement.query(By.directive(DebounceDirective));
    inputElement = debugElement.nativeElement;
    fixture.detectChanges();
  });

  it('debería crear la directiva', () => {
    expect(debugElement).toBeTruthy();
  });

  it('debería emitir valor después del tiempo de debounce', fakeAsync(() => {
    inputElement.value = 'test';
    inputElement.dispatchEvent(new Event('input'));
    
    // No debería emitir inmediatamente
    expect(component.debouncedValue).toBe('');
    
    // Avanzar el tiempo de debounce
    tick(300);
    
    // Ahora debería emitir
    expect(component.debouncedValue).toBe('test');
  }));

  it('no debería emitir si el tiempo de debounce no ha pasado', fakeAsync(() => {
    inputElement.value = 'test';
    inputElement.dispatchEvent(new Event('input'));
    
    tick(150); // Menos que el debounceTime
    
    expect(component.debouncedValue).toBe('');
    
    tick(150); // Completar el debounceTime
    
    expect(component.debouncedValue).toBe('test');
  }));

  it('debería usar el tiempo de debounce personalizado', fakeAsync(() => {
    const f = TestBed.createComponent(TestComponent);
    f.componentInstance.debounceTime = 500;
    f.detectChanges();
    const inp = f.debugElement.query(By.directive(DebounceDirective)).nativeElement as HTMLInputElement;

    inp.value = 'test';
    inp.dispatchEvent(new Event('input'));

    tick(300);
    expect(f.componentInstance.debouncedValue).toBe('');

    tick(200);
    expect(f.componentInstance.debouncedValue).toBe('test');
  }));

  it('debería emitir solo valores distintos', fakeAsync(() => {
    inputElement.value = 'test';
    inputElement.dispatchEvent(new Event('input'));
    tick(300);
    
    expect(component.debouncedValue).toBe('test');
    
    // Mismo valor no debería emitir de nuevo
    inputElement.value = 'test';
    inputElement.dispatchEvent(new Event('input'));
    tick(300);
    
    // El valor debería seguir siendo 'test' (distinctUntilChanged)
    expect(component.debouncedValue).toBe('test');
    
    // Valor diferente sí debería emitir
    inputElement.value = 'test2';
    inputElement.dispatchEvent(new Event('input'));
    tick(300);
    
    expect(component.debouncedValue).toBe('test2');
  }));

  it('debería limpiar la suscripción al destruirse', () => {
    const directive = debugElement.injector.get(DebounceDirective);
    spyOn(directive['destroy$'], 'next');
    spyOn(directive['destroy$'], 'complete');
    
    fixture.destroy();
    
    expect(directive['destroy$'].next).toHaveBeenCalled();
    expect(directive['destroy$'].complete).toHaveBeenCalled();
  });
});
