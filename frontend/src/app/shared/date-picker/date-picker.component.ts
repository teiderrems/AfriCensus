import { Component, Input, forwardRef, ElementRef, HostListener, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';

import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

@Component({
  selector: 'acl-date-picker',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, FormsModule, AclTooltipDirective],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ]
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() id: string = '';
  @Input() name: string = '';
  @Input() disabled: boolean = false;
  @Input() placeholder: string = 'YYYY-MM-DD';

  readonly value = signal<string | null>(null); // YYYY-MM-DD

  readonly isOpen = signal(false);
  readonly openAbove = signal(false);
  readonly currentMonth = signal<Date>(new Date());

  readonly daysOfWeek = computed(() => {
    const lang = this.i18n.language();
    const formatter = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    return Array.from({ length: 7 }).map((_, i) => {
      // 2024-01-01 was a Monday
      const date = new Date(2024, 0, 1 + i);
      const str = formatter.format(date);
      return str.substring(0, 3);
    });
  });

  readonly monthYearDisplay = computed(() => {
    const lang = this.i18n.language();
    const formatter = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' });
    const str = formatter.format(this.currentMonth());
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  readonly calendarDays = computed(() => {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const m = month.getMonth();

    const firstDayOfMonth = new Date(year, m, 1);
    const lastDayOfMonth = new Date(year, m + 1, 0);

    let startOffset = firstDayOfMonth.getDay() - 1;
    if (startOffset === -1) startOffset = 6;

    const days = [];
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startOffset);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const val = this.value();
    const selectedDate = val ? new Date(val) : null;
    if (selectedDate) selectedDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);

      const isCurrentMonth = d.getMonth() === m;
      const isToday = d.getTime() === today.getTime();
      const isSelected = selectedDate ? d.getTime() === selectedDate.getTime() : false;

      const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, isCurrentMonth, isSelected, isToday, formatted });
    }

    return days;
  });

  readonly displayValue = computed(() => {
    const val = this.value();
    if (!val) return this.placeholder;
    const lang = this.i18n.language();
    const formatter = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' });
    const [y, m, d] = val.split('-').map(Number);
    return formatter.format(new Date(y, m - 1, d));
  });

  readonly popoverTop = signal<number>(0);
  readonly popoverLeft = signal<number>(0);

  readonly monthOptions = computed(() => {
    const lang = this.i18n.language();
    const formatter = new Intl.DateTimeFormat(lang, { month: 'long' });
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(2024, i, 1);
      const label = formatter.format(d);
      return { value: i, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  });

  readonly yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 1900;
    const endYear = currentYear + 10;
    const years: number[] = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  });

  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(
    private readonly elementRef: ElementRef,
    public readonly i18n: I18nService
  ) { }

  @HostListener('document:click', ['$event'])
  @HostListener('document:pointerdown', ['$event'])
  onClickOutside(event: Event) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('window:scroll', ['$event'])
  @HostListener('window:resize', ['$event'])
  onWindowScrollOrResize() {
    if (this.isOpen()) {
      this.updatePosition();
    }
  }

  updatePosition() {
    if (!this.isOpen()) return;
    const triggerEl = this.elementRef.nativeElement.querySelector('.date-trigger') || this.elementRef.nativeElement;
    const rect = triggerEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const popoverWidth = 280;
    const popoverHeight = 310;

    let top = rect.bottom + 6;
    let openAbove = false;

    if (viewportHeight - rect.bottom < popoverHeight && rect.top > popoverHeight) {
      top = rect.top - popoverHeight - 6;
      openAbove = true;
    } else if (viewportHeight - rect.bottom < popoverHeight) {
      top = Math.max(10, viewportHeight - popoverHeight - 10);
    }

    let left = rect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popoverWidth - 12);
    }

    this.popoverTop.set(top);
    this.popoverLeft.set(left);
    this.openAbove.set(openAbove);
  }

  toggleOpen() {
    if (this.disabled) return;
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.updatePosition();
      const val = this.value();
      if (val) {
        const [y, m, d] = val.split('-').map(Number);
        this.currentMonth.set(new Date(y, m - 1, 1));
      } else {
        const now = new Date();
        now.setDate(1);
        this.currentMonth.set(now);
      }
    }
  }

  setMonth(mIndex: any) {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), Number(mIndex), 1));
  }

  setYear(year: any) {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(Number(year), current.getMonth(), 1));
  }

  prevMonth(event: Event) {
    event.stopPropagation();
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(event: Event) {
    event.stopPropagation();
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  selectDate(day: any, event: Event) {
    event.stopPropagation();
    if (this.disabled) return;

    this.value.set(day.formatted);
    this.isOpen.set(false);

    this.onChange(this.value());
    this.onTouched();
  }

  writeValue(val: any): void {
    this.value.set(val || null);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
