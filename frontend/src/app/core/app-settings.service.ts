import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppSettingsConfig, AppFeatures, User, AppRole } from './models';
import { ThemeService } from './theme.service';

const DEFAULTS: AppSettingsConfig = {
  branding: {
    app_name: 'AfriCensus Link',
    logo_url: 'assets/logo.png',
    primary_color: '#0284c7',
    secondary_color: '#10b981',
    primary_color_dark: '#38bdf8',
    secondary_color_dark: '#34d399',
    font_family: 'Inter, Arial, sans-serif',
    base_font_size: '14px',
    card_radius: '16px',
    button_radius: '8px',
    sidebar_bg: '',
    sidebar_text: '',
    favicon_url: null,
    login_heading: null,
    login_subheading: null,
    default_theme: 'light',
  },
  settings: {
    default_locale: 'fr',
    timezone: 'Africa/Abidjan',
    date_format: 'DD/MM/YYYY',
    max_household_size: 30,
    strict_collection_window: false,
  },
  features: {
    messaging: true,
    family_tree: true,
    medical_history: true,
    custom_forms: true,
    csv_export: true,
    birth_declaration: true,
    duplicates: true,
    audit: true,
  },
  help: {
    quick_guide: { fr: '', en: '' },
    contact_email: '',
    contact_phone: ''
  }
};

const FEATURE_PERMISSION_MAP: Record<string, string> = {
  messaging: 'messaging:access',
  family_tree: 'family_tree:access',
  medical_history: 'medical:read',
  custom_forms: 'forms:access',
  birth_declaration: 'birth_declaration:access',
  duplicates: 'duplicates:manage',
  audit: 'audit:read',
};

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly http = inject(HttpClient);
  private readonly themeService = inject(ThemeService);

  private readonly _config = signal<AppSettingsConfig>(DEFAULTS);

  // Public signals
  readonly branding = computed(() => this._config().branding);
  readonly settings = computed(() => this._config().settings);
  readonly features = computed(() => this._config().features);
  readonly help = computed(() => this._config().help);
  readonly appName = computed(() => this._config().branding.app_name);
  readonly logoUrl = computed(() => this._config().branding.logo_url);

  readonly roles = signal<AppRole[]>([]);

  /** Called via APP_INITIALIZER — loads settings before first render */
  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<AppSettingsConfig>('/api/v1/app-settings')
      );
      this._config.set(config);
      this._applyTheme(config);
    } catch {
      // Use defaults — app still works without backend
      this._applyTheme(DEFAULTS);
    }
  }

  async loadRoles(): Promise<void> {
    try {
      const list = await firstValueFrom(this.http.get<AppRole[]>('/api/v1/roles'));
      if (Array.isArray(list)) {
        this.roles.set(list);
      }
    } catch { }
  }

  /** Apply branding CSS vars and theme class to document root */
  private _applyTheme(config: AppSettingsConfig): void {
    const root = document.documentElement;
    const b = config.branding;

    root.style.setProperty('--admin-primary', b.primary_color);
    root.style.setProperty('--admin-secondary', b.secondary_color);
    root.style.setProperty('--admin-primary-dark', b.primary_color_dark);
    root.style.setProperty('--admin-secondary-dark', b.secondary_color_dark);

    // Derive soft/on variants from the hex color
    root.style.setProperty('--admin-primary-soft', this._hexToSoft(b.primary_color, 0.12));
    root.style.setProperty('--admin-secondary-soft', this._hexToSoft(b.secondary_color, 0.12));
    root.style.setProperty('--admin-primary-soft-dark', this._hexToSoft(b.primary_color_dark, 0.12));
    root.style.setProperty('--admin-secondary-soft-dark', this._hexToSoft(b.secondary_color_dark, 0.12));

    root.style.setProperty('--admin-font-family', b.font_family);
    root.style.setProperty('--admin-base-font-size', b.base_font_size);

    // Geometry
    root.style.setProperty('--admin-card-radius', b.card_radius);
    root.style.setProperty('--admin-button-radius', b.button_radius);

    // Sidebar
    if (b.sidebar_bg) root.style.setProperty('--admin-sidebar-bg', b.sidebar_bg);
    else root.style.removeProperty('--admin-sidebar-bg');
    if (b.sidebar_text) root.style.setProperty('--admin-sidebar-text', b.sidebar_text);
    else root.style.removeProperty('--admin-sidebar-text');

    // Favicon
    this._applyFavicon(b.favicon_url);

    const userTheme = localStorage.getItem('africensus_theme');
    if (!userTheme) {
      this.themeService.set(b.default_theme === 'dark' ? 'dark' : 'light');
    } else {
      this.themeService.apply(this.themeService.theme());
    }

    // Update document title
    document.title = b.app_name;
  }

  /** Apply updated config from admin portal immediately (will take full effect on next reload) */
  applyConfig(config: AppSettingsConfig): void {
    this._config.set(config);
    this._applyTheme(config);
  }

  /** Check if a feature is enabled globally AND permitted for the user's role */
  isFeatureEnabledForUser(featureKey: keyof AppFeatures, user?: User | null, rolesInput?: AppRole[] | null): boolean {
    if (this.features()[featureKey] === false) return false;
    if (!user) return true;
    if (user.role === 'ADMIN') return true;

    const requiredPerm = FEATURE_PERMISSION_MAP[featureKey];
    if (!requiredPerm) return true;

    const rolesList = rolesInput && rolesInput.length > 0 ? rolesInput : this.roles();
    if (rolesList.length > 0 && user.role) {
      const userRoleObj = rolesList.find(r => r.id === user.role || r.name === user.role);
      if (userRoleObj && userRoleObj.permissions) {
        return userRoleObj.permissions.includes(requiredPerm);
      }
    }
    return true;
  }

  /** Dynamically updates the page favicon */
  private _applyFavicon(url: string | null): void {
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  /** Converts a hex color to rgba with given alpha */
  private _hexToSoft(hex: string, alpha: number): string {
    try {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return hex;
    }
  }
}
