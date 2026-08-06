import { Component, Input, forwardRef, ElementRef, HostListener, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { TranslationKey } from '@/app/core/i18n/translations';

export interface SelectOption {
  label: string | Record<string, string>;
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
  private readonly _options = signal<SelectOption[]>([]);
  @Input() set options(val: SelectOption[]) { this._options.set(val || []); }
  get options() { return this._options(); }

  private readonly _placeholder = signal('Sélectionner...');
  @Input() set placeholder(val: string) { this._placeholder.set(val); }
  get placeholder() { return this._placeholder(); }

  @Input() id: string = '';
  @Input() name: string = '';
  @Input() required: boolean = false;
  @Input() ariaLabel: string = '';
  
  private readonly _multiple = signal(false);
  @Input() set multiple(val: boolean) { this._multiple.set(val); }
  get multiple() { return this._multiple(); }

  @Input() searchable: boolean = false;
  @Input() showAllOption: boolean = false;
  @Input() allOptionLabel: string = 'ui.filter.all';

  readonly value = signal<any>(null);
  disabled: boolean = false;

  readonly isOpen = signal(false);
  readonly openAbove = signal(false);
  readonly openRightAligned = signal(false);
  readonly maxDropdownHeight = signal<number>(260);
  readonly searchQuery = signal('');
  readonly focusedIndex = signal(-1);

  resolveLabel(label: string | Record<string, string>): string {
    if (!label) return '';
    const currentLang = this.i18n.language();

    if (typeof label === 'object') {
      return label[currentLang] || label['fr'] || label['en'] || Object.values(label)[0] || '';
    }

    const translated = this.i18n.t(label as TranslationKey);
    const val = translated || label;

    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('{')) {
        const closeBraceIdx = trimmed.indexOf('}');
        if (closeBraceIdx !== -1) {
          const jsonPart = trimmed.substring(0, closeBraceIdx + 1);
          const codeSuffix = trimmed.substring(closeBraceIdx + 1);
          try {
            const normalized = jsonPart.replace(/'/g, '"');
            const parsed = JSON.parse(normalized);
            if (typeof parsed === 'object' && parsed !== null) {
              const text = parsed[currentLang] || parsed['fr'] || parsed['en'] || Object.values(parsed)[0] || '';
              return String(text) + codeSuffix;
            }
          } catch {
            // fallback
          }
        }
      }
    }
    return val;
  }

  readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    let baseOpts = this._options().map(opt => ({
      ...opt,
      label: this.resolveLabel(opt.label)
    }));

    if (this.showAllOption) {
      baseOpts = [{ label: this.i18n.t(this.allOptionLabel as TranslationKey) || 'All', value: null }, ...baseOpts];
    }

    if (!query) return baseOpts;
    return baseOpts.filter(opt => opt.label.toLowerCase().includes(query));
  });

  readonly translatedPlaceholder = computed(() => {
    const p = this._placeholder();
    if (p === 'Sélectionner...') return this.i18n.t('action.select');
    return this.i18n.t(p as TranslationKey);
  });

  readonly displayValue = computed(() => {
    const placeholder = this.translatedPlaceholder();
    const currentVal = this.value();
    
    if (this._multiple()) {
      if (!Array.isArray(currentVal) || currentVal.length === 0) return placeholder;
      return this.options
        .filter(opt => currentVal.includes(opt.value))
        .map(opt => this.resolveLabel(opt.label))
        .join(', ');
    } else {
      if (currentVal == null) {
        return this.showAllOption 
          ? (this.i18n.t(this.allOptionLabel as TranslationKey) || 'All')
          : placeholder;
      }
      const selected = this.options.find(opt => opt.value === currentVal);
      return selected ? this.resolveLabel(selected.label) : placeholder;
    }
  });

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly elementRef: ElementRef,
    public readonly i18n: I18nService
  ) {}

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('keydown', ['$event'])
  onHostKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.isOpen.set(false);
      return;
    }

    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !this.isOpen()) {
      event.preventDefault();
      this.isOpen.set(true);
      this.focusedIndex.set(0);
      return;
    }

    if (this.isOpen()) {
      const opts = this.filteredOptions();
      if (opts.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.focusedIndex.update(idx => (idx + 1) % opts.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.focusedIndex.update(idx => (idx - 1 + opts.length) % opts.length);
      } else if ((event.key === 'Enter' || event.key === 'Space') && this.focusedIndex() >= 0 && this.focusedIndex() < opts.length) {
        event.preventDefault();
        this.selectOption(opts[this.focusedIndex()], event);
      }
    }
  }

  toggleOpen() {
    if (this.disabled) return;
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.searchQuery.set('');
      this.focusedIndex.set(0);

      const rect = this.elementRef.nativeElement.getBoundingClientRect();
      const containerEl = this.elementRef.nativeElement.closest('.modal, .modal-dialog, article.modal, form.modal, .detail-drawer, .drawer-body, section.page');

      let distToTop = rect.top;
      let distToBottom = window.innerHeight - rect.bottom;

      if (containerEl) {
        const style = window.getComputedStyle(containerEl);
        if (style.overflow !== 'visible' && !containerEl.classList.contains('overflow-visible')) {
          const cRect = containerEl.getBoundingClientRect();
          distToTop = rect.top - cRect.top;
          distToBottom = cRect.bottom - rect.bottom;
        }
      }

      const shouldOpenAbove = distToBottom < 220 && distToTop > distToBottom;
      this.openAbove.set(shouldOpenAbove);
      this.openRightAligned.set(rect.left + 220 > window.innerWidth);

      const availableSpace = shouldOpenAbove ? distToTop - 20 : distToBottom - 20;
      this.maxDropdownHeight.set(Math.max(120, Math.min(260, availableSpace)));
    }
  }

  selectOption(option: SelectOption, event: Event) {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.multiple) {
      const currentVal = this.value();
      const currentValues = Array.isArray(currentVal) ? [...currentVal] : [];
      const index = currentValues.indexOf(option.value);
      if (index === -1) {
        currentValues.push(option.value);
      } else {
        currentValues.splice(index, 1);
      }
      this.value.set(currentValues);
    } else {
      this.value.set(option.value);
      this.isOpen.set(false);
    }

    this.onChange(this.value());
    this.onTouched();
  }

  isSelected(optionValue: any): boolean {
    const currentVal = this.value();
    if (this.multiple) {
      return Array.isArray(currentVal) && currentVal.includes(optionValue);
    }
    return currentVal === optionValue;
  }

  writeValue(val: any): void {
    this.value.set(val);
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
