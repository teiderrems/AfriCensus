import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { Zone } from '@/app/core/models';
import { ZoneWriteDto } from '@/app/core/dtos';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { ModalComponent } from '@/app/shared/modal/modal.component';
import { TranslatePipe } from '@/app/shared/pipes/translate.pipe';
import { ConfirmService } from '@/app/core/confirm';
import { SelectComponent } from '@/app/shared/select/select.component';
import { ButtonComponent } from "@/app/shared/button/button";
import { CardComponent } from '@/app/shared/card/card.component';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { MultilangFieldComponent } from '@/app/shared/multilang-field/multilang-field.component';
import { AclLocalizedTextPipe } from '@/app/shared/pipes/localized-text.pipe';

@Component({
  selector: 'acl-zones',
  imports: [CommonModule, FormsModule, LucideAngularModule, TablePaginationComponent, PageSizeSelectComponent, DetailDrawerComponent, ModalComponent, TranslatePipe, SelectComponent, CardComponent, ButtonComponent, AclTooltipDirective, MultilangFieldComponent, AclLocalizedTextPipe],
  templateUrl: './zones.component.html',
  styleUrl: './zones.component.css'
})
export class ZonesComponent implements OnInit {
  readonly zones = signal<Zone[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly sortBy = signal('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalZones = signal(0);
  readonly pageSizes = [10, 25, 50, 100];

  readonly drawerOpen = signal(false);
  readonly selectedZone = signal<Zone | null>(null);

  readonly modalOpen = signal(false);
  readonly editingZoneId = signal<string | null>(null);
  readonly draft = signal<ZoneWriteDto>({ name: '', code: '', type: 'REGIONAL', status: 'ACTIVE' });
  readonly saving = signal(false);

  formatLocalized(val: string | Record<string, string> | null | undefined): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const lang = this.i18n.language();
    return val[lang] || val['fr'] || val['en'] || Object.values(val)[0] || '';
  }

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalZones() / this.pageSize())));
  readonly selectedZoneTitle = computed(() => this.formatLocalized(this.selectedZone()?.name));
  readonly selectedZoneDetails = computed<DetailDrawerItem[]>(() => {
    const z = this.selectedZone();
    if (!z) return [];
    return [
      { label: this.i18n.t('zones.name' as any) || 'Name', value: z.name },
      { label: this.i18n.t('zones.code' as any) || 'Code', value: z.code },
      { label: this.i18n.t('zones.type' as any) || 'Type', value: z.type },
      { label: this.i18n.t('zones.parent' as any) || 'Parent', value: z.parent_id || '' },
      { label: this.i18n.t('campaigns.status' as any) || 'Status', value: z.status },
    ];
  });

  readonly parentOptions = computed(() => {
    this.i18n.language();
    return this.zones().filter(z => z.id !== this.editingZoneId()).map(z => ({ label: `${this.formatLocalized(z.name)} (${z.code})`, value: z.id }));
  });

  readonly typeOptions = computed(() => [
    { label: this.i18n.t('zone.type.national'), value: 'NATIONAL' },
    { label: this.i18n.t('zone.type.regional'), value: 'REGIONAL' },
    { label: this.i18n.t('zone.type.local'), value: 'LOCAL' }
  ]);

  constructor(private api: ApiService, readonly i18n: I18nService, private confirm: ConfirmService) { }

  ngOnInit() { this.load(); }

  load() {
    this.api.zones(this.page(), this.pageSize(), this.search(), this.sortBy(), this.sortOrder()).subscribe(res => {
      this.zones.set(res.items);
      this.totalZones.set(res.total);
    });
  }

  setSearch(val: string) { this.search.set(val); this.page.set(1); this.load(); }
  setStatusFilter(val: string) { this.statusFilter.set(val); this.page.set(1); this.load(); }
  setPageSize(val: number) { this.pageSize.set(val); this.page.set(1); this.load(); }

  toggleSort(field: string) {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.load();
  }

  previousPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  openDetails(z: Zone) { this.selectedZone.set(z); this.drawerOpen.set(true); }

  openCreate() {
    this.editingZoneId.set(null);
    this.draft.set({ name: '', code: '', type: 'REGIONAL', status: 'ACTIVE' });
    this.modalOpen.set(true);
  }

  editZone(z: Zone) {
    this.editingZoneId.set(z.id);
    this.draft.set({ name: z.name, code: z.code, type: z.type, parent_id: z.parent_id, status: z.status });
    this.modalOpen.set(true);
  }

  async deleteZone(z: Zone) {
    if (await this.confirm.ask(this.i18n.t('action.delete'), this.i18n.t('zones.confirmDelete' as any) || 'Delete?', 'danger')) {
      this.api.deleteZone(z.id).subscribe(() => this.load());
    }
  }

  saveZone() {
    this.saving.set(true);
    const req = this.editingZoneId()
      ? this.api.updateZone(this.editingZoneId()!, this.draft())
      : this.api.createZone(this.draft());
    req.subscribe({
      next: () => { this.saving.set(false); this.modalOpen.set(false); this.load(); },
      error: () => { this.saving.set(false); }
    });
  }
}
