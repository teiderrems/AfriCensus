import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { I18nService } from '@/app/core/i18n/i18n.service';

@Component({
  selector: 'acl-table-pagination',
  templateUrl: './table-pagination.component.html',
  styleUrl: './table-pagination.component.css',
})
export class TablePaginationComponent {
  i18n = inject(I18nService);
  @Input() ariaLabel = 'Pagination du tableau';
  @Input() totalItems = 0;
  @Input() page = 1;
  @Input() totalPages = 1;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
