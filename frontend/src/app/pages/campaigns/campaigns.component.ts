import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { Campaign, Zone } from '@/app/core/models';
import { CampaignWriteDto } from '@/app/core/dtos';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { ModalComponent } from '@/app/shared/modal/modal.component';
import { TranslatePipe } from '@/app/shared/pipes/translate.pipe';
import { ConfirmService } from '@/app/core/confirm';
import { SelectComponent } from '@/app/shared/select/select.component';
import { DatePickerComponent } from '@/app/shared/date-picker/date-picker.component';
import { LocalizedDatePipe } from '@/app/shared/pipes/localized-date.pipe';
import { CardComponent } from '@/app/shared/card/card.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { MultilangFieldComponent } from '@/app/shared/multilang-field/multilang-field.component';
import { AclLocalizedTextPipe } from '@/app/shared/pipes/localized-text.pipe';

@Component({
  selector: 'acl-campaigns',
  imports: [CommonModule, FormsModule, LucideAngularModule, TablePaginationComponent, PageSizeSelectComponent, DetailDrawerComponent, ModalComponent, TranslatePipe, SelectComponent, DatePickerComponent, LocalizedDatePipe, CardComponent, ButtonComponent, AclTooltipDirective, MultilangFieldComponent, AclLocalizedTextPipe],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.css'
})
export class CampaignsComponent implements OnInit {
  readonly campaigns = signal<Campaign[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalCampaigns = signal(0);
  readonly sortBy = signal('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  readonly pageSizes = [10, 25, 50, 100];

  readonly drawerOpen = signal(false);
  readonly selectedCampaign = signal<Campaign | null>(null);

  readonly modalOpen = signal(false);
  readonly editingCampaignId = signal<string | null>(null);
  readonly draft = signal<CampaignWriteDto>({ name: '', status: 'PLANNED', zone_ids: [] });
  readonly saving = signal(false);

  formatLocalized(val: string | Record<string, string> | null | undefined): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const lang = this.i18n.language();
    return val[lang] || val['fr'] || val['en'] || Object.values(val)[0] || '';
  }

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCampaigns() / this.pageSize())));
  readonly selectedCampaignTitle = computed(() => this.formatLocalized(this.selectedCampaign()?.name));
  readonly selectedCampaignDetails = computed<DetailDrawerItem[]>(() => {
    const c = this.selectedCampaign();
    if (!c) return [];
    return [
      { label: 'ID', value: c.id },
      { label: this.i18n.t('campaigns.name' as any) || 'Name', value: c.name },
      { label: this.i18n.t('campaigns.status' as any) || 'Status', value: c.status },
      { label: this.i18n.t('campaigns.startDate' as any) || 'Start', value: c.start_date || '' },
      { label: this.i18n.t('campaigns.endDate' as any) || 'End', value: c.end_date || '' },
    ];
  });

  readonly statusOptions = computed(() => [
    { label: this.i18n.t('status.PLANNED'), value: 'PLANNED' },
    { label: this.i18n.t('status.active'), value: 'ACTIVE' },
    { label: this.i18n.t('status.COMPLETED'), value: 'COMPLETED' }
  ]);

  constructor(private api: ApiService, readonly i18n: I18nService, private confirm: ConfirmService) { }

  ngOnInit() { this.load(); }

  load() {
    this.api.campaigns(this.page(), this.pageSize(), this.search(), this.sortBy(), this.sortOrder()).subscribe(res => {
      this.campaigns.set(res.items);
      this.totalCampaigns.set(res.total);
    });
  }

  toggleSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
    this.load();
  }

  setSearch(val: string) { this.search.set(val); this.page.set(1); this.load(); }
  setPageSize(val: number) { this.pageSize.set(val); this.page.set(1); this.load(); }
  previousPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  openDetails(c: Campaign) { this.selectedCampaign.set(c); this.drawerOpen.set(true); }

  openCreate() {
    this.editingCampaignId.set(null);
    this.draft.set({ name: '', status: 'PLANNED', zone_ids: [] });
    this.modalOpen.set(true);
  }

  editCampaign(c: Campaign) {
    this.editingCampaignId.set(c.id);
    this.draft.set({ name: c.name, status: c.status, start_date: c.start_date, end_date: c.end_date, zone_ids: c.zone_ids || [] });
    this.modalOpen.set(true);
  }

  async deleteCampaign(c: Campaign) {
    const name = this.resolveLocalizedText(c.name);
    if (await this.confirm.ask(
      this.i18n.t('action.delete'),
      this.i18n.t('campaigns.confirmDelete' as any) || `Voulez-vous vraiment supprimer la campagne "${name}" ?`,
      'danger'
    )) {
      this.api.deleteCampaign(c.id).subscribe(() => this.load());
    }
  }

  private resolveLocalizedText(val: any): string {
    if (!val) return '';
    const currentLang = this.i18n.language();
    if (typeof val === 'object' && val !== null) {
      return val[currentLang] || val['fr'] || val['en'] || Object.values(val)[0] || '';
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('{')) {
        const closeBraceIdx = trimmed.indexOf('}');
        if (closeBraceIdx !== -1) {
          const jsonPart = trimmed.substring(0, closeBraceIdx + 1);
          const codeSuffix = trimmed.substring(closeBraceIdx + 1);
          try {
            const normalized = jsonPart.replace(/'/g, '"');
            const parsed = JSON.parse(normalized);
            if (typeof parsed === 'object' && parsed !== null) {
              const text = parsed[currentLang] || parsed['fr'] || parsed['en'] || Object.values(parsed)[0] || '';
              return String(text) + codeSuffix;
            }
          } catch {}
        }
      }
    }
    return String(val);
  }

  saveCampaign() {
    this.saving.set(true);
    const req = this.editingCampaignId()
      ? this.api.updateCampaign(this.editingCampaignId()!, this.draft())
      : this.api.createCampaign(this.draft());
    req.subscribe({
      next: () => { this.saving.set(false); this.modalOpen.set(false); this.load(); },
      error: () => { this.saving.set(false); }
    });
  }
}
