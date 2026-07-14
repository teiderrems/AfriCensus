import { Component, Input, forwardRef, ElementRef, HostListener, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { TranslationKey } from '@/app/core/i18n/translations';

export interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'acl-select',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, FormsModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() id: string = '';
  @Input() name: string = '';
  @Input() required: boolean = false;
  @Input() ariaLabel: string = '';
  @Input() multiple: boolean = false;
  @Input() searchable: boolean = false;
  @Input() placeholder: string = 'Sélectionner...';

  value: any = null;
  disabled: boolean = false;

  readonly isOpen = signal(false);
  readonly searchQuery = signal('');

  readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const opts = this.options.map(opt => ({
      ...opt,
      label: this.i18n.t(opt.label as TranslationKey)
    }));
    if (!query) return opts;
    return opts.filter(opt => opt.label.toLowerCase().includes(query));
  });

  get translatedPlaceholder(): string {
    if (this.placeholder === 'Sélectionner...') return this.i18n.t('action.select');
    return this.i18n.t(this.placeholder as TranslationKey);
  }

  readonly displayValue = computed(() => {
    const placeholder = this.translatedPlaceholder;
    if (this.multiple) {
      if (!Array.isArray(this.value) || this.value.length === 0) return placeholder;
      return this.options
        .filter(opt => this.value.includes(opt.value))
        .map(opt => this.i18n.t(opt.label as TranslationKey))
        .join(', ');
    } else {
      if (this.value == null || this.value === '') return placeholder;
      const selected = this.options.find(opt => opt.value === this.value);
      return selected ? this.i18n.t(selected.label as TranslationKey) : placeholder;
    }
  });

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly elementRef: ElementRef,
    public readonly i18n: I18nService
  ) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen() {
    if (this.disabled) return;
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.searchQuery.set('');
    }
  }

  selectOption(option: SelectOption, event: Event) {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.multiple) {
      const currentValues = Array.isArray(this.value) ? [...this.value] : [];
      const index = currentValues.indexOf(option.value);
      if (index === -1) {
        currentValues.push(option.value);
      } else {
        currentValues.splice(index, 1);
      }
      this.value = currentValues;
    } else {
      this.value = option.value;
      this.isOpen.set(false);
    }

    this.onChange(this.value);
    this.onTouched();
  }

  isSelected(optionValue: any): boolean {
    if (this.multiple) {
      return Array.isArray(this.value) && this.value.includes(optionValue);
    }
    return this.value === optionValue;
  }

  writeValue(val: any): void {
    this.value = val;
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
