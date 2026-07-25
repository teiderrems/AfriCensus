import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { DuplicateCandidate } from '@/app/core/models';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { TranslatePipe } from '@/app/shared/pipes/translate.pipe';
import { ConfirmService } from '@/app/core/confirm';
import { CardComponent } from "@/app/shared/card/card.component";
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

@Component({
  selector: 'acl-duplicates',
  imports: [CommonModule, FormsModule, LucideAngularModule, TablePaginationComponent, PageSizeSelectComponent, TranslatePipe, CardComponent, ButtonComponent, AclTooltipDirective],
  templateUrl: './duplicates.component.html',
  styleUrl: './duplicates.component.css'
})
export class DuplicatesComponent implements OnInit {
  readonly duplicates = signal<DuplicateCandidate[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalDuplicates = signal(0);
  readonly pageSizes = [10, 25, 50, 100];
  readonly scanning = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalDuplicates() / this.pageSize())));

  constructor(private api: ApiService, readonly i18n: I18nService, private confirm: ConfirmService) { }

  ngOnInit() { this.load(); }

  load() {
    this.api.duplicates(this.page(), this.pageSize(), 'PENDING').subscribe(res => {
      this.duplicates.set(res.items);
      this.totalDuplicates.set(res.total);
    });
  }

  setPageSize(val: number) { this.pageSize.set(val); this.page.set(1); this.load(); }
  previousPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  scan() {
    this.scanning.set(true);
    this.api.scanDuplicates().subscribe({
      next: () => { this.scanning.set(false); this.load(); },
      error: () => this.scanning.set(false)
    });
  }

  async resolve(id: string, action: string) {
    if (await this.confirm.ask('Confirmation', this.i18n.t('action.confirm' as any) || 'Confirm?')) {
      this.api.resolveDuplicate(id, action).subscribe(() => this.load());
    }
  }
}
