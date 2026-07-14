import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';

@Component({
  selector: 'acl-unauthorized-page',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.css',
})
export class UnauthorizedComponent {
  constructor(readonly i18n: I18nService) {}
}
