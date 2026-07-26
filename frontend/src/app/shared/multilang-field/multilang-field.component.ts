import { LucideAngularModule } from 'lucide-angular';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { I18nService } from '@/app/core/i18n/i18n.service';

const DEFAULT_SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt', 'ar', 'sw'];

@Component({
  selector: 'acl-multilang-field',
  imports: [LucideAngularModule, FormsModule],
  templateUrl: './multilang-field.component.html',
  styleUrl: './multilang-field.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultilangFieldComponent),
      multi: true,
    },
  ],
})
export class MultilangFieldComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'textarea' = 'text';
  @Input() placeholder = '';
  @Input('aria-label') ariaLabel = '';
  @Input() languages: string[] = [];

  activeLang = 'fr';
  value: Record<string, string> = { fr: '', en: '' };
  activeTabLangs: string[] = ['fr', 'en'];
  disabled = false;
  showAddMenu = false;

  private onChange: (value: Record<string, string>) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(readonly i18n: I18nService) {
    this.activeLang = this.i18n.language();
  }

  get configuredLangs(): string[] {
    const list = this.languages && this.languages.length ? this.languages : DEFAULT_SUPPORTED_LANGUAGES;
    return Array.from(new Set(['fr', 'en', ...list]));
  }

  get unaddedLangs(): string[] {
    return this.configuredLangs.filter((l) => !this.activeTabLangs.includes(l));
  }

  onInput(): void {
    this.onChange(this.value);
  }

  selectLang(lang: string): void {
    this.activeLang = lang;
    if (this.value[lang] === undefined) {
      this.value[lang] = '';
    }
  }

  addLang(lang: string): void {
    if (!this.activeTabLangs.includes(lang)) {
      this.activeTabLangs.push(lang);
    }
    this.selectLang(lang);
    this.showAddMenu = false;
  }

  removeLang(lang: string, event: Event): void {
    event.stopPropagation();
    if (this.activeTabLangs.length <= 1) return;
    this.activeTabLangs = this.activeTabLangs.filter((l) => l !== lang);
    delete this.value[lang];
    if (this.activeLang === lang) {
      this.activeLang = this.activeTabLangs[0];
    }
    this.onChange(this.value);
  }

  hasContent(lang: string): boolean {
    return Boolean(this.value[lang] && this.value[lang].trim().length > 0);
  }

  writeValue(val: Record<string, string> | string | null | undefined): void {
    if (typeof val === 'string') {
      this.value = { fr: val, en: val };
      this.activeTabLangs = ['fr', 'en'];
    } else if (val && typeof val === 'object') {
      this.value = { ...val };
      const keys = Object.keys(val);
      const combined = Array.from(new Set(['fr', 'en', ...keys]));
      this.activeTabLangs = combined;
    } else {
      this.value = { fr: '', en: '' };
      this.activeTabLangs = ['fr', 'en'];
    }
    if (!this.activeTabLangs.includes(this.activeLang)) {
      this.activeLang = this.activeTabLangs[0] || 'fr';
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
