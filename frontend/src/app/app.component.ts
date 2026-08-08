import { Component, computed } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n/i18n.service';
import { LayoutService } from './core/layout.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog';
import { ToastContainerComponent } from './layout/toast-container/toast-container.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { ScrollAnimateService } from './shared/scroll-animate/scroll-animate.service';

const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/reset-password'];

@Component({
  selector: 'acl-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ConfirmDialogComponent,
    ToastContainerComponent,
    SidebarComponent,
    TopbarComponent
  ],
  template: `
    <a class="skip-link" href="#main-content">{{ i18n.t('a11y.skipToContent') }}</a>
    
    <app-toast-container />

    @if (loggedIn() && !isPublicRoute()) {
      <div class="shell">
        <app-sidebar />
        <main class="main" [class.sidebar-collapsed]="layout.sidebarCollapsed()" id="main-content" tabindex="-1">
          <app-topbar />
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
      background: var(--primary); color: var(--on-primary); padding: 10px 14px; border-radius: 8px; font-weight: 800;
      box-shadow: 0 8px 20px rgba(0,0,0,0.2); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .skip-link:focus { transform: translateY(0); outline: 3px solid var(--terracotta); outline-offset: 2px; }
    
    .shell { height: 100dvh; overflow: hidden; display: flex; background: var(--sand-bg); }
    
    .main { flex: 1; margin-left: 288px; min-width: 0; height: 100dvh; overflow-y: auto; overflow-x: hidden; transition: margin-left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); display: flex; flex-direction: column; }
    .main.sidebar-collapsed { margin-left: 76px; }
    
    @media (max-width: 860px) {
      .main { margin-left: 0 !important; }
    }
  `
})
export class AppComponent {
  readonly loggedIn = computed(() => Boolean(this.auth.currentUser()));

  /** Reactive signal that tracks the current URL via router events — needed for zoneless change detection */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
  );

  readonly isPublicRoute = computed(() => {
    const url = this.currentUrl() ?? '/';
    return PUBLIC_ROUTES.some(r => url === r || url.startsWith(r + '?'));
  });

  constructor(
    readonly auth: AuthService,
    readonly i18n: I18nService,
    readonly layout: LayoutService,
    private readonly router: Router,
    private readonly _scrollAnimate: ScrollAnimateService,
  ) {}
}
