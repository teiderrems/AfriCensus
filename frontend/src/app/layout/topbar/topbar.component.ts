import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme.service';
import { OfflineSyncService } from '../../core/offline-sync.service';
import { NotificationService } from '../../core/notification.service';
import { LayoutService } from '../../core/layout.service';
import { ApiService } from '../../core/api.service';
import { AclTooltipDirective } from '../../shared/tooltip/tooltip';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [LucideAngularModule, UpperCasePipe, AclTooltipDirective],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  readonly user = this.auth.currentUser;
  readonly loggedIn = computed(() => Boolean(this.user()));
  readonly nav = computed(() => this.layout.navForRole(this.user()?.role || 'AGENT'));

  private readonly notificationVisible = signal(false);
  readonly notificationsOpen = computed(() => this.notificationVisible());

  constructor(
    readonly auth: AuthService,
    readonly i18n: I18nService,
    readonly theme: ThemeService,
    readonly offline: OfflineSyncService,
    readonly notificationService: NotificationService,
    readonly layout: LayoutService,
    private readonly apiService: ApiService,
    private readonly router: Router
  ) { }

  toggleNotifications(): void {
    this.notificationVisible.update((visible) => !visible);
  }

  toggleLanguage(): void {
    const next = this.i18n.language() === 'fr' ? 'en' : 'fr';
    this.i18n.setLanguage(next);

    if (this.loggedIn()) {
      this.apiService.updateProfile({ preferred_language: next }).subscribe();
    }
  }

  goToHelp(): void {
    if (this.loggedIn()) {
      this.router.navigateByUrl('/portal');
      return;
    }
    window.location.hash = 'support';
  }

  markNotifAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }
}
