import { Directive, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

/**
 * Directiva para agregar debounce a eventos de input
 * Uso: <input appDebounce (debounced)="onSearch($event)" [debounceTime]="300" />
 */
@Directive({
  selector: '[appDebounce]',
  standalone: true
})
export class DebounceDirective implements OnInit, OnDestroy {
  @Input() debounceTime = 300;
  @Output() debounced = new EventEmitter<string>();
  
  private destroy$ = new Subject<void>();

  constructor(private elementRef: ElementRef<HTMLInputElement>) {}

  ngOnInit(): void {
    fromEvent(this.elementRef.nativeElement, 'input')
      .pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        this.debounced.emit(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
