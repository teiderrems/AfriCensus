import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { DuplicateCandidate } from '@/app/core/models';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';

import { TranslatePipe } from '@/app/shared/pipes/translate.pipe';
import { ConfirmService } from '@/app/core/confirm';
import { CardComponent } from "@/app/shared/card/card.component";
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { LayoutService } from '@/app/core/layout.service';

@Component({
  selector: 'acl-duplicates',
  imports: [CommonModule, FormsModule, LucideAngularModule, TablePaginationComponent, TranslatePipe, CardComponent, ButtonComponent, AclTooltipDirective],
  templateUrl: './duplicates.component.html'
})
export class DuplicatesComponent implements OnInit {
  readonly duplicates = signal<DuplicateCandidate[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalDuplicates = signal(0);
  readonly pageSizes = [10, 25, 50, 100];
  readonly scanning = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalDuplicates() / this.pageSize())));

  constructor(
    private api: ApiService, 
    readonly i18n: I18nService, 
    private confirm: ConfirmService,
    private layout: LayoutService
  ) { }

  ngOnInit() { this.load(); }

  load(append = false) {
    this.api.duplicates(this.page(), this.pageSize(), 'PENDING').subscribe(res => {
      if (append) {
        this.duplicates.update(prev => [...prev, ...res.items]);
      } else {
        this.duplicates.set(res.items);
      }
      this.totalDuplicates.set(res.total);
    });
  }

  setPageSize(val: number) { this.pageSize.set(val); this.page.set(1); this.load(); }
  previousPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(this.layout.isMobile()); } }

  scan() {
    this.scanning.set(true);
    this.api.scanDuplicates().subscribe({
      next: () => { this.scanning.set(false); this.load(); },
      error: () => this.scanning.set(false)
    });
  }

  async resolve(id: string, action: string) {
    const title = action === 'MERGE' ? this.i18n.t('duplicates.merge') : this.i18n.t('duplicates.notDuplicate');
    const message = action === 'MERGE' ? this.i18n.t('duplicates.confirmMerge') : this.i18n.t('duplicates.confirmNotDuplicate');
    
    if (await this.confirm.ask(title, message, action === 'MERGE' ? 'warning' : 'danger')) {
      this.api.resolveDuplicate(id, action).subscribe(() => this.load());
    }
  }
}
