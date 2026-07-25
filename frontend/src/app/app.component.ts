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
import { AclTooltipDirective } from './shared/tooltip/tooltip';

@Component({
  selector: 'acl-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, UpperCasePipe, ConfirmDialogComponent, AclTooltipDirective],
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
          <button type="button" (click)="toastService.remove(toast.id)" [attr.aria-label]="i18n.t('a11y.closeError')">✕</button>
        </div>
      }
    </div>

    @if (loggedIn() && !isPublicRoute()) {
      <div class="shell">
        <div class="sidebar-backdrop" [class.active]="mobileDrawerOpen()" (click)="closeMobileDrawer()" aria-hidden="true"></div>
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed()" [class.mobile-open]="mobileDrawerOpen()" aria-label="Navigation principale">
          <div class="brand">
            <div class="mark" aria-hidden="true" [aclTooltip]="sidebarCollapsed() && !mobileDrawerOpen() ? 'AfriCensus Link' : ''">AL</div>
            @if (!sidebarCollapsed() || mobileDrawerOpen()) {
              <div>
                <strong>AfriCensus Link</strong>
                <span>{{ portalRoleLabel() }}</span>
              </div>
            }
            <button type="button" class="sidebar-toggle-btn hide-mobile"
              [aclTooltip]="sidebarCollapsed() ? i18n.t('a11y.expandSidebar') : i18n.t('a11y.collapseSidebar')"
              [attr.aria-label]="sidebarCollapsed() ? i18n.t('a11y.expandSidebar') : i18n.t('a11y.collapseSidebar')"
              (click)="toggleSidebar()">
              <lucide-icon [name]="sidebarCollapsed() ? 'chevron-right' : 'chevron-left'"></lucide-icon>
            </button>
            <button type="button" class="mobile-close-btn show-mobile"
              [aclTooltip]="i18n.t('a11y.closeMenu')"
              (click)="closeMobileDrawer()">
              <lucide-icon name="x"></lucide-icon>
            </button>
          </div>
          <nav aria-label="Sections applicatives">
            @for (item of nav(); track item.path) {
              <a [routerLink]="item.path"
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                 [aclTooltip]="sidebarCollapsed() && !mobileDrawerOpen() ? item.label : ''"
                 [attr.aria-label]="item.label"
                 (click)="closeMobileDrawer()">
                <lucide-icon [name]="item.icon"></lucide-icon>
                @if (!sidebarCollapsed() || mobileDrawerOpen()) {
                  <span>{{ item.label }}</span>
                }
              </a>
            }
          </nav>
          <button class="logout" type="button" (click)="auth.logout(); closeMobileDrawer()" [aclTooltip]="sidebarCollapsed() && !mobileDrawerOpen() ? i18n.t('app.logout') : ''">
            <lucide-icon name="log-out"></lucide-icon>
            @if (!sidebarCollapsed() || mobileDrawerOpen()) {
              <span>{{ i18n.t('app.logout') }}</span>
            }
          </button>
        </aside>
        <main class="main" [class.sidebar-collapsed]="sidebarCollapsed()" id="main-content" tabindex="-1">
          <header class="topbar">
            <div class="topbar-left">
              <button type="button" class="mobile-menu-btn show-mobile" [aclTooltip]="i18n.t('a11y.toggleMenu')" (click)="toggleMobileDrawer()">
                <lucide-icon name="menu"></lucide-icon>
              </button>
              <div>
                <strong>AfriCensus Link</strong>
                <span>{{ user()?.full_name }}</span>
              </div>
            </div>
            <button class="sync-status" type="button" [class.offline]="!offline.online()" [class.pending]="offline.hasPending()" (click)="offline.syncNow()" [aclTooltip]="offline.online() ? i18n.t('sync.online') : i18n.t('sync.offline')">
              <lucide-icon [name]="offline.online() ? 'cloud' : 'cloud-off'"></lucide-icon>
              <strong>{{ offline.online() ? i18n.t('sync.online') : i18n.t('sync.offline') }}</strong>
              @if (offline.hasPending()) {
                <em>{{ offline.pendingCount() }}</em>
              }
            </button>
            <div class="top-actions">
              <button type="button" class="language-toggle" [aclTooltip]="i18n.t('a11y.language')" (click)="toggleLanguage()">
                {{ i18n.language() | uppercase }}
              </button>
              <button type="button" [aclTooltip]="i18n.t('a11y.notifications')" (click)="toggleNotifications()">
                <lucide-icon name="bell"></lucide-icon>
              </button>
              <button type="button" [aclTooltip]="i18n.t('a11y.help')" (click)="goToHelp()"><lucide-icon name="circle-question-mark"></lucide-icon></button>
              <button type="button" [aclTooltip]="theme.theme() === 'dark' ? i18n.t('a11y.enableLight') : i18n.t('a11y.enableDark')" (click)="theme.toggle()">
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
      padding: 20px 14px; display: flex; flex-direction: column; gap: 16px; position: fixed; inset: 0 auto 0 0;
      z-index: 100; box-shadow: 4px 0 20px rgba(0, 0, 0, 0.03); height: 100vh; max-height: 100vh; overflow: hidden;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sidebar.collapsed {
      width: 76px; padding: 20px 10px; align-items: center;
    }
    .sidebar.collapsed .brand {
      padding: 0; justify-content: center; width: 100%; flex-direction: column; gap: 8px;
    }
    .sidebar.collapsed nav {
      width: 100%; align-items: center; padding-right: 0;
    }
    .sidebar.collapsed nav a, .sidebar.collapsed .logout {
      justify-content: center; padding: 0; width: 48px; height: 44px; min-height: 44px; border-radius: 10px; gap: 0;
    }
    .sidebar.collapsed .logout {
      border-top: 0; padding-top: 0; width: 48px;
    }
    .sidebar-toggle-btn {
      margin-left: auto; width: 32px; height: 32px; min-width: 32px; border: 1.5px solid var(--outline-soft);
      border-radius: 8px; background: var(--surface); color: var(--primary);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s;
    }
    .sidebar-toggle-btn:hover {
      background: var(--primary-soft); border-color: var(--primary);
    }
    .sidebar.collapsed .sidebar-toggle-btn {
      margin-left: 0; width: 36px; height: 32px;
    }
    .brand { display: flex; align-items: center; gap: 12px; padding: 0 8px; flex-shrink: 0; }
    .brand strong { display: block; color: var(--primary); font-size: 22px; line-height: 28px; }
    .brand span { color: var(--muted); font-size: 12px; }
    .mark {
      width: 42px; height: 42px; border-radius: 8px; background: var(--primary); color: var(--on-primary);
      display: grid; place-items: center; font-weight: 800; flex-shrink: 0;
    }
    .sidebar nav {
      display: flex; flex-direction: column; gap: 4px; flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px;
    }
    .sidebar nav::-webkit-scrollbar { width: 5px; }
    .sidebar nav::-webkit-scrollbar-track { background: transparent; }
    .sidebar nav::-webkit-scrollbar-thumb { background: var(--outline-soft); border-radius: 4px; }
    .sidebar nav a, .logout {
      min-height: 42px; border-radius: 8px; padding: 0 12px; display: flex; align-items: center;
      gap: 12px; text-decoration: none; color: var(--muted); font-weight: 700; border: 0; background: transparent;
      font-size: 14px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
    }
    .sidebar nav a:hover {
      background: var(--surface-high); color: var(--primary); transform: translateX(3px);
    }
    .sidebar nav a.active {
      background: var(--primary); color: var(--on-primary); font-weight: 700;
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
    }
    .logout {
      margin-top: auto; border-top: 1px solid var(--outline-soft); border-radius: 0; width: 100%;
      flex-shrink: 0; padding-top: 12px; min-height: 46px;
    }
    .logout:hover {
      color: var(--error); background: var(--error-soft); border-radius: 8px;
    }
    .main { flex: 1; margin-left: 288px; min-width: 0; transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
    .main.sidebar-collapsed { margin-left: 76px; }
    .topbar {
      height: 64px; background: var(--surface); border-bottom: 2px solid var(--outline-soft);
      display: flex; align-items: center; justify-content: space-between; padding: 0 32px; position: sticky; top: 0; z-index: 10;
      gap: 12px;
    }
    .topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 auto; }
    .topbar-left div { min-width: 0; overflow: hidden; }
    .topbar strong { display: block; color: var(--primary); font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topbar span { color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .top-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
    .top-actions button {
      width: 42px; height: 42px; display: grid; place-items: center; border: 2px solid var(--outline-soft);
      border-radius: 999px; background: var(--surface); color: var(--primary); cursor: pointer; flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s;
    }
    .top-actions button:hover {
      background: var(--surface-low); border-color: var(--primary);
    }
    .language-toggle {
      font-weight: 800; font-size: 13px;
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
      min-height: 40px; display: inline-flex; align-items: center; gap: 8px; border: 2px solid var(--outline-soft);
      border-radius: 999px; padding: 0 12px; background: var(--surface); color: var(--primary); font-weight: 900;
      flex-shrink: 0; cursor: pointer; transition: background 0.15s;
    }
    .sync-status.offline { color: var(--error); border-color: var(--error); background: var(--error-soft); }
    .sync-status.pending em {
      min-width: 20px; height: 20px; display: grid; place-items: center; border-radius: 999px;
      background: var(--terracotta); color: white; font-style: normal; font-size: 11px;
    }
    .sync-status lucide-icon { font-size: 18px; }
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
      min-width: max-content; min-height: 44px; display: inline-flex; align-items: center; gap: 8px;
      padding: 0 12px; border-radius: 8px; color: var(--ink); text-decoration: none; font-weight: 800;
    }
    .mobile-nav a.active { background: var(--primary); color: var(--on-primary); }

    .sidebar-backdrop { display: none; }
    .mobile-menu-btn, .mobile-close-btn { display: none; }

    @media (max-width: 860px) {
      .main { margin-left: 0; }
      .topbar { padding: 0 16px; height: 56px; }
      .topbar-left { display: flex; align-items: center; gap: 10px; }

      .show-mobile { display: inline-flex !important; }
      .hide-mobile { display: none !important; }

      .mobile-menu-btn {
        width: 38px; height: 38px; min-width: 38px; border-radius: 8px;
        border: 2px solid var(--outline-soft); background: var(--surface);
        color: var(--primary); align-items: center; justify-content: center;
        cursor: pointer; transition: background 0.15s; flex-shrink: 0;
      }
      .mobile-menu-btn:hover { background: var(--surface-low); }

      .mobile-close-btn {
        margin-left: auto; width: 36px; height: 36px; min-width: 36px; border-radius: 8px;
        border: 1.5px solid var(--outline-soft); background: var(--surface);
        color: var(--muted); align-items: center; justify-content: center;
        cursor: pointer; transition: background 0.15s, color 0.15s;
      }
      .mobile-close-btn:hover { background: var(--surface-high); color: var(--error); }

      .sidebar-backdrop {
        display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 1050;
        opacity: 0; pointer-events: none; transition: opacity 0.25s ease-out;
      }
      .sidebar-backdrop.active {
        opacity: 1; pointer-events: auto;
      }

      .sidebar {
        position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important;
        width: 290px !important; max-width: 85vw !important; height: 100vh !important;
        z-index: 1100 !important; transform: translateX(-100%) !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 8px 0 24px rgba(0, 0, 0, 0.18) !important;
        background: var(--surface-low) !important; padding: 20px 14px !important;
      }
      .sidebar.mobile-open {
        transform: translateX(0) !important;
      }
      .sidebar.mobile-open .brand {
        justify-content: space-between; width: 100%; flex-direction: row !important;
      }
      .sidebar.mobile-open nav a, .sidebar.mobile-open .logout {
        justify-content: flex-start !important; padding: 0 12px !important;
        width: 100% !important; gap: 12px !important;
      }
      .sidebar.mobile-open nav a span, .sidebar.mobile-open .logout span {
        display: inline !important;
      }
    }
    @media (max-width: 768px) {
      .topbar-left span { display: none; } /* Hide user role subtitle on mobile */
    }
    @media (max-width: 520px) {
      .topbar {
        height: 56px; padding: 0 10px; gap: 6px;
      }
      .topbar strong { font-size: 13.5px; max-width: 110px; }
      .sync-status strong { display: none; } /* Show icon-only pill for sync status */
      .sync-status { min-height: 36px; padding: 0 8px; gap: 4px; }
      .sync-status lucide-icon { font-size: 16px; }
      .top-actions { gap: 4px; }
      .top-actions button { width: 35px; height: 35px; min-width: 35px; min-height: 35px; border-width: 1.5px; }
      .top-actions lucide-icon { font-size: 16px; }
      .language-toggle { font-size: 11px; }
      .notification-panel { top: 60px; right: 8px; width: calc(100vw - 16px); }
      .sync-panel { top: 60px; left: 8px; width: calc(100vw - 16px); }
      .mobile-nav { padding: 6px 8px; gap: 6px; }
      .mobile-nav a { min-height: 40px; padding: 0 10px; font-size: 13px; }
    }
  `,
})
export class AppComponent {
  private readonly storageKeySidebar = 'africensus_sidebar_collapsed';
  readonly sidebarCollapsed = signal<boolean>(
    localStorage.getItem(this.storageKeySidebar) === 'true'
  );
  readonly mobileDrawerOpen = signal<boolean>(false);

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(this.storageKeySidebar, String(next));
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update(open => !open);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

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
    const base = [
      item('/portal', 'nav.myPortal', 'layout-dashboard'),
      item('/messaging', 'nav.messaging', 'message-square')
    ];
    const byRole: Record<User['role'], Array<{ path: string; label: string; icon: string }>> = {
      ADMIN: [
        item('/admin-portal', 'nav.adminPortal', 'shield'),
        item('/users', 'nav.users', 'user-cog'),
        item('/dashboard', 'nav.dashboard', 'layout-dashboard'),
        item('/households', 'nav.households', 'house'),
        item('/persons', 'nav.persons', 'users'),
        item('/birth-declaration', 'nav.birthDeclaration', 'baby'),
        item('/family-tree', 'nav.family', 'network'),
        item('/medical-history', 'nav.medical', 'clipboard-check'),
        item('/validation', 'nav.validation', 'badge-check'),
        item('/reports', 'nav.reports', 'chart-pie'),
        item('/audit', 'nav.audit', 'history'),
        item('/zones', 'nav.zones', 'map-pin'),
        item('/campaigns', 'nav.campaigns', 'calendar'),
        item('/duplicates', 'nav.duplicates', 'copy'),
      ],
      SUPERVISOR: [
        item('/dashboard', 'nav.dashboard', 'layout-dashboard'),
        item('/users', 'nav.users', 'user-cog'),
        item('/validation', 'nav.validation', 'badge-check'),
        item('/households', 'nav.households', 'house'),
        item('/persons', 'nav.persons', 'users'),
        item('/birth-declaration', 'nav.birthDeclaration', 'baby'),
        item('/family-tree', 'nav.family', 'network'),
        item('/reports', 'nav.reports', 'chart-pie'),
        item('/zones', 'nav.zones', 'map-pin'),
        item('/campaigns', 'nav.campaigns', 'calendar'),
        item('/duplicates', 'nav.duplicates', 'copy'),
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
