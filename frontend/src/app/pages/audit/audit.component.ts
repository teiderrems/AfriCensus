import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { LayoutService } from '@/app/core/layout.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { AuditLog } from '@/app/core/models';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';

import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { LocalizedDatePipe } from '@/app/shared/pipes/localized-date.pipe';
import { ShortIdPipe } from '@/app/shared/pipes/short-id.pipe';
import { CardComponent } from '@/app/shared/card/card.component'
import { ButtonComponent } from "@/app/shared/button/button";
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

@Component({
  imports: [CardComponent, LucideAngularModule, FormsModule, DetailDrawerComponent, TablePaginationComponent, LocalizedDatePipe, ShortIdPipe, SelectComponent, ButtonComponent, AclTooltipDirective],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit {
  auditEntityOptions = computed(() => [
    { label: this.i18n.t('audit.entity.all'), value: '' },
    { label: this.i18n.t('audit.entity.PERSON'), value: 'PERSON' },
    { label: this.i18n.t('audit.entity.HOUSEHOLD'), value: 'HOUSEHOLD' },
    { label: this.i18n.t('audit.entity.CAMPAIGN'), value: 'CAMPAIGN' },
    { label: this.i18n.t('audit.entity.USER'), value: 'USER' },
    { label: this.i18n.t('audit.entity.SYSTEM'), value: 'SYSTEM' }
  ]);

  readonly logs = signal<AuditLog[]>([]);
  readonly search = signal('');
  readonly entityFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizes = [5, 10, 20, 50];
  readonly selectedLog = signal<AuditLog | null>(null);
  readonly entityOptions = computed(() => Array.from(new Set(this.logs().map((log) => log.entity_type))).sort());
  readonly filteredLogs = computed(() => {
    const query = this.search().trim().toLowerCase();
    const entity = this.entityFilter();
    return this.logs().filter((log) => {
      const matchesEntity = !entity || log.entity_type === entity;
      const searchable = `${log.created_at} ${log.action} ${log.entity_type} ${log.entity_id} ${log.user_id || 'system'}`.toLowerCase();
      return matchesEntity && (!query || searchable.includes(query));
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLogs().length / this.pageSize())));
  readonly pagedLogs = computed(() => {
    const page = Math.min(this.page(), this.totalPages());
    if (this.layout.isMobile()) {
      return this.filteredLogs().slice(0, page * this.pageSize());
    }
    const start = (page - 1) * this.pageSize();
    return this.filteredLogs().slice(start, start + this.pageSize());
  });
  readonly logDrawerOpen = computed(() => Boolean(this.selectedLog()));
  readonly selectedLogTitle = computed(() => this.selectedLog()?.action || this.i18n.t('audit.table.details'));
  readonly selectedLogDetails = computed<DetailDrawerItem[]>(() => {
    const log = this.selectedLog();
    if (!log) return [];
    return [
      { label: this.i18n.t('audit.drawer.id'), value: this.shortId.transform(log.id) },
      { label: this.i18n.t('audit.drawer.date'), value: this.localizedDate.transform(log.created_at) },
      { label: this.i18n.t('audit.drawer.action'), value: log.action },
      { label: this.i18n.t('audit.drawer.entityType'), value: log.entity_type },
      { label: this.i18n.t('audit.drawer.entityId'), value: log.entity_name || this.shortId.transform(log.entity_id) },
      { label: this.i18n.t('audit.drawer.user'), value: log.user_name || this.userName(log.user_id) },
    ];
  });

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly shortId: ShortIdPipe,
    private readonly localizedDate: LocalizedDatePipe,
    private readonly layout: LayoutService
  ) { }
  ngOnInit(): void {
    this.api.auditLogs().subscribe({
      next: (logs) => this.logs.set(logs.items),
      error: () => this.logs.set([]),
    });
  }

  userName(userId: string | null): string {
    if (!userId) return 'system';
    return this.shortId.transform(userId);
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setEntityFilter(value: string): void {
    this.entityFilter.set(value);
    this.page.set(1);
  }

  setPageSize(value: number | string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
  }

  previousPage(): void {
    this.page.set(Math.max(1, this.page() - 1));
  }

  nextPage(): void {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
  }

  openLog(log: AuditLog): void {
    this.selectedLog.set(log);
  }
}
