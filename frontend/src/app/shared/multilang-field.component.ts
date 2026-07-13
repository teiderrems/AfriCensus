import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { LanguageCode, MultiLangString } from '../core/i18n/translations';

@Component({
  selector: 'acl-multilang-field',
  imports: [FormsModule],
  template: `
    <div class="multilang-field" [class.is-textarea]="type === 'textarea'">
      <div class="lang-tabs">
        <button type="button" [class.active]="activeLang === 'fr'" (click)="activeLang = 'fr'">FR</button>
        <button type="button" [class.active]="activeLang === 'en'" (click)="activeLang = 'en'">EN</button>
      </div>
      @if (type === 'textarea') {
        <textarea
          [(ngModel)]="value[activeLang]"
          (ngModelChange)="onInput()"
          [placeholder]="placeholder"
          [attr.aria-label]="ariaLabel"
          [disabled]="disabled"
          rows="3"
        ></textarea>
      } @else {
        <input
          type="text"
          [(ngModel)]="value[activeLang]"
          (ngModelChange)="onInput()"
          [placeholder]="placeholder"
          [attr.aria-label]="ariaLabel"
          [disabled]="disabled"
        />
      }
    </div>
  `,
  styles: `
    .multilang-field { display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .lang-tabs { display: flex; gap: 4px; align-self: flex-start; }
    .lang-tabs button {
      border: 1px solid var(--outline-soft); background: var(--surface); color: var(--muted); font-size: 11px; font-weight: 800;
      padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;
    }
    .lang-tabs button:hover { background: var(--surface-hover); }
    .lang-tabs button.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
    input, textarea { width: 100%; box-sizing: border-box; }
    textarea { resize: vertical; }
  `,
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
