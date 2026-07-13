import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type StatusOption = { value: string; label: string };

@Component({
  selector: 'acl-status-filter',
  imports: [FormsModule],
  template: `
    <div class="field">
      <label [for]="controlId">{{ label }}</label>
      <select [id]="controlId" [name]="controlId" [ngModel]="value" (ngModelChange)="valueChange.emit($event)">
        <option value="">Tous</option>
        @for (option of options; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </div>
  `,
  styles: `
    .field { display: grid; gap: 8px; min-width: 0; }
    label { color: var(--ink); font-size: 14px; font-weight: 800; line-height: 20px; }
    select { width: 100%; min-height: 48px; border: 2px solid var(--outline-soft); border-radius: 6px; background: var(--surface); color: var(--ink); padding: 9px 12px; }
    select:focus { border-color: var(--primary); outline: 3px solid color-mix(in srgb, var(--primary) 28%, transparent); outline-offset: 1px; }
  `,
})
export class StatusFilterComponent {
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
