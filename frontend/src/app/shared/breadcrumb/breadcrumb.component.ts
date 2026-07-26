import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { filter, map } from 'rxjs/operators';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

@Component({
  selector: 'acl-breadcrumb',
  imports: [RouterLink, LucideAngularModule, AclTooltipDirective],
  template: `
    <nav class="breadcrumb-nav" aria-label="Fil d'Ariane">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
          <a routerLink="/" class="breadcrumb-link home-link" [aclTooltip]="i18n.t('nav.dashboard') || 'Accueil'">
            <lucide-icon name="house"></lucide-icon>
            <span class="home-text">{{ i18n.t('nav.dashboard') || 'Accueil' }}</span>
          </a>
        </li>
        @for (item of breadcrumbs(); track item.path; let last = $last) {
          <li class="breadcrumb-separator" aria-hidden="true">
            <lucide-icon name="chevron-right"></lucide-icon>
          </li>
          <li class="breadcrumb-item" [class.active]="last" [attr.aria-current]="last ? 'page' : null">
            @if (last) {
              <span class="breadcrumb-current">{{ item.label }}</span>
            } @else {
              <a [routerLink]="item.path" class="breadcrumb-link">{{ item.label }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      min-width: 0;
    }
    .breadcrumb-nav {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--surface-low) 80%, transparent);
      border: 1px solid color-mix(in srgb, var(--outline-soft) 60%, transparent);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      max-width: 100%;
      overflow: hidden;
    }
    .breadcrumb-list {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }
    .breadcrumb-item {
      display: inline-flex;
      align-items: center;
    }
    .breadcrumb-link {
      color: var(--muted);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 6px;
      padding: 2px 6px;
      transition: color 0.15s ease, background-color 0.15s ease;
    }
    .breadcrumb-link:hover {
      color: var(--primary);
      background-color: color-mix(in srgb, var(--primary-soft) 40%, transparent);
    }
    .breadcrumb-link:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .home-link {
      padding: 2px 8px;
      border-radius: 8px;
    }
    .home-link lucide-icon {
      font-size: 15px;
    }
    .home-text {
      font-weight: 800;
    }
    .breadcrumb-separator {
      color: var(--outline-soft);
      display: inline-flex;
      align-items: center;
      font-size: 12px;
    }
    .breadcrumb-current {
      color: var(--ink);
      font-weight: 900;
      padding: 2px 6px;
      background: color-mix(in srgb, var(--primary-soft) 30%, transparent);
      color: var(--primary);
      border-radius: 6px;
    }
    @media (max-width: 640px) {
      .breadcrumb-nav {
        padding: 3px 8px;
      }
      .breadcrumb-list {
        font-size: 12px;
        gap: 4px;
      }
      .home-text {
        display: none;
      }
    }
  `,
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    // Explicitly track language changes so Angular recomputes when switching language
    const lang = this.i18n.language();
    const url = this.currentUrl()?.split('?')[0].split('#')[0];
    if (!url || url === '/' || url === '/dashboard') {
      return [];
    }

    const segments = url.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    const pathMap: Record<string, string> = {
      'dashboard': this.i18n.t('nav.dashboard') || 'Dashboard',
      'households': this.i18n.t('nav.households') || 'Households',
      'persons': this.i18n.t('nav.persons') || 'People',
      'birth-declaration': this.i18n.t('nav.birthDeclaration') || 'Birth Declaration',
      'family-tree': this.i18n.t('nav.family') || 'Family',
      'medical-history': this.i18n.t('nav.medical') || 'Family Health',
      'validation': this.i18n.t('nav.validation') || 'Validation',
      'forms': this.i18n.t('nav.forms') || 'Form Builder',
      'reports': this.i18n.t('nav.reports') || 'Reports',
      'audit': this.i18n.t('nav.audit') || 'Audit Logs',
      'users': this.i18n.t('nav.users') || 'Users & Roles',
      'admin-portal': this.i18n.t('nav.adminPortal') || 'Admin Portal',
      'portal': this.i18n.t('nav.myPortal') || 'My Portal',
      'messaging': this.i18n.t('nav.messaging') || 'Messaging',
      'zones': lang === 'en' ? 'Zones' : 'Zones',
      'campaigns': lang === 'en' ? 'Campaigns' : 'Campagnes',
      'duplicates': lang === 'en' ? 'Duplicates' : 'Doublons',
      'unauthorized': lang === 'en' ? 'Unauthorized' : 'Accès refusé',
    };

    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      items.push({ label, path: currentPath });
    }

    return items;
  });
}
