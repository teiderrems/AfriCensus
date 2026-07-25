import { DatePickerComponent } from '@/app/shared/date-picker/date-picker.component';
import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { AuditLog, DashboardSummary, HomeContent, User, UserCreateInput, UserRole } from '@/app/core/models';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { ModalComponent } from '@/app/shared/modal/modal.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { LocalizedDatePipe } from '@/app/shared/pipes/localized-date.pipe';
import { ShortIdPipe } from '@/app/shared/pipes/short-id.pipe';
import { CommonModule } from '@angular/common';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

type HealthCard = {
  label: string;
  value: string;
  detail: string;
  status: string;
  icon: string;
  tone: 'success' | 'primary' | 'warning';
  progress?: number;
};

type AdminTab = 'infra' | 'users' | 'security' | 'config';

import { ConfirmService } from '@/app/core/confirm';
import { ButtonComponent } from '@/app/shared/button/button';

@Component({
  selector: 'acl-admin-portal-page',
  imports: [LucideAngularModule, CommonModule, FormsModule, RouterLink, DetailDrawerComponent, TablePaginationComponent, ModalComponent, LocalizedDatePipe, ShortIdPipe, SelectComponent, DatePickerComponent, ButtonComponent, AclTooltipDirective],
  templateUrl: './admin-portal.component.html',
  styleUrl: './admin-portal.component.css',
})
export class AdminPortalComponent implements OnInit {
  adminRoleFilterOptions = computed(() => [
    { label: this.i18n.t('status.all'), value: '' },
    { label: this.roleLabel('ADMIN'), value: 'ADMIN' },
    { label: this.roleLabel('SUPERVISOR'), value: 'SUPERVISOR' },
    { label: this.roleLabel('AGENT'), value: 'AGENT' },
    { label: this.roleLabel('AUDITOR'), value: 'AUDITOR' },
    { label: this.roleLabel('STATISTICIAN'), value: 'STATISTICIAN' }
  ]);
  adminStatusFilterOptions = computed(() => [
    { label: this.i18n.t('status.all'), value: '' },
    { label: this.i18n.t('status.active'), value: 'active' },
    { label: this.i18n.t('status.inactive'), value: 'inactive' }
  ]);
  auditSeverityOptions = computed(() => [
    { label: this.i18n.t('admin.security.allSeverities'), value: '' },
    { label: this.i18n.t('admin.security.sev.critical'), value: 'critical' },
    { label: this.i18n.t('admin.security.sev.warning'), value: 'warning' },
    { label: this.i18n.t('admin.security.sev.info'), value: 'info' }
  ]);
  defaultLocaleOptions = computed(() => [
    { label: 'French (Senegal)', value: 'fr-SN' },
    { label: 'English (Nigeria)', value: 'en-NG' },
    { label: 'Swahili (Kenya)', value: 'sw-KE' }
  ]);
  userRoleOptions = computed(() => this.roles.map(r => ({ label: this.roleLabel(r), value: r })));

