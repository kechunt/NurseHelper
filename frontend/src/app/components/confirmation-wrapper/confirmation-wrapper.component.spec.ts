import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService } from '../../services/confirmation.service';
import { ConfirmationWrapperComponent } from './confirmation-wrapper.component';

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

describe('ConfirmationWrapperComponent', () => {
  let fixture: ComponentFixture<ConfirmationWrapperComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [ConfirmationWrapperComponent],
      providers: [
        {
          provide: ConfirmationService,
          useValue: {
            getConfirmation: () => of(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationWrapperComponent);
    fixture.detectChanges();
  });

  it('expone ancla #confirmation-wrapper-host', () => {
    expect(fixture.nativeElement.querySelector('#confirmation-wrapper-host')).toBeTruthy();
  });
});
