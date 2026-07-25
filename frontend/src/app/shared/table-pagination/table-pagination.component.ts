import { Component, EventEmitter, Input, Output, inject, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

@Component({
  selector: 'acl-table-pagination',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, AclTooltipDirective],
  templateUrl: './table-pagination.component.html',
  styleUrl: './table-pagination.component.css',
})
export class TablePaginationComponent implements AfterViewInit, OnDestroy {
  i18n = inject(I18nService);
  private elementRef = inject(ElementRef);

  @Input() ariaLabel = 'Pagination du tableau';
  @Input() totalItems = 0;
  @Input() page = 1;
  @Input() totalPages = 1;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && this.page < this.totalPages && window.innerWidth <= 768) {
          this.next.emit();
        }
      }, { threshold: 0.2 });
      if (this.elementRef.nativeElement) {
        this.observer.observe(this.elementRef.nativeElement);
      }
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  get pages(): (number | string)[] {
    const total = Math.max(1, this.totalPages);
    const current = Math.max(1, Math.min(this.page, total));

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const items: (number | string)[] = [1];

    if (current > 3) {
      items.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (current < total - 2) {
      items.push('...');
    }

    items.push(total);
    return items;
  }

  goTo(target: number | string): void {
    if (typeof target !== 'number') return;
    if (target < 1 || target > this.totalPages || target === this.page) return;

    if (target === this.page - 1) {
      this.previous.emit();
    } else if (target === this.page + 1) {
      this.next.emit();
    }
    this.pageChange.emit(target);
  }
}
