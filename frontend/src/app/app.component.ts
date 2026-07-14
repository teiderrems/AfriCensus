import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from './core/auth.service';
import { ErrorService } from './core/error.service';
import { I18nService } from './core/i18n/i18n.service';
import { LanguageCode, TranslationKey } from './core/i18n/translations';
import { User } from './core/models';
import { OfflineSyncService } from './core/offline-sync.service';
import { ThemeService } from './core/theme.service';
import { ToastService } from './core/toast.service';
import { UpperCasePipe } from '@angular/common';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'acl-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, UpperCasePipe, ConfirmDialogComponent],
  template: `
    <a class="skip-link" href="#main-content">{{ i18n.t('a11y.skipToContent') }}</a>
    
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="toast.type" role="alert">
          <div>
            <strong>{{ toast.title }}</strong>
            @if (toast.message) {
              <p>{{ toast.message }}</p>
            }
          </div>
          <button type="button" aria-label="Close" (click)="toastService.remove(toast.id)">
            <lucide-icon name="x"></lucide-icon>
          </button>
        </div>
      }
    </div>

    @if (loggedIn() && !isPublicRoute()) {
      <div class="shell">
        <aside class="sidebar hide-mobile" aria-label="Navigation principale">
          <div class="brand">
            <div class="mark" aria-hidden="true">AL</div>
            <div>
              <strong>AfriCensus Link</strong>
              <span>{{ portalRoleLabel() }}</span>
            </div>
          </div>
          <nav aria-label="Sections applicatives">
            @for (item of nav(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }">
                <lucide-icon [name]="item.icon"></lucide-icon>
                {{ item.label }}
              </a>
            }
          </nav>
          <button class="logout" type="button" (click)="auth.logout()">
            <lucide-icon name="log-out"></lucide-icon>
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
              <lucide-icon [name]="offline.online() ? 'cloud' : 'cloud-off'"></lucide-icon>
              <strong>{{ offline.online() ? i18n.t('sync.online') : i18n.t('sync.offline') }}</strong>
              @if (offline.hasPending()) {
                <em>{{ offline.pendingCount() }}</em>
              }
            </button>
            <div class="top-actions">
              <button type="button" class="language-toggle" [attr.aria-label]="i18n.t('a11y.language')" (click)="toggleLanguage()">
                {{ i18n.language() | uppercase }}
              </button>
              <button type="button" [attr.aria-label]="i18n.t('a11y.notifications')" (click)="toggleNotifications()">
                <lucide-icon name="bell"></lucide-icon>
              </button>
              <button type="button" [attr.aria-label]="i18n.t('a11y.help')" (click)="goToHelp()"><lucide-icon name="circle-question-mark"></lucide-icon></button>
              <button type="button" [attr.aria-label]="theme.theme() === 'dark' ? i18n.t('a11y.enableLight') : i18n.t('a11y.enableDark')" (click)="theme.toggle()">
                <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'"></lucide-icon>
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
                <lucide-icon [name]="item.icon"></lucide-icon>
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
    <app-confirm-dialog />
  `,
  styles: `
    .skip-link {
      position: fixed; left: 16px; top: 12px; transform: translateY(-140%); z-index: 1000;
      background: var(--primary); color: var(--on-primary); padding: 10px 14px; border-radius: 6px; font-weight: 800;
    }
    .skip-link:focus { transform: translateY(0); outline: 3px solid var(--terracotta); outline-offset: 2px; }
    .toast-container {
      position: fixed; top: 16px; right: 16px; z-index: 2000; display: flex; flex-direction: column; gap: 12px;
    }
    .toast {
      width: 320px; padding: 16px; border-radius: 8px; background: var(--surface);
      box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left: 4px solid var(--primary);
      display: flex; justify-content: space-between; align-items: start; gap: 12px;
    }
    .toast.error { border-left-color: var(--error); }
    .toast.success { border-left-color: var(--success); }
    .toast strong { display: block; margin-bottom: 4px; }
    .toast p { margin: 0; font-size: 14px; color: var(--muted); }
    .toast button { background: none; border: none; cursor: pointer; color: var(--muted); }
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
      width: 44px; height: 44px; display: grid; place-items: center; border: 2px solid var(--outline-soft);
      border-radius: 999px; background: var(--surface); color: var(--primary); cursor: pointer;
    }
    .top-actions button:hover {
      background: var(--surface-low);
    }
    .language-toggle {
      font-weight: 800; font-size: 14px;
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
    .sync-status lucide-icon { font-size: 20px; }
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
      .top-actions lucide-icon { font-size: 18px; }
      .language-toggle { font-size: 11px; }
      .sync-status { min-height: 34px; padding: 0 8px; gap: 4px; font-size: 11px; }
      .sync-status lucide-icon { font-size: 16px; }
      .sync-status em { min-width: 18px; height: 18px; }
      .notification-panel { top: 62px; right: 8px; width: calc(100vw - 16px); }
      .sync-panel { top: 112px; left: 8px; width: calc(100vw - 16px); }
      .mobile-nav { padding: 6px 8px; gap: 6px; }
      .mobile-nav a { min-height: 40px; padding: 0 10px; font-size: 13px; }
      .mobile-nav lucide-icon { font-size: 18px; }
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

  readonly portalRoleLabel = computed(() => {
    const role = this.user()?.role;
    if (!role) return this.i18n.t('app.portal');
    return this.i18n.t(('role.' + role) as TranslationKey);
  });

  languageOptions = computed(() => this.i18n.languages.map(l => ({
    value: l,
    label: this.i18n.t(l === 'fr' ? 'language.fr' : 'language.en')
  })));

  constructor(
    readonly auth: AuthService,
    readonly i18n: I18nService,
    readonly theme: ThemeService,
    readonly offline: OfflineSyncService,
    readonly errorService: ErrorService,
    readonly toastService: ToastService,
    private readonly router: Router
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

  toggleLanguage(): void {
    const next = this.i18n.language() === 'fr' ? 'en' : 'fr';
    this.i18n.setLanguage(next);
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
    const base = [item('/portal', 'nav.myPortal', 'layout-dashboard')];
    const byRole: Record<User['role'], Array<{ path: string; label: string; icon: string }>> = {
      ADMIN: [
        item('/admin-portal', 'nav.adminPortal', 'shield'),
        item('/dashboard', 'nav.dashboard', 'layout-dashboard'),
        item('/households', 'nav.households', 'house'),
        item('/users', 'nav.persons', 'users'),
        item('/birth-declaration', 'nav.birthDeclaration', 'baby'),
        item('/family-tree', 'nav.family', 'network'),
        item('/medical-history', 'nav.medical', 'clipboard-check'),
        item('/validation', 'nav.validation', 'badge-check'),
        item('/reports', 'nav.reports', 'chart-pie'),
        item('/audit', 'nav.audit', 'history'),
      ],
      SUPERVISOR: [
        item('/dashboard', 'nav.dashboard', 'layout-dashboard'),
        item('/validation', 'nav.validation', 'badge-check'),
        item('/households', 'nav.households', 'house'),
        item('/persons', 'nav.persons', 'users'),
        item('/birth-declaration', 'nav.birthDeclaration', 'baby'),
        item('/family-tree', 'nav.family', 'network'),
        item('/reports', 'nav.reports', 'chart-pie'),
      ],
      AGENT: [
        item('/households', 'nav.households', 'house'),
        item('/persons', 'nav.persons', 'users'),
        item('/birth-declaration', 'nav.birthDeclaration', 'baby'),
        item('/family-tree', 'nav.family', 'network'),
        item('/medical-history', 'nav.medical', 'clipboard-check'),
        item('/forms', 'nav.forms', 'list-todo'),
      ],
      STATISTICIAN: [
        item('/dashboard', 'nav.dashboard', 'layout-dashboard'),
        item('/reports', 'nav.reports', 'chart-pie'),
        item('/medical-history', 'nav.medical', 'clipboard-check'),
        item('/family-tree', 'nav.family', 'network'),
        item('/persons', 'nav.persons', 'users'),
      ],
      AUDITOR: [
        item('/audit', 'nav.audit', 'history'),
        item('/validation', 'nav.validation', 'badge-check'),
        item('/admin-portal', 'nav.systemAlerts', 'shield'),
        item('/reports', 'nav.reports', 'chart-pie'),
      ],
    };
    return [...base, ...byRole[role]];
  }
}
