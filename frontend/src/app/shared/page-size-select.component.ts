import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'acl-page-size-select',
  imports: [FormsModule],
  template: `
    <div class="field">
      <label [for]="controlId">Par page</label>
      <select [id]="controlId" [name]="controlId" [ngModel]="value" (ngModelChange)="valueChange.emit(Number($event))">
        @for (size of options; track size) {
          <option [ngValue]="size">{{ size }}</option>
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
export class PageSizeSelectComponent {
  @Input() controlId = 'pageSize';
  @Input() value = 10;
  @Input() options: number[] = [5, 10, 20, 50];
  @Output() valueChange = new EventEmitter<number>();

  protected readonly Number = Number;
}
