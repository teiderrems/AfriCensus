import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { ErrorService } from './core/error.service';
import { I18nService } from './core/i18n/i18n.service';
import { LanguageCode, TranslationKey } from './core/i18n/translations';
import { User } from './core/models';
import { OfflineSyncService } from './core/offline-sync.service';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'acl-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#main-content">{{ i18n.t('a11y.skipToContent') }}</a>
    @if (errorService.current(); as error) {
      <section class="api-error" role="alert" aria-live="assertive">
        <div>
          <strong>{{ error.title }}</strong>
          <p>{{ error.message }}</p>
          @if (error.details.length > 1) {
            <ul>
              @for (detail of error.details.slice(1, 4); track detail) {
                <li>{{ detail }}</li>
              }
            </ul>
          }
        </div>
        <button type="button" [attr.aria-label]="i18n.t('a11y.closeError')" (click)="errorService.clear()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </section>
    }
    @if (loggedIn() && !isPublicRoute()) {
      <div class="shell">
        <aside class="sidebar hide-mobile" aria-label="Navigation principale">
          <div class="brand">
            <div class="mark" aria-hidden="true">AL</div>
            <div>
              <strong>AfriCensus Link</strong>
              <span>{{ user()?.role || i18n.t('app.portal') }}</span>
            </div>
          </div>
          <nav aria-label="Sections applicatives">
            @for (item of nav(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }">
                <span class="material-symbols-outlined">{{ item.icon }}</span>
                {{ item.label }}
              </a>
            }
          </nav>
          <button class="logout" type="button" (click)="auth.logout()">
            <span class="material-symbols-outlined">logout</span>
            {{ i18n.t('app.logout') }}
          </button>
        </aside>
        <main class="main" id="main-content" tabindex="-1">
          <header class="topbar">
            <div>
              <strong>AfriCensus Link</strong>
              <span>{{ user()?.full_name }}</span>
            </div>
            <button class="sync-status" type="button" [class.offline]="!offline.online()" [class.pending]="offline.hasPending()" (click)="offline.syncNow()">
              <span class="material-symbols-outlined">{{ offline.online() ? 'cloud_done' : 'cloud_off' }}</span>
              <strong>{{ offline.online() ? i18n.t('sync.online') : i18n.t('sync.offline') }}</strong>
              @if (offline.hasPending()) {
                <em>{{ offline.pendingCount() }}</em>
              }
            </button>
            <div class="top-actions">
              <label class="language-select">
                <span class="sr-only">{{ i18n.t('a11y.language') }}</span>
                <select [attr.aria-label]="i18n.t('a11y.language')" [ngModel]="i18n.language()" (ngModelChange)="setLanguage($event)">
                  @for (language of i18n.languages; track language) {
                    <option [value]="language">{{ i18n.t(language === 'fr' ? 'language.fr' : 'language.en') }}</option>
                  }
                </select>
              </label>
              <button type="button" [attr.aria-label]="i18n.t('a11y.notifications')" (click)="toggleNotifications()">
                <span class="material-symbols-outlined">notifications</span>
              </button>
              <button type="button" [attr.aria-label]="i18n.t('a11y.help')" (click)="goToHelp()"><span class="material-symbols-outlined">help</span></button>
              <button type="button" [attr.aria-label]="theme.theme() === 'dark' ? i18n.t('a11y.enableLight') : i18n.t('a11y.enableDark')" (click)="theme.toggle()">
                <span class="material-symbols-outlined">{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
              </button>
            </div>
          </header>
          @if (notificationsOpen()) {
            <aside class="notification-panel" role="status" aria-live="polite">
              <strong>{{ i18n.t('notifications.title') }}</strong>
              <p>{{ notificationMessage() }}</p>
              <button type="button" class="btn secondary" (click)="openNotificationTarget()">{{ i18n.t('notifications.action') }}</button>
            </aside>
          }
          @if (offline.hasPending() || offline.syncing() || offline.lastSyncError()) {
            <aside class="sync-panel" role="status" aria-live="polite">
              <strong>{{ offline.syncing() ? i18n.t('sync.inProgress') : offline.hasPending() ? i18n.t('sync.pendingTitle') : i18n.t('sync.title') }}</strong>
              <p>
                @if (offline.lastSyncError()) {
                  {{ offline.lastSyncError() }}
                } @else if (offline.hasPending()) {
                  {{ i18n.t('sync.pendingMessage', { count: offline.pendingCount() }) }}
                } @else {
                  {{ i18n.t('sync.success') }}
                }
              </p>
              <button type="button" class="btn secondary" [disabled]="!offline.online() || offline.syncing() || !offline.hasPending()" (click)="offline.syncNow()">{{ i18n.t('sync.action') }}</button>
            </aside>
          }
          <nav class="mobile-nav" aria-label="Navigation mobile">
            @for (item of nav(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }">
                <span class="material-symbols-outlined">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            }
          </nav>
          <router-outlet />
        </main>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    .skip-link {
      position: fixed; left: 16px; top: 12px; transform: translateY(-140%); z-index: 1000;
      background: var(--primary); color: var(--on-primary); padding: 10px 14px; border-radius: 6px; font-weight: 800;
    }
    .skip-link:focus { transform: translateY(0); outline: 3px solid var(--terracotta); outline-offset: 2px; }
    .api-error {
      position: fixed; top: 16px; right: 16px; z-index: 1001; width: min(520px, calc(100vw - 32px));
      display: flex; align-items: start; justify-content: space-between; gap: 16px; padding: 16px;
      border: 2px solid var(--error); border-radius: 8px; background: var(--error-soft); color: var(--ink);
      box-shadow: 0 16px 34px rgba(0, 0, 0, .16);
    }
    .api-error strong { display: block; color: var(--error); font-size: 16px; }
    .api-error p { margin: 4px 0 0; color: var(--ink); }
    .api-error ul { margin: 10px 0 0; padding-left: 18px; color: var(--muted); }
    .api-error button {
      width: 40px; height: 40px; border: 0; border-radius: 999px; background: transparent; color: var(--error);
      display: grid; place-items: center; flex: 0 0 auto;
    }
    .shell { min-height: 100vh; display: flex; }
    .sidebar {
      width: 288px; background: var(--surface-low); border-right: 2px solid var(--outline-soft);
      padding: 24px 16px; display: flex; flex-direction: column; gap: 28px; position: fixed; inset: 0 auto 0 0;
    }
    .brand { display: flex; align-items: center; gap: 12px; padding: 0 8px; }
    .brand strong { display: block; color: var(--primary); font-size: 24px; line-height: 30px; }
    .brand span { color: var(--muted); font-size: 12px; }
    .mark {
      width: 44px; height: 44px; border-radius: 6px; background: var(--primary); color: var(--on-primary);
      display: grid; place-items: center; font-weight: 800;
    }
    .sidebar nav { display: grid; gap: 8px; }
    .sidebar nav a, .logout {
      min-height: 48px; border-radius: 8px; padding: 0 14px; display: flex; align-items: center;
      gap: 12px; text-decoration: none; color: var(--muted); font-weight: 700; border: 0; background: transparent;
    }
    .sidebar nav a.active { background: var(--primary); color: var(--on-primary); }
    .logout { margin-top: auto; border-top: 2px solid var(--outline-soft); border-radius: 0; width: 100%; }
    .main { flex: 1; margin-left: 288px; min-width: 0; }
    .topbar {
      height: 64px; background: var(--surface); border-bottom: 2px solid var(--outline-soft);
      display: flex; align-items: center; justify-content: space-between; padding: 0 32px; position: sticky; top: 0; z-index: 10;
    }
    .topbar strong { display: block; color: var(--primary); }
    .topbar span { color: var(--muted); font-size: 14px; }
    .top-actions { display: flex; gap: 8px; }
    .top-actions button {
      width: 48px; height: 48px; border: 0; border-radius: 999px; background: transparent; color: var(--muted);
    }
    .language-select { min-height: 48px; display: flex; align-items: center; }
    .language-select select {
      min-height: 40px; border-radius: 999px; border: 2px solid var(--outline-soft);
      background: var(--surface); color: var(--ink); padding: 0 10px; font-weight: 800;
    }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .notification-panel {
      position: fixed; top: 76px; right: 24px; z-index: 20; width: min(360px, calc(100vw - 32px));
      display: grid; gap: 10px; padding: 16px; border: 2px solid var(--outline-soft); border-radius: 8px;
      background: var(--surface); box-shadow: 0 16px 32px rgba(0,0,0,.14);
    }
    .sync-status {
      min-height: 42px; display: inline-flex; align-items: center; gap: 8px; border: 2px solid var(--outline-soft);
      border-radius: 999px; padding: 0 12px; background: var(--surface); color: var(--primary); font-weight: 900;
    }
    .sync-status.offline { color: var(--error); border-color: var(--error); background: var(--error-soft); }
    .sync-status.pending em {
      min-width: 22px; height: 22px; display: grid; place-items: center; border-radius: 999px;
      background: var(--terracotta); color: white; font-style: normal; font-size: 12px;
    }
    .sync-status .material-symbols-outlined { font-size: 20px; }
    .sync-panel {
      position: fixed; top: 76px; left: 312px; z-index: 20; width: min(390px, calc(100vw - 32px));
      display: grid; gap: 10px; padding: 16px; border: 2px solid var(--outline-soft); border-radius: 8px;
      background: var(--surface); box-shadow: 0 16px 32px rgba(0,0,0,.14);
    }
    .sync-panel strong { color: var(--primary); }
    .sync-panel p { margin: 0; color: var(--muted); }
    .notification-panel strong { color: var(--primary); }
    .notification-panel p { color: var(--muted); margin: 0; }
    .mobile-nav {
      display: none; gap: 8px; overflow-x: auto; padding: 8px 16px; background: var(--surface);
      border-bottom: 2px solid var(--outline-soft); scrollbar-width: thin;
    }
    .mobile-nav a {
      min-width: max-content; min-height: 48px; display: inline-flex; align-items: center; gap: 8px;
      padding: 0 12px; border-radius: 8px; color: var(--ink); text-decoration: none; font-weight: 800;
    }
    .mobile-nav a.active { background: var(--primary); color: var(--on-primary); }
    @media (max-width: 860px) {
      .main { margin-left: 0; }
      .topbar { padding: 0 16px; }
      .mobile-nav { display: flex; }
    }
    @media (max-width: 520px) {
      .topbar {
        height: auto; min-height: 56px; padding: 6px 8px; gap: 8px;
      }
      .topbar > div:first-child { min-width: 0; }
      .topbar strong { font-size: 13px; line-height: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
      .topbar span { font-size: 11px; line-height: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
      .top-actions { gap: 2px; flex: 0 0 auto; }
      .top-actions button { width: 36px; height: 36px; }
      .top-actions .material-symbols-outlined { font-size: 18px; }
      .language-select { min-height: 36px; }
      .language-select select { min-height: 34px; max-width: 78px; padding: 0 6px; font-size: 11px; }
      .sync-status { min-height: 34px; padding: 0 8px; gap: 4px; font-size: 11px; }
      .sync-status .material-symbols-outlined { font-size: 16px; }
      .sync-status em { min-width: 18px; height: 18px; }
      .notification-panel { top: 62px; right: 8px; width: calc(100vw - 16px); }
      .sync-panel { top: 112px; left: 8px; width: calc(100vw - 16px); }
      .mobile-nav { padding: 6px 8px; gap: 6px; }
      .mobile-nav a { min-height: 40px; padding: 0 10px; font-size: 13px; }
      .mobile-nav .material-symbols-outlined { font-size: 18px; }
    }
  `,
})
export class AppComponent {
  readonly user = this.auth.currentUser;
  readonly loggedIn = computed(() => Boolean(this.user()));
  readonly nav = computed(() => this.navForRole(this.user()?.role || 'AGENT'));
  private readonly notificationVisible = signal(false);
  readonly notificationsOpen = computed(() => this.notificationVisible());
  readonly notificationMessage = computed(() => {
    const role = this.user()?.role;
    if (role === 'AGENT') return this.i18n.t('notifications.agent');
    if (role === 'AUDITOR') return this.i18n.t('notifications.auditor');
    return this.i18n.t('notifications.default');
  });

  constructor(
    readonly auth: AuthService,
    readonly theme: ThemeService,
    readonly errorService: ErrorService,
    readonly i18n: I18nService,
    readonly offline: OfflineSyncService,
    readonly router: Router,
  ) {}

  isPublicRoute(): boolean {
    return this.router.url === '/' || this.router.url.startsWith('/login');
  }

  toggleNotifications(): void {
    this.notificationVisible.update((visible) => !visible);
  }

  setLanguage(language: LanguageCode): void {
    this.i18n.setLanguage(language);
  }

  goToHelp(): void {
    if (this.loggedIn()) {
      this.router.navigateByUrl('/portal');
      return;
    }
    window.location.hash = 'support';
  }

  openNotificationTarget(): void {
    const role = this.user()?.role;
    this.notificationVisible.set(false);
    if (role === 'AGENT') {
      this.router.navigateByUrl('/households');
      return;
    }
    if (role === 'AUDITOR') {
      this.router.navigateByUrl('/audit');
      return;
    }
    this.router.navigateByUrl('/validation');
  }

  private navForRole(role: User['role']): Array<{ path: string; label: string; icon: string }> {
    const item = (path: string, labelKey: TranslationKey, icon: string) => ({ path, label: this.i18n.t(labelKey), icon });
    const base = [item('/portal', 'nav.myPortal', 'dashboard')];
    const byRole: Record<User['role'], Array<{ path: string; label: string; icon: string }>> = {
      ADMIN: [
        item('/admin-portal', 'nav.adminPortal', 'admin_panel_settings'),
        item('/dashboard', 'nav.dashboard', 'analytics'),
        item('/households', 'nav.households', 'home'),
        item('/persons', 'nav.persons', 'groups'),
        item('/birth-declaration', 'nav.birthDeclaration', 'child_care'),
        item('/family-tree', 'nav.family', 'account_tree'),
        item('/medical-history', 'nav.medical', 'clinical_notes'),
        item('/validation', 'nav.validation', 'verified'),
        item('/reports', 'nav.reports', 'assessment'),
        item('/audit', 'nav.audit', 'history'),
      ],
      SUPERVISOR: [
        item('/dashboard', 'nav.dashboard', 'analytics'),
        item('/validation', 'nav.validation', 'verified'),
        item('/households', 'nav.households', 'home'),
        item('/persons', 'nav.persons', 'groups'),
        item('/birth-declaration', 'nav.birthDeclaration', 'child_care'),
        item('/family-tree', 'nav.family', 'account_tree'),
        item('/reports', 'nav.reports', 'assessment'),
      ],
      AGENT: [
        item('/households', 'nav.households', 'home'),
        item('/persons', 'nav.persons', 'groups'),
        item('/birth-declaration', 'nav.birthDeclaration', 'child_care'),
        item('/family-tree', 'nav.family', 'account_tree'),
      ],
      STATISTICIAN: [
        item('/dashboard', 'nav.dashboard', 'analytics'),
        item('/reports', 'nav.reports', 'assessment'),
        item('/medical-history', 'nav.medical', 'clinical_notes'),
        item('/family-tree', 'nav.family', 'account_tree'),
        item('/persons', 'nav.persons', 'groups'),
      ],
      AUDITOR: [
        item('/audit', 'nav.audit', 'history'),
        item('/validation', 'nav.validation', 'verified'),
        item('/admin-portal', 'nav.systemAlerts', 'security'),
        item('/reports', 'nav.reports', 'assessment'),
      ],
    };
    return [...base, ...byRole[role]];
  }
}
