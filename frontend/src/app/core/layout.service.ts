import { Injectable, signal, computed, inject } from '@angular/core';
import { User, AppFeatures } from './models';
import { I18nService } from './i18n/i18n.service';
import { TranslationKey } from './i18n/translations';
import { AppSettingsService } from './app-settings.service';
import { AuthService } from './auth.service';

const FEATURE_MAP: Record<string, keyof AppFeatures> = {
  '/messaging': 'messaging',
  '/family-tree': 'family_tree',
  '/medical-history': 'medical_history',
  '/forms': 'custom_forms',
  '/birth-declaration': 'birth_declaration',
  '/duplicates': 'duplicates',
  '/audit': 'audit',
};

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly appSettings = inject(AppSettingsService);
  private readonly auth = inject(AuthService);
  readonly isMobile = signal<boolean>(false);
  private readonly storageKeySidebar = 'africensus_sidebar_collapsed';
  
  readonly sidebarCollapsed = signal<boolean>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKeySidebar) === 'true' : false
  );
  readonly mobileDrawerOpen = signal<boolean>(false);

  constructor(private readonly i18n: I18nService) {
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(max-width: 860px)');
      this.isMobile.set(mql.matches);
      
      // Update signal when screen size changes
      mql.addEventListener('change', (e) => {
        this.isMobile.set(e.matches);
      });
    }
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKeySidebar, String(next));
    }
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update(open => !open);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  navForRole(role: User['role']): Array<{ path: string; label: string; icon: string }> {
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
    
    const all = [...base, ...byRole[role]];
    const currentUser = this.auth.currentUser();
    return all.filter(navItem => {
      const featKey = FEATURE_MAP[navItem.path];
      if (!featKey) return true;
      return this.appSettings.isFeatureEnabledForUser(featKey, currentUser);
    });
  }
}