  readonly roles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'STATISTICIAN', 'AUDITOR'];
  readonly tabs = computed<{ id: AdminTab; label: string; icon: string }[]>(() => {
    this.i18n.language();
    return [
      { id: 'infra', label: this.i18n.t('admin.tabs.infra'), icon: 'activity' },
      { id: 'users', label: this.i18n.t('admin.tabs.users'), icon: 'users' },
      { id: 'security', label: this.i18n.t('admin.tabs.security'), icon: 'shield' },
      { id: 'config', label: this.i18n.t('admin.tabs.config'), icon: 'settings' },
    ];
  });
  readonly activeTab = signal<AdminTab>('infra');
  readonly users = signal<User[]>([]);
  readonly zones = signal<any[]>([]);

  readonly zoneOptions = computed(() => this.zones().map(z => ({
    label: z.name,
    value: z.id
  })));
  readonly summary = signal<DashboardSummary | null>(null);
  readonly auditLogs = signal<AuditLog[]>([]);
  readonly homeContent = signal<HomeContent | null>(null);
  readonly homeContentJson = signal('');
  readonly homeContentStatus = signal('');
  readonly dismissedAlertIds = signal<Set<string>>(new Set());
  readonly userFiltersOpen = signal(false);
  readonly userEditorOpen = signal(false);
  readonly editingUserId = signal<string | null>(null);
  readonly userDraft = signal<UserCreateInput>(this.emptyUserDraft());
  readonly passwordDraft = signal('');
  readonly userFormStatus = signal('');
  readonly userSearch = signal('');
  readonly roleFilter = signal('');
  readonly statusFilter = signal('');
  readonly auditSearch = signal('');
  readonly auditSeverity = signal('');
  readonly systemName = signal('AfriCensus National Deployment');
  readonly defaultLocale = signal('fr-SN');
  readonly supportEmail = signal('admin-ops@africensus.gov');
  readonly collectionStart = signal('2026-07-01');
  readonly collectionEnd = signal('2026-12-31');
  readonly strictWindow = signal(true);
  readonly configStatus = signal('');
  readonly userPage = signal(1);
  readonly selectedUser = signal<User | null>(null);
  readonly selectedAuditLog = signal<AuditLog | null>(null);
  readonly pageSize = 5;
  readonly lastUpdated = signal('Just now');
  readonly apiVolume = [40, 60, 35, 85, 50, 95, 70, 45, 60, 40, 72, 54];

  readonly filteredUsers = computed(() => {
    const query = this.userSearch().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    return this.users().filter((user) => {
      const searchable = `${user.full_name} ${user.username} ${user.role} ${user.zone_ids.join(' ')}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesRole = !role || user.role === role;
      const matchesStatus = !status || (status === 'active' ? user.active !== false : user.active === false);
      return matchesQuery && matchesRole && matchesStatus;
    });
  });
  readonly userTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));
  readonly pagedUsers = computed(() => {
    const start = (Math.min(this.userPage(), this.userTotalPages()) - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });
  readonly userDrawerOpen = computed(() => Boolean(this.selectedUser()));
  readonly selectedUserTitle = computed(() => this.selectedUser()?.full_name || this.i18n.t('admin.drawer.details'));
  readonly selectedUserDetails = computed<DetailDrawerItem[]>(() => {
    const user = this.selectedUser();
    if (!user) return [];
    return [
      { label: this.i18n.t('admin.drawer.identifier'), value: user.id },
      { label: this.i18n.t('admin.drawer.username'), value: user.username },
      { label: this.i18n.t('admin.drawer.role'), value: this.roleLabel(user.role) },
      { label: this.i18n.t('admin.drawer.zones'), value: user.zone_ids.length ? user.zone_ids.join(', ') : this.i18n.t('admin.users.zoneNational') },
      { label: this.i18n.t('admin.drawer.active'), value: user.active !== false },
    ];
  });
  readonly filteredAuditLogs = computed(() => {
    const query = this.auditSearch().trim().toLowerCase();
    const severity = this.auditSeverity();
    return this.auditLogs().filter((log) => {
      const logSeverity = this.auditSeverityFor(log);
      const searchable = `${log.action} ${log.entity_type} ${log.entity_id} ${log.user_id || 'system'}`.toLowerCase();
      return (!severity || logSeverity === severity) && (!query || searchable.includes(query));
    });
  });
  readonly auditDrawerOpen = computed(() => Boolean(this.selectedAuditLog()));
  readonly selectedAuditTitle = computed(() => (this.selectedAuditLog() ? this.auditTitle(this.selectedAuditLog()!.action) : this.i18n.t('admin.drawer.details')));
  readonly selectedAuditDetails = computed<DetailDrawerItem[]>(() => {
    const log = this.selectedAuditLog();
    if (!log) return [];
    return [
      { label: this.i18n.t('admin.drawer.identifier'), value: log.id },
      { label: this.i18n.t('admin.drawer.timestamp'), value: log.created_at },
      { label: this.i18n.t('admin.drawer.severity'), value: this.auditSeverityFor(log) },
      { label: this.i18n.t('admin.drawer.action'), value: this.auditTitle(log.action) },
      { label: this.i18n.t('admin.drawer.entity'), value: log.entity_type },
      { label: this.i18n.t('admin.drawer.entityId'), value: log.entity_name || log.entity_id },
      { label: this.i18n.t('admin.drawer.actor'), value: log.user_name || this.userName(log.user_id) },
    ];
  });
  readonly activeSessions = computed(() => Math.max(1, this.users().filter((user) => user.active !== false).length * 47));
  readonly failedAttempts = computed(() => Math.max(3, this.auditLogs().filter((log) => log.action.includes('LOGIN') || log.action.includes('REJECT')).length * 7));
  readonly healthCards = computed<HealthCard[]>(() => {
    const summary = this.summary();
    return [
      {
        label: this.i18n.t('admin.health.serverStatus'),
        value: this.i18n.t('admin.health.stable'),
        detail: this.i18n.t('admin.health.primaryNode'),
        status: 'ONLINE',
        icon: 'server',
        tone: 'success',
      },
      {
        label: this.i18n.t('admin.health.dbLoad'),
        value: `${Math.min(95, Math.max(20, (summary?.submitted || 0) * 8 + 35))}%`,
        detail: `${summary?.totalPersons || 0} ${this.i18n.t('admin.health.individualsIndexed')}`,
        status: 'OPTIMAL',
        icon: 'database',
        tone: 'primary',
        progress: Math.min(95, Math.max(20, (summary?.submitted || 0) * 8 + 35)),
      },
      {
        label: this.i18n.t('admin.health.adminSessions'),
        value: String(this.users().filter((user) => user.active).length),
        detail: `${this.users().filter((user) => user.role === 'ADMIN').length} ${this.i18n.t('admin.health.national')}, ${this.users().filter((user) => user.role !== 'ADMIN').length} ${this.i18n.t('admin.health.field')}`,
        status: 'ACTIVE',
        icon: 'id-card',
        tone: 'warning',
      },
    ];
  });
  readonly criticalAlerts = computed(() => {
    const dismissed = this.dismissedAlertIds();
    const logs = this.auditLogs().filter((log) => !dismissed.has(log.id)).slice(0, 3);
    if (!logs.length) {
      return [
        {
          id: 'system-1',
          icon: 'shield-check',
          title: this.i18n.t('admin.alert.baseline'),
          time: this.i18n.t('admin.alert.justNow'),
          message: this.i18n.t('admin.alert.noAnomalies'),
          action: '',
        },
      ];
    }
    return logs.map((log) => ({
      id: log.id,
      icon: log.action.includes('REJECT') ? 'gpp_maybe' : 'settings_suggest',
      title: this.auditTitle(log.action),
      time: log.created_at,
      message: `${log.entity_type} ${log.entity_id} ${this.i18n.t('admin.alert.processedBy')} ${log.user_id || 'system'}.`,
      action: log.action.includes('EXPORT') ? this.i18n.t('admin.alert.reviewExport') : this.i18n.t('admin.alert.reviewDiff'),
    }));
  });

  constructor(private readonly api: ApiService, private readonly router: Router, readonly i18n: I18nService, private readonly confirmService: ConfirmService) { }

  ngOnInit(): void {
    this.lastUpdated.set(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    forkJoin({
      users: this.api.users(),
      summary: this.api.dashboard(),
      logs: this.api.auditLogs(),
      home: this.api.homeContentSource(),
      zones: this.api.zones(),
    }).subscribe({
      next: ({ users, summary, logs, home, zones }) => {
        this.users.set(users.items);
        this.summary.set(summary);
        this.auditLogs.set(logs.items);
        this.setHomeContent(home);
        this.zones.set(zones.items);
      },
      error: () => {
        this.users.set([]);
        this.summary.set(null);
        this.auditLogs.set([]);
        this.zones.set([]);
      },
    });
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }

  refreshAdminData(): void {
    this.lastUpdated.set(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    forkJoin({
      users: this.api.users(),
      summary: this.api.dashboard(),
      logs: this.api.auditLogs(),
      zones: this.api.zones(),
    }).subscribe({
      next: ({ users, summary, logs, zones }) => {
        this.users.set(users.items);
        this.summary.set(summary);
        this.auditLogs.set(logs.items);
        this.zones.set(zones.items);
      },
      error: () => undefined,
    });
  }

  toggleUserFilters(): void {
    this.userFiltersOpen.update((open) => !open);
  }

  setUserSearch(value: string): void {
    this.userSearch.set(value);
    this.userPage.set(1);
  }

  setRoleFilter(value: string): void {
    this.roleFilter.set(value);
    this.userPage.set(1);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.userPage.set(1);
  }

  prepareNewUser(): void {
    this.editingUserId.set(null);
    this.userDraft.set(this.emptyUserDraft());
    this.passwordDraft.set('');
    this.userFormStatus.set('');
    this.userEditorOpen.set(true);
  }

  editUser(user: User): void {
    this.editingUserId.set(user.id);
    this.userDraft.set({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      password: '',
      active: user.active !== false,
      zone_ids: user.zone_ids,
    });
    this.passwordDraft.set('');
    this.userFormStatus.set('');
    this.userEditorOpen.set(true);
  }

  closeUserEditor(): void {
    this.userEditorOpen.set(false);
    this.editingUserId.set(null);
    this.userDraft.set(this.emptyUserDraft());
    this.passwordDraft.set('');
  }

  updateUserDraft<Key extends keyof UserCreateInput>(key: Key, value: UserCreateInput[Key]): void {
    this.userDraft.update((draft) => ({ ...draft, [key]: value }));
  }


  canSaveUser(): boolean {
    const draft = this.userDraft();
    return Boolean(draft.username.trim().length >= 3 && draft.full_name.trim() && (this.editingUserId() || this.passwordDraft().length >= 6));
  }

  async saveUser(): Promise<void> {
    if (!this.canSaveUser()) return;
    const confirmed = await this.confirmService.ask(this.i18n.t('action.confirm'), this.i18n.t('admin.confirmSaveUser'));
    if (!confirmed) return;
    const id = this.editingUserId();
    const draft = this.userDraft();
    const request = id
      ? this.api.updateUser(id, {
        username: draft.username,
        full_name: draft.full_name,
        active: draft.active,
        zone_ids: draft.zone_ids,
      })
      : this.api.createUser({ ...draft, password: this.passwordDraft() });
    request.subscribe({
      next: (user) => {
        this.upsertUser(user);
        this.userFormStatus.set(id ? this.i18n.t('admin.status.userUpdated') : this.i18n.t('admin.status.userCreated'));
        if (id && user.role !== draft.role) {
          this.api.changeUserRole(id, draft.role).subscribe({
            next: (updated) => this.upsertUser(updated),
            error: () => this.userFormStatus.set(this.i18n.t('admin.status.roleError')),
          });
        }
        this.passwordDraft.set('');
      },
      error: () => this.userFormStatus.set(this.i18n.t('admin.status.saveError')),
    });
  }

  resetSelectedUserPassword(): void {
    const id = this.editingUserId();
    if (!id || this.passwordDraft().length < 6) return;
    this.api.resetUserPassword(id, this.passwordDraft()).subscribe({
      next: () => {
        this.passwordDraft.set('');
        this.userFormStatus.set(this.i18n.t('admin.status.pwdReset'));
      },
      error: () => this.userFormStatus.set(this.i18n.t('admin.status.pwdError')),
    });
  }

  toggleUserActive(user: User): void {
    const request = user.active === false ? this.api.activateUser(user.id) : this.api.deactivateUser(user.id);
    request.subscribe({
      next: (updated) => this.upsertUser(updated),
      error: () => this.userFormStatus.set(this.i18n.t('admin.status.statusError')),
    });
  }

  async deleteUser(user: User): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('admin.confirmDeleteUser'),
      'danger'
    );
    if (!confirmed) return;

    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((rows) => rows.filter((row) => row.id !== user.id));
        if (this.selectedUser()?.id === user.id) this.selectedUser.set(null);
      },
      error: () => this.userFormStatus.set(this.i18n.t('admin.status.deleteError')),
    });
  }

  openUserDrawer(user: User): void {
    this.selectedUser.set(user);
  }

  setAuditSeverity(value: string): void {
    this.auditSeverity.set(value);
  }

  setAuditSearch(value: string): void {
    this.auditSearch.set(value);
  }

  clearAuditFilters(): void {
    this.auditSeverity.set('');
    this.auditSearch.set('');
  }

  exportAuditLog(): void {
    this.router.navigateByUrl('/audit');
  }

  openAuditLog(log: AuditLog): void {
    this.selectedAuditLog.set(log);
  }

  discardConfig(): void {
    this.systemName.set('AfriCensus National Deployment');
    this.defaultLocale.set('fr-SN');
    this.supportEmail.set('admin-ops@africensus.gov');
    this.collectionStart.set('2026-07-01');
    this.collectionEnd.set('2026-12-31');
    this.strictWindow.set(true);
    this.configStatus.set(this.i18n.t('admin.status.configReset'));
  }

  async saveSystemConfig(): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('admin.confirmSaveConfig')
    );
    if (!confirmed) return;
    this.configStatus.set(this.i18n.t('admin.status.configSaved'));
  }

  reloadHomeContent(): void {
    this.homeContentStatus.set('');
    this.api.homeContentSource().subscribe({
      next: (content) => {
        this.setHomeContent(content);
        this.homeContentStatus.set(this.i18n.t('admin.status.contentReloaded'));
      },
      error: () => this.homeContentStatus.set(this.i18n.t('admin.status.contentError')),
    });
  }

  async saveHomeContent(): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('admin.confirmSaveHome')
    );
    if (!confirmed) return;

    this.homeContentStatus.set('');
    let payload: HomeContent;
    try {
      payload = JSON.parse(this.homeContentJson()) as HomeContent;
    } catch {
      this.homeContentStatus.set(this.i18n.t('admin.status.jsonError'));
      return;
    }
    this.api.updateHomeContent(payload).subscribe({
      next: (content) => {
        this.setHomeContent(content);
        this.homeContentStatus.set(this.i18n.t('admin.status.homePublished'));
      },
      error: () => this.homeContentStatus.set(this.i18n.t('admin.status.publishError')),
    });
  }

  previousUserPage(): void {
    this.userPage.set(Math.max(1, this.userPage() - 1));
  }

  nextUserPage(): void {
    this.userPage.set(Math.min(this.userTotalPages(), this.userPage() + 1));
  }

  handleAlertAction(alertId: string, action: string): void {
    if (action.includes('Review')) {
      this.router.navigateByUrl('/audit');
      return;
    }
    this.dismissedAlertIds.update((ids) => new Set([...ids, alertId]));
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  roleLabel(role: User['role']): string {
    return {
      ADMIN: this.i18n.t('admin.role.admin'),
      SUPERVISOR: this.i18n.t('admin.role.supervisor'),
      AGENT: this.i18n.t('admin.role.agent'),
      STATISTICIAN: this.i18n.t('admin.role.statistician'),
      AUDITOR: this.i18n.t('admin.role.auditor'),
    }[role];
  }

  private upsertUser(user: User): void {
    this.users.update((rows) => {
      const exists = rows.some((row) => row.id === user.id);
      return exists ? rows.map((row) => (row.id === user.id ? user : row)) : [user, ...rows];
    });
  }

  private emptyUserDraft(): UserCreateInput {
    return {
      username: '',
      full_name: '',
      role: 'AGENT',
      password: '',
      active: true,
      zone_ids: [],
    };
  }

  private setHomeContent(content: HomeContent): void {
    this.homeContent.set(content);
    this.homeContentJson.set(JSON.stringify(content, null, 2));
  }

  auditSeverityFor(log: AuditLog): 'critical' | 'warning' | 'info' {
    if (log.action.includes('DELETE') || log.action.includes('REJECT') || log.action.includes('DEACTIVATE')) return 'critical';
    if (log.action.includes('EXPORT') || log.action.includes('ROLE') || log.action.includes('PASSWORD')) return 'warning';
    return 'info';
  }

  auditTitle(action: string): string {
    return action
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  userName(userId: string | null): string {
    if (!userId) return 'system';
    const user = this.users().find(u => u.id === userId);
    return user ? user.full_name : userId;
  }
}
