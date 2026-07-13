import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'acl-table-pagination',
  template: `
    <div class="pagination" [attr.aria-label]="ariaLabel">
      <span>{{ totalItems }} résultat(s) · page {{ page }} / {{ totalPages }}</span>
      <div>
        <button type="button" class="btn secondary" [disabled]="page <= 1" (click)="previous.emit()">Précédent</button>
        <button type="button" class="btn secondary" [disabled]="page >= totalPages" (click)="next.emit()">Suivant</button>
      </div>
    </div>
  `,
  styles: `
    .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 18px; color: var(--muted); font-weight: 800; }
    .pagination div { display: flex; gap: 10px; }
    .btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--primary); border-radius: 6px; padding: 0 16px; font-weight: 800; background: transparent; color: var(--primary); }
    .btn:disabled { cursor: not-allowed; opacity: .65; }
    @media(max-width: 860px) {
      .pagination { align-items: stretch; flex-direction: column; }
      .pagination div { display: grid; grid-template-columns: 1fr 1fr; }
    }
  `,
})
export class TablePaginationComponent {
  @Input() ariaLabel = 'Pagination du tableau';
  @Input() totalItems = 0;
  @Input() page = 1;
  @Input() totalPages = 1;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
