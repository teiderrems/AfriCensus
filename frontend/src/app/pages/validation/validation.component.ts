import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, signal } from '@angular/core';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ConfirmService } from '@/app/core/confirm';
import { CensusRecord } from '@/app/core/models';
import { LocalizedDatePipe } from '@/app/shared/pipes/localized-date.pipe';
import { CardComponent } from '@/app/shared/card/card.component';
import { ButtonComponent } from '@/app/shared/button/button';

@Component({
  selector: 'acl-validation-page',
  imports: [LucideAngularModule, LocalizedDatePipe, CardComponent, ButtonComponent],
  templateUrl: './validation.component.html',
  styleUrl: './validation.component.css',
})
export class ValidationComponent implements OnInit {
  readonly items = signal<CensusRecord[]>([]);
  constructor(private readonly api: ApiService, readonly i18n: I18nService, private readonly confirmService: ConfirmService) {}

  ngOnInit(): void {
    this.load();
  }

  async validate(id: string): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('validation.confirmValidate')
    );
    if (!confirmed) return;
    this.api.validatePerson(id).subscribe({
      next: () => this.load(),
      error: () => undefined,
    });
  }

  async correction(id: string): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('validation.confirmCorrection')
    );
    if (!confirmed) return;
    this.api.requestCorrection(id, this.i18n.t('validation.defaultCorrectionMessage')).subscribe({
      next: () => this.load(),
      error: () => undefined,
    });
  }

  private load(): void {
    this.api.validationQueue().subscribe({
      next: (items) => this.items.set(items.items),
      error: () => this.items.set([]),
    });
  }
}
