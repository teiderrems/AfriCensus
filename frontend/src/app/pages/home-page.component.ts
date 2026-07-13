import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { LanguageCode } from '../core/i18n/translations';
import { HomeContent } from '../core/models';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'acl-home-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main id="main-content" class="home-page">
      @if (content(); as data) {
        <header class="home-nav" aria-label="Navigation publique">
          <a class="brand" routerLink="/" [attr.aria-label]="data.brand + ' accueil'">
            <span class="material-symbols-outlined" aria-hidden="true">analytics</span>
            <strong>{{ data.brand }}</strong>
          </a>
          <nav [attr.aria-label]="i18n.t('home.aria.nav')">
            @for (link of data.nav_links; track link.href + link.label) {
              <a [href]="link.href">{{ link.label }}</a>
            }
          </nav>
          <div class="actions">
            @for (action of data.actions; track action.href + action.label) {
              <a class="btn" [class.primary]="action.style === 'primary'" [class.secondary]="action.style !== 'primary'" [href]="action.href">{{ action.label }}</a>
            }
            <div class="public-controls" [attr.aria-label]="i18n.t('home.aria.displayPrefs')">
              <label class="language-select">
                <span class="sr-only">{{ i18n.t('a11y.language') }}</span>
                <select [attr.aria-label]="i18n.t('a11y.language')" [ngModel]="i18n.language()" (ngModelChange)="setLanguage($event)">
                  @for (language of i18n.languages; track language) {
                    <option [value]="language">{{ i18n.t(language === 'fr' ? 'language.fr' : 'language.en') }}</option>
                  }
                </select>
              </label>
              <button type="button" class="theme-toggle" [attr.aria-label]="theme.theme() === 'dark' ? i18n.t('a11y.enableLight') : i18n.t('a11y.enableDark')" (click)="theme.toggle()">
                <span class="material-symbols-outlined">{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
              </button>
            </div>
          </div>
        </header>

        <section class="hero">
          <div class="hero-media" role="img" [attr.aria-label]="data.hero.image_alt || data.hero.title" [style.backgroundImage]="heroBackground(data)"></div>
          <div class="hero-shade"></div>
          <div class="hero-content">
            <span class="trust-pill">
              <span class="material-symbols-outlined" aria-hidden="true">verified</span>
              {{ data.hero.badge }}
            </span>
            <h1>{{ data.hero.title }}</h1>
            <p>{{ data.hero.subtitle }}</p>
            <div class="hero-actions">
              @for (action of data.hero.actions; track action.href + action.label) {
                <a [class.hero-primary]="action.style === 'primary'" [class.hero-secondary]="action.style !== 'primary'" [href]="action.href">
                  @if (action.icon) {
                    <span class="material-symbols-outlined" aria-hidden="true">{{ action.icon }}</span>
                  }
                  {{ action.label }}
                </a>
              }
            </div>
          </div>
        </section>

        <section id="impact" class="trust-bar" [attr.aria-label]="i18n.t('home.aria.impact')">
          @for (metric of data.metrics; track metric.value + metric.label) {
            <article><strong [class.earth]="metric.tone === 'earth'">{{ metric.value }}</strong><span>{{ metric.label }}</span></article>
          }
        </section>

        <section id="solution" class="value-section">
          <div class="section-head">
            <h2>{{ data.hero.badge }}</h2>
            <p>{{ data.hero.subtitle }}</p>
          </div>
          <div class="value-grid">
            @for (item of data.values; track item.title) {
              <article class="value-card">
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.text }}</p>
              </article>
            }
          </div>
        </section>

        @for (section of data.sections; track section.id; let index = $index) {
          <section class="split-section" [class.reverse]="index % 2 === 1" [class.mobile-feature]="section.visual === 'phone'">
            <article class="split-copy">
              <span class="eyebrow" [class.earth]="section.tone === 'earth'">{{ section.eyebrow }}</span>
              <h2>{{ section.title }}</h2>
              <p>{{ section.text }}</p>
              <ul [class.earth-list]="section.tone === 'earth'">
                @for (bullet of section.bullets; track bullet) {
                  <li><span class="material-symbols-outlined" aria-hidden="true">{{ section.tone === 'earth' ? 'bolt' : 'check_circle' }}</span> {{ bullet }}</li>
                }
              </ul>
            </article>
            @if (section.visual === 'phone') {
              <article class="phone-preview" [attr.aria-label]="section.title">
                <div class="phone-device">
                  <div class="phone-status" aria-hidden="true">
                    <span>09:41</span>
                    <span class="material-symbols-outlined">signal_cellular_alt</span>
                  </div>
                  <div class="phone-appbar">
                    <span class="material-symbols-outlined" aria-hidden="true">assignment_turned_in</span>
                    <div>
                      <strong>{{ section.title }}</strong>
                      <small>{{ section.eyebrow }}</small>
                    </div>
                  </div>
                  <div class="phone-progress" aria-hidden="true">
                    <span></span>
                  </div>
                  <div class="phone-card active">
                    <span class="material-symbols-outlined" aria-hidden="true">person_pin_circle</span>
                    <div>
                      <strong>{{ i18n.t('home.phone.interview') }}</strong>
                      <small>{{ i18n.t('home.phone.sections') }}</small>
                    </div>
                    <b>82%</b>
                  </div>
                  <div class="phone-fields" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div class="phone-sync">
                    <span class="material-symbols-outlined" aria-hidden="true">cloud_done</span>
                    <span>{{ i18n.t('home.phone.syncReady') }}</span>
                  </div>
                  <button type="button" routerLink="/login">{{ data.actions[0]?.label || i18n.t('home.phone.open') }}</button>
                </div>
              </article>
            } @else {
              <article class="dashboard-preview" [attr.aria-label]="section.title">
                <div class="preview-top"></div>
                <div class="preview-grid"><span></span><span></span><span></span></div>
                <div class="preview-map"></div>
              </article>
            }
          </section>
        }

        <footer id="support" class="home-footer">
          <div class="footer-inner">
            <section class="footer-brand" [attr.aria-label]="i18n.t('home.aria.presentation')">
              <a class="footer-logo" routerLink="/" [attr.aria-label]="data.brand + ' accueil'">
                <span class="material-symbols-outlined" aria-hidden="true">analytics</span>
                <strong>{{ data.brand }}</strong>
              </a>
              <h2>{{ data.footer.title }}</h2>
              <p>{{ data.footer.text }}</p>
            </section>
            <nav class="footer-links" [attr.aria-label]="i18n.t('home.aria.usefulLinks')">
              <strong>{{ i18n.t('home.footer.navigation') }}</strong>
              @for (link of data.nav_links; track link.href + link.label) {
                <a [href]="link.href">{{ link.label }}</a>
              }
            </nav>
            <address class="footer-contact">
              <strong>{{ i18n.t('home.footer.contact') }}</strong>
              @for (line of contactLines(data.footer.contact); track line) {
                <span>{{ line }}</span>
              }
            </address>
          </div>
          <div class="footer-bottom">
            <span>© 2026 {{ data.brand }}</span>
            <span>{{ i18n.t('home.footer.securePlatform') }}</span>
          </div>
        </footer>
      } @else {
        <section class="home-loading" aria-live="polite">{{ i18n.t('home.loading') }}</section>
      }
    </main>
  `,
  styles: `
    .home-page { background: var(--sand-bg); color: var(--ink); min-height: 100vh; }
    .home-loading { min-height: 100vh; display: grid; place-items: center; color: var(--muted); font-weight: 900; }
    .home-nav { position: sticky; top: 0; z-index: 50; height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 0 clamp(16px, 4vw, 48px); background: color-mix(in srgb, var(--surface) 92%, transparent); border-bottom: 1px solid var(--outline-soft); backdrop-filter: blur(14px); }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--primary); text-decoration: none; }
    .brand strong { font-size: 24px; line-height: 30px; }
    .brand .material-symbols-outlined { font-size: 32px; }
    .home-nav nav { display: flex; gap: 28px; }
    .home-nav nav a { color: var(--muted); text-decoration: none; font-weight: 800; }
    .actions { display: flex; align-items: center; gap: 12px; }
    .public-controls { display: inline-flex; align-items: center; gap: 8px; }
    .language-select { display: flex; align-items: center; }
    .language-select select {
      min-height: 44px; border-radius: 999px; border: 2px solid var(--outline-soft);
      background: var(--surface); color: var(--ink); padding: 0 10px; font-weight: 900;
    }
    .theme-toggle {
      width: 44px; height: 44px; display: grid; place-items: center; border: 2px solid var(--outline-soft);
      border-radius: 999px; background: var(--surface); color: var(--primary);
    }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .hero { min-height: 760px; position: relative; display: flex; align-items: center; overflow: hidden; }
    .hero-media { position: absolute; inset: 0; background-image: linear-gradient(110deg, rgba(0, 100, 145, .96), rgba(0, 100, 145, .76), rgba(0, 100, 145, .08)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBkEyk2y_EuSE88mqJsQEfIuVaSidWe51IuW2wKt7n3ifzBfaYB8-GNKupyrFoQxC8wKTSc8dA_SKk2j2eojNt6TL-hN3vxAQQZ5G5CCexNt9-Y9ZIofYsKb2LK6CcX9UFFR_G4_7HIEjKY0iVGzzJZcotovAzIYMjVzJLUK0fEvVUnU3FRETTQ7_3qcUTzNQZZs_qjqiX-D7rHvICIbFcZHjxwk4KAsvFQgBzESaHBQDhS8efNFKb-IufH-eKLpDii-2z3UHNr0zA'); background-size: cover; background-position: center; }
    .hero-shade { position: absolute; inset: auto 0 0; height: 120px; background: linear-gradient(transparent, var(--sand-bg)); }
    .hero-content { position: relative; width: min(100%, 1280px); margin: 0 auto; padding: 72px clamp(16px, 4vw, 48px); color: white; }
    .hero-content > * { max-width: 720px; }
    .trust-pill { width: fit-content; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: var(--secondary-soft); color: #285000; font-weight: 800; margin-bottom: 24px; }
    h1 { font-size: clamp(42px, 7vw, 76px); line-height: 1.02; margin: 0; font-weight: 900; }
    .hero p { font-size: clamp(18px, 2vw, 22px); line-height: 1.55; color: #d9f0ff; margin: 24px 0 0; }
    .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 36px; }
    .hero-primary, .hero-secondary { min-height: 56px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; border-radius: 10px; padding: 0 28px; text-decoration: none; font-weight: 900; }
    .hero-primary { background: #5dade2; color: #003f5d; }
    .hero-secondary { border: 2px solid rgba(255,255,255,.7); color: white; }
    .trust-bar { width: min(calc(100% - 32px), 1280px); margin: -48px auto 0; position: relative; z-index: 2; background: var(--surface-container); border: 2px solid var(--outline-soft); border-radius: 12px; display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; }
    .trust-bar article { min-height: 156px; display: grid; place-items: center; align-content: center; gap: 8px; text-align: center; padding: 24px; }
    .trust-bar article + article { border-left: 1px solid var(--outline-soft); }
    .trust-bar strong { color: var(--primary); font-size: clamp(40px, 5vw, 56px); line-height: 1; }
    .trust-bar .earth { color: var(--terracotta); }
    .trust-bar span { color: var(--muted); font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    .value-section, .split-section { width: min(100%, 1280px); margin: 0 auto; padding: 96px clamp(16px, 4vw, 48px); }
    .section-head { text-align: center; max-width: 760px; margin: 0 auto 48px; }
    h2 { font-size: clamp(30px, 4vw, 44px); line-height: 1.12; margin: 0 0 16px; }
    .section-head p, .split-copy p { color: var(--muted); font-size: 18px; line-height: 1.6; }
    .value-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .value-card { background: var(--surface); border: 2px solid var(--outline-soft); border-radius: 8px; padding: 28px; }
    .value-card > .material-symbols-outlined { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 8px; background: var(--primary-soft); color: var(--primary); margin-bottom: 24px; }
    h3 { font-size: 24px; margin: 0 0 12px; }
    .value-card p { color: var(--muted); line-height: 1.55; margin: 0; }
    .split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
    .split-section.reverse { direction: rtl; }
    .split-section.reverse > * { direction: ltr; }
    .eyebrow { display: inline-block; color: var(--primary); background: var(--primary-soft); border: 1px solid var(--primary); padding: 8px 10px; border-radius: 6px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px; }
    .eyebrow.earth { color: var(--terracotta); background: var(--terracotta-soft); border-color: var(--terracotta); }
    ul { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 14px; }
    li { display: flex; gap: 12px; align-items: center; font-weight: 800; }
    li .material-symbols-outlined { color: var(--growth); }
    .earth-list .material-symbols-outlined { color: var(--terracotta); }
    .dashboard-preview { min-height: 360px; border: 4px solid var(--outline-soft); border-radius: 14px; background: var(--surface); padding: 24px; display: grid; gap: 20px; box-shadow: 0 24px 80px rgba(0,0,0,.18); }
    .preview-top { height: 52px; border-radius: 8px; background: var(--primary); }
    .preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .preview-grid span { height: 96px; border-radius: 8px; background: var(--surface-container); border: 1px solid var(--outline-soft); }
    .preview-map { min-height: 150px; border-radius: 8px; background: repeating-linear-gradient(45deg, var(--primary-soft), var(--primary-soft) 12px, var(--surface-container) 12px, var(--surface-container) 24px); }
    .mobile-feature { position: relative; }
    .mobile-feature::before {
      content: "";
      position: absolute;
      inset: 48px clamp(16px, 4vw, 48px);
      z-index: -1;
      border: 1px solid var(--outline-soft);
      border-radius: 18px;
      background:
        radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 28%),
        linear-gradient(135deg, color-mix(in srgb, var(--surface-container) 76%, transparent), transparent);
    }
    .phone-preview { display: grid; place-items: center; min-height: 600px; }
    .phone-device {
      width: min(100%, 324px);
      min-height: 596px;
      border: 12px solid #111417;
      border-radius: 40px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-low) 100%);
      padding: 18px;
      display: grid;
      align-content: start;
      gap: 16px;
      box-shadow: 0 34px 90px rgba(15, 23, 42, .28);
    }
    .phone-status, .phone-appbar, .phone-card, .phone-sync {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .phone-status { justify-content: space-between; min-height: 24px; color: var(--muted); font-size: 12px; font-weight: 900; }
    .phone-status .material-symbols-outlined { font-size: 18px; }
    .phone-appbar {
      min-height: 78px;
      padding: 14px;
      border: 1px solid var(--outline-soft);
      border-radius: 10px;
      background: var(--surface);
    }
    .phone-appbar > .material-symbols-outlined {
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 28px;
    }
    .phone-appbar strong, .phone-card strong { display: block; overflow-wrap: anywhere; }
    .phone-appbar small, .phone-card small { color: var(--muted); font-weight: 800; }
    .phone-progress { height: 10px; border-radius: 999px; background: var(--surface-container); overflow: hidden; }
    .phone-progress span { display: block; width: 82%; height: 100%; border-radius: inherit; background: var(--growth); }
    .phone-card {
      min-height: 96px;
      padding: 14px;
      border: 2px solid var(--primary);
      border-radius: 12px;
      background: var(--primary-soft);
    }
    .phone-card .material-symbols-outlined { color: var(--primary); font-size: 32px; }
    .phone-card b { margin-left: auto; font-size: 22px; color: var(--primary); }
    .phone-fields { display: grid; gap: 10px; }
    .phone-fields span { height: 48px; border: 1px solid var(--outline-soft); border-radius: 8px; background: var(--surface); }
    .phone-sync {
      min-height: 52px;
      padding: 0 14px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--growth) 14%, var(--surface));
      color: var(--growth);
      font-weight: 900;
    }
    .phone-device button {
      min-height: 54px;
      border: 0;
      border-radius: 10px;
      background: var(--primary);
      color: var(--on-primary);
      font-weight: 900;
      cursor: pointer;
    }
    .phone-device button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    .home-footer {
      background: #111417;
      color: #f2f0f0;
      padding: 64px clamp(16px, 4vw, 48px) 28px;
      display: grid;
      gap: 34px;
    }
    .footer-inner {
      width: min(100%, 1280px);
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(180px, .5fr) minmax(220px, .7fr);
      gap: 42px;
      align-items: start;
    }
    .footer-logo { display: inline-flex; align-items: center; gap: 10px; color: #8aceff; text-decoration: none; margin-bottom: 22px; }
    .footer-logo .material-symbols-outlined { font-size: 32px; }
    .footer-logo strong { font-size: 22px; }
    .footer-brand h2 { color: #ffffff; font-size: clamp(28px, 4vw, 40px); margin: 0 0 14px; max-width: 640px; }
    .footer-brand p { max-width: 680px; }
    .footer-links, .footer-contact { display: grid; gap: 12px; }
    .footer-links strong, .footer-contact strong { color: #8aceff; font-size: 16px; text-transform: uppercase; letter-spacing: .06em; }
    .footer-links a { color: #d9e8f2; text-decoration: none; font-weight: 800; }
    .footer-links a:focus-visible { outline: 3px solid #8aceff; outline-offset: 4px; border-radius: 4px; }
    .footer-contact { color: #c3ccd5; line-height: 1.6; font-style: normal; }
    .footer-brand p { color: #c3ccd5; line-height: 1.6; margin: 0; }
    .footer-bottom {
      width: min(100%, 1280px);
      margin: 0 auto;
      border-top: 1px solid rgba(255,255,255,.14);
      padding-top: 22px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: #9daab5;
      font-weight: 800;
    }
    @media (max-width: 980px) {
      .home-nav nav, .actions > .btn { display: none; }
      .actions { display: flex; margin-left: auto; }
      .hero { min-height: 680px; }
      .hero-media { background-image: linear-gradient(180deg, rgba(0,100,145,.94), rgba(0,100,145,.82)); }
      .trust-bar, .value-grid, .split-section { grid-template-columns: 1fr; }
      .trust-bar article + article { border-left: 0; border-top: 1px solid var(--outline-soft); }
      .split-section, .split-section.reverse { gap: 32px; direction: ltr; }
      .footer-inner { grid-template-columns: 1fr; }
      .footer-bottom { flex-direction: column; }
    }
    @media (max-width: 560px) {
      .brand strong { font-size: 20px; }
      .home-nav { gap: 10px; padding-inline: 12px; }
      .language-select select { max-width: 78px; min-height: 38px; padding: 0 6px; font-size: 12px; }
      .theme-toggle { width: 38px; height: 38px; }
      .theme-toggle .material-symbols-outlined { font-size: 20px; }
      .hero-actions a { width: 100%; }
      .phone-preview { min-height: 540px; }
      .phone-device { min-height: 540px; border-width: 10px; border-radius: 34px; }
      .phone-card { align-items: start; }
    }
  `,
})
export class HomePageComponent implements OnInit {
  readonly content = signal<HomeContent | null>(null);

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    readonly theme: ThemeService,
  ) {}

  ngOnInit(): void {
    this.loadContent();
  }

  loadContent(): void {
    this.api.homeContent(this.i18n.language()).subscribe({
      next: (content) => this.content.set(content),
      error: () => this.content.set(null),
    });
  }

  heroBackground(data: HomeContent): string {
    const image = data.hero.image_url ? `, url('${data.hero.image_url}')` : '';
    return `linear-gradient(110deg, rgba(0, 100, 145, .96), rgba(0, 100, 145, .76), rgba(0, 100, 145, .08))${image}`;
  }

  contactLines(contact: string): string[] {
    return contact.split('\n').filter(Boolean);
  }

  setLanguage(language: LanguageCode): void {
    this.i18n.setLanguage(language);
    this.loadContent();
  }
}
