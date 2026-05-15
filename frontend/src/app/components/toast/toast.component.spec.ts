import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Toast } from '../../services/toast.service';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  const removeSpy = jasmine.createSpy('remove');

  const baseToast: Toast = { id: 'test-toast-xyz', message: 'Hola', type: 'info', duration: 0 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: ToastService, useValue: { remove: removeSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('toast', baseToast);
    fixture.detectChanges();
  });

  it('expone ids en raíz y botón cerrar', () => {
    expect(fixture.nativeElement.querySelector('#toast-item-test-toast-xyz')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#toast-test-toast-xyz-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#toast-test-toast-xyz-action-btn')).toBeNull();
  });

  it('con acción expone id del botón de acción', () => {
    fixture.componentRef.setInput('toast', {
      ...baseToast,
      action: { label: 'Deshacer', handler: () => {} },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#toast-test-toast-xyz-action-btn')).toBeTruthy();
  });
});
