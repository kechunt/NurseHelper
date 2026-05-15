import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TermsModalComponent } from './terms-modal.component';

describe('TermsModalComponent', () => {
  let fixture: ComponentFixture<TermsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsModalComponent);
    fixture.detectChanges();
  });

  it('con modal abierto expone ids en backdrop, cabecera, cancelar y aceptar', () => {
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#terms-modal-backdrop')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#terms-modal-header-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#terms-modal-cancel-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#terms-modal-accept-btn')).toBeTruthy();
  });
});
