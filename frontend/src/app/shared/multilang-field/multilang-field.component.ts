import { LucideAngularModule } from 'lucide-angular';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { LanguageCode, MultiLangString } from '@/app/core/i18n/translations';

@Component({
  selector: 'acl-multilang-field',
  imports: [LucideAngularModule, FormsModule],
  templateUrl: './multilang-field.component.html',
  styleUrl: './multilang-field.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultilangFieldComponent),
      multi: true
    }
  ]
})
export class MultilangFieldComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'textarea' = 'text';
  @Input() placeholder = '';
  @Input('aria-label') ariaLabel = '';

  activeLang: LanguageCode = 'fr';
  value: MultiLangString = { fr: '', en: '' };
  disabled = false;

  private onChange: (value: MultiLangString) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private i18n: I18nService) {
    this.activeLang = this.i18n.language();
  }

  onInput() {
    this.onChange(this.value);
  }

  writeValue(val: MultiLangString | null | undefined): void {
    if (val) {
      this.value = { fr: val.fr || '', en: val.en || '' };
    } else {
      this.value = { fr: '', en: '' };
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
