import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BootstrapIconComponent } from './bootstrap-icon.component';

describe('BootstrapIconComponent', () => {
  let fixture: ComponentFixture<BootstrapIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BootstrapIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BootstrapIconComponent);
    fixture.componentRef.setInput('name', 'bell');
    fixture.detectChanges();
  });

  it('renders Bootstrap Icons class without fill suffix', () => {
    const icon = fixture.nativeElement.querySelector('i.bi');
    expect(icon).toBeTruthy();
    expect(icon.classList.contains('bi-bell')).toBe(true);
    expect(icon.classList.contains('bi-bell-fill')).toBe(false);
  });

  it('maps legacy icon names to bootstrap icons', () => {
    fixture.componentRef.setInput('name', 'magnifying-glass');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.classList.contains('bi-search')).toBe(true);
  });
});
