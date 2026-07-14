import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';

@Component({
  selector: 'acl-not-found-page',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  template: `
    <div class="error-page">
      <div class="content">
        <lucide-angular name="triangle-alert" class="icon"></lucide-angular>
        <h1>{{ i18n.t('error.notFound.title') }}</h1>
        <p>{{ i18n.t('error.notFound.message') }}</p>
        <a routerLink="/" class="btn primary">{{ i18n.t('nav.myPortal') }}</a>
      </div>
    </div>
  `,
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  constructor(public i18n: I18nService) {}
}
