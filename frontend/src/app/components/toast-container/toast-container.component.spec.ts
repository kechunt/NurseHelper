import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Toast } from '../../services/toast.service';
import { ToastService } from '../../services/toast.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let toasts: ReturnType<typeof signal<Toast[]>>;

  beforeEach(async () => {
    toasts = signal<Toast[]>([]);
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [{ provide: ToastService, useValue: { toasts } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    fixture.detectChanges();
  });

  it('expone región #toast-container', () => {
    expect(fixture.nativeElement.querySelector('#toast-container')).toBeTruthy();
  });

  it('renderiza toasts con id estable por toast', () => {
    toasts.set([{ id: 'abc-1', message: 'M', type: 'warning' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#toast-item-abc-1')).toBeTruthy();
  });
});
