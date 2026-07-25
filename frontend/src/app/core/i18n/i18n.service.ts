import { Injectable, computed, signal } from '@angular/core';

import { LanguageCode, TranslationKey, translations } from './translations';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages: LanguageCode[] = ['fr', 'en'];
  private readonly storageKey = 'africensus_language';
  readonly language = signal<LanguageCode>(this.initialLanguage());
  readonly direction = computed(() => 'ltr');

  constructor() {
    this.applyDocumentLanguage(this.language());
  }

  setLanguage(language: LanguageCode): void {
    if (!this.languages.includes(language)) {
      return;
    }
    this.language.set(language);
    this.storageSet(this.storageKey, language);
    this.applyDocumentLanguage(language);
  }

  t(key: TranslationKey | string, params: Record<string, string | number> = {}): string {
    const catalog = translations[this.language()];
    const fallback = translations.fr[key as TranslationKey] || key;
    return this.interpolate(catalog[key as TranslationKey] || fallback, params);
  }

  isLanguage(value: string): value is LanguageCode {
    return this.languages.includes(value as LanguageCode);
  }

  private interpolate(value: string, params: Record<string, string | number>): string {
    return Object.entries(params).reduce((text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)), value);
  }

  private initialLanguage(): LanguageCode {
    const stored = this.storageGet(this.storageKey);
    if (stored && this.isLanguage(stored)) {
      return stored;
    }
    if (typeof navigator !== 'undefined') {
      const browserLanguage = navigator.language.slice(0, 2);
      if (this.isLanguage(browserLanguage)) {
        return browserLanguage;
      }
    }
    return 'fr';
  }

  private applyDocumentLanguage(language: LanguageCode): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = language;
    document.documentElement.dir = this.direction();
  }

  private storageGet(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  private storageSet(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  }
}
