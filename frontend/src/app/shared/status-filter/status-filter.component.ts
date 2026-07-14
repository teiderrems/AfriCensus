import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { I18nService } from '@/app/core/i18n/i18n.service';

type StatusOption = { value: string; label: string };

@Component({
  selector: 'acl-status-filter',
  imports: [LucideAngularModule, FormsModule, SelectComponent],
  templateUrl: './status-filter.component.html',
  styleUrl: './status-filter.component.css',
})
export class StatusFilterComponent {
  constructor(public i18n: I18nService) {}
  
  @Input() controlId = 'statusFilter';
  @Input() label = 'Statut';
  @Input() value = '';
  @Input() options: StatusOption[] = [
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'SUBMITTED', label: 'Soumis' },
    { value: 'VALIDATED', label: 'Validé' },
    { value: 'NEEDS_CORRECTION', label: 'Correction' },
    { value: 'REJECTED', label: 'Rejeté' },
  ];
  @Output() valueChange = new EventEmitter<string>();
}
