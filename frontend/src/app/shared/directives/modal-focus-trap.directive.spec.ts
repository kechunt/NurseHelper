import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalFocusTrapDirective } from './modal-focus-trap.directive';

@Component({
  standalone: true,
  imports: [ModalFocusTrapDirective],
  template: `
    <button type="button" #before class="before-btn">Antes</button>
    <div role="dialog" appModalFocusTrap class="trap" tabindex="-1">
      <button type="button" class="trap-a">A</button>
      <button type="button" class="trap-b">B</button>
    </div>
  `,
})
class ModalFocusTrapHostComponent {}

describe('ModalFocusTrapDirective', () => {
  let fixture: ComponentFixture<ModalFocusTrapHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalFocusTrapHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalFocusTrapHostComponent);
    const beforeBtn = fixture.nativeElement.querySelector('.before-btn') as HTMLButtonElement;
    beforeBtn.focus();
    fixture.detectChanges();
  });

  it('al montar enfoca el primer elemento enfocable del diálogo', (done) => {
    queueMicrotask(() => {
      const first = fixture.nativeElement.querySelector('.trap-a') as HTMLElement;
      expect(document.activeElement).toBe(first);
      done();
    });
  });

  it('Tab desde el último elemento vuelve al primero', (done) => {
    queueMicrotask(() => {
      const first = fixture.nativeElement.querySelector('.trap-a') as HTMLButtonElement;
      const last = fixture.nativeElement.querySelector('.trap-b') as HTMLButtonElement;
      expect(document.activeElement).toBe(first);

      last.focus();
      const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      const trap = fixture.nativeElement.querySelector('.trap') as HTMLElement;
      trap.dispatchEvent(ev);

      expect(document.activeElement).toBe(first);
      done();
    });
  });

  it('Mayús+Tab desde el primero va al último', (done) => {
    queueMicrotask(() => {
      const first = fixture.nativeElement.querySelector('.trap-a') as HTMLButtonElement;
      const last = fixture.nativeElement.querySelector('.trap-b') as HTMLButtonElement;
      expect(document.activeElement).toBe(first);

      const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
      const trap = fixture.nativeElement.querySelector('.trap') as HTMLElement;
      trap.dispatchEvent(ev);

      expect(document.activeElement).toBe(last);
      done();
    });
  });
});
