import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NurseDashboardHeaderSearchComponent } from './nurse-dashboard-header-search.component';

describe('NurseDashboardHeaderSearchComponent', () => {
  let fixture: ComponentFixture<NurseDashboardHeaderSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NurseDashboardHeaderSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseDashboardHeaderSearchComponent);
    fixture.detectChanges();
  });

  it('emite debounced con el valor del input tras el debounce', fakeAsync(() => {
    spyOn(fixture.componentInstance.debounced, 'emit');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'cama 12';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    tick(350);
    expect(fixture.componentInstance.debounced.emit).toHaveBeenCalledWith('cama 12');
  }));
});
