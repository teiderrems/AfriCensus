import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { User } from '../../core/models';
import { LayoutService } from '../../core/layout.service';
import { AclTooltipDirective } from '../../shared/tooltip/tooltip';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, AclTooltipDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  readonly user = this.auth.currentUser;
  
  readonly nav = computed(() => this.layout.navForRole(this.user()?.role || 'AGENT'));
  
  readonly portalRoleLabel = computed(() => {
    const role = this.user()?.role;
    if (!role) return this.i18n.t('app.portal');
    return this.i18n.t(('role.' + role) as TranslationKey);
  });

  constructor(
    readonly auth: AuthService,
    readonly i18n: I18nService,
    readonly layout: LayoutService
  ) {}
}
