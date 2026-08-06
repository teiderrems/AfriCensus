import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, signal } from '@angular/core';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ConfirmService } from '@/app/core/confirm';
import { ToastService } from '@/app/core/toast.service';
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
  readonly selectedItem = signal<CensusRecord | null>(null);
  constructor(private readonly api: ApiService, readonly i18n: I18nService, private readonly confirmService: ConfirmService, private readonly toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  viewItem(item: CensusRecord): void {
    this.selectedItem.set(item);
  }

  async validate(item: CensusRecord): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('validation.action.validate' as any) || 'Valider la fiche',
      this.i18n.t('validation.confirmValidate'),
      'warning'
    );
    if (!confirmed) return;
    
    const request = item.entity_type === 'households' 
      ? this.api.validateHousehold(item.id)
      : item.entity_type === 'form_responses'
      ? this.api.validateFormResponse(item.id)
      : this.api.validatePerson(item.id);
      
    request.subscribe({
      next: () => {
        this.toast.success(this.i18n.t('validation.success.validated'));
        this.selectedItem.set(null);
        this.load();
      },
      error: () => this.toast.error(this.i18n.t('action.error'), this.i18n.t('validation.error.validationFailed')),
    });
  }

  async correction(item: CensusRecord): Promise<void> {
    const comment = await this.confirmService.prompt(
      this.i18n.t('validation.prompt.correctionTitle'),
      this.i18n.t('validation.prompt.correctionMessage'),
      this.i18n.t('validation.prompt.correctionPlaceholder')
    );
    if (comment === null) return;
    
    const request = item.entity_type === 'households'
      ? this.api.requestCorrectionHousehold(item.id, comment)
      : item.entity_type === 'form_responses'
      ? this.api.requestCorrectionFormResponse(item.id, comment)
      : this.api.requestCorrection(item.id, comment);
      
    request.subscribe({
      next: () => {
        this.toast.success(this.i18n.t('validation.success.correctionRequested'));
        this.selectedItem.set(null);
        this.load();
      },
      error: () => this.toast.error(this.i18n.t('action.error'), this.i18n.t('validation.error.correctionFailed')),
    });
  }

  private load(): void {
    this.api.validationQueue().subscribe({
      next: (items) => this.items.set(items.items),
      error: () => this.items.set([]),
    });
  }
}
