import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { AppRole, PermissionModule, User, Zone } from '@/app/core/models';
import { AppRoleWriteDto, UserCreateDto, UserUpdateDto } from '@/app/core/dtos';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';

import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { ModalComponent } from '@/app/shared/modal/modal.component';
import { SelectComponent } from '@/app/shared/select/select.component';
import { TranslatePipe } from '@/app/shared/pipes/translate.pipe';
import { ConfirmService } from '@/app/core/confirm';
import { ToastService } from '@/app/core/toast.service';
import { ButtonComponent } from "@/app/shared/button/button";
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { LayoutService } from '@/app/core/layout.service';
import { MultilangFieldComponent } from '@/app/shared/multilang-field/multilang-field.component';
import { AclLocalizedTextPipe } from '@/app/shared/pipes/localized-text.pipe';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TablePaginationComponent,
    DetailDrawerComponent,
    ModalComponent,
    SelectComponent,
    ButtonComponent,
    AclTooltipDirective,
    MultilangFieldComponent,
    AclLocalizedTextPipe
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  readonly activeTab = signal<'users' | 'roles'>('users');

  // Users state
  readonly users = signal<User[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly search = signal('');
  readonly roleFilter = signal('');
  readonly statusFilter = signal('');
  readonly sortBy = signal('full_name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  readonly pageSizes = [5, 10, 25, 50];
  readonly loading = signal(false);
  readonly saving = signal(false);

  // User Modals & Drawers
  readonly userModalOpen = signal(false);
  readonly editingUserId = signal<string | null>(null);
  readonly userDraft = signal<UserCreateDto>({
    username: '',
    full_name: '',
    role: 'AGENT',
    password: '',
    active: true,
    zone_ids: [],
  });

  readonly passwordModalOpen = signal(false);
  readonly passwordResetUser = signal<User | null>(null);
  readonly newPassword = signal('');

  readonly selectedUser = signal<User | null>(null);

  // Roles & Permissions state
  readonly roles = signal<AppRole[]>([]);
  readonly permissionModules = signal<PermissionModule[]>([]);
  readonly roleModalOpen = signal(false);
  readonly editingRoleId = signal<string | null>(null);
  readonly roleDraft = signal<AppRoleWriteDto>({
    name: '',
    description: '',
    permissions: [],
  });

  // Zones data for dropdowns
  readonly availableZones = signal<Zone[]>([]);

  constructor(
    readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly confirm: ConfirmService,
    public readonly layout: LayoutService,
    private readonly toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadPermissions();
    this.loadZones();
  }

  setTab(tab: 'users' | 'roles'): void {
    this.activeTab.set(tab);
    if (tab === 'users') {
      this.loadUsers();
    } else {
      this.loadRoles();
    }
  }

  toggleSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
    this.loadUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadUsers();
  }

  loadUsers(append = false): void {
    this.loading.set(true);
    let activeParam: boolean | undefined = undefined;
    if (this.statusFilter() === 'active') activeParam = true;
    if (this.statusFilter() === 'inactive') activeParam = false;

    this.api.users(this.page(), this.pageSize(), this.roleFilter(), activeParam, this.search(), this.sortBy(), this.sortOrder())
      .subscribe({
        next: (res) => {
          if (append) {
            this.users.update(prev => [...prev, ...res.items]);
          } else {
            this.users.set(res.items);
          }
          this.totalItems.set(res.total);
          this.totalPages.set(Math.ceil(res.total / this.pageSize()) || 1);
          this.loading.set(false);
        },
        error: () => {
          if (!append) this.users.set([]);
          this.loading.set(false);
        }
      });
  }

  loadRoles(): void {
    this.api.getRoles().subscribe({
      next: (res) => this.roles.set(res),
      error: () => { },
    });
  }

  loadPermissions(): void {
    this.api.availablePermissions().subscribe({
      next: (res) => this.permissionModules.set(res),
      error: () => { },
    });
  }

  loadZones(): void {
    this.api.zones(1, 200).subscribe({
      next: (res) => this.availableZones.set(res.items),
      error: () => { },
    });
  }

  onSearchChange(query: string): void {
    this.search.set(query);
    this.page.set(1);
    this.loadUsers();
  }

  onRoleFilterChange(role: string): void {
    this.roleFilter.set(role);
    this.page.set(1);
    this.loadUsers();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadUsers();
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadUsers(this.layout.isMobile());
    }
  }

  readonly availableFeaturesList = [
    { key: 'messaging', label: 'Messagerie' },
    { key: 'family_tree', label: 'Arbre Généalogique' },
    { key: 'medical_history', label: 'Antécédents Médicaux' },
    { key: 'custom_forms', label: 'Formulaires' },
    { key: 'birth_declaration', label: 'Déclarations Naissance' },
    { key: 'duplicates', label: 'Gestion Doublons' },
    { key: 'audit', label: 'Piste d\'Audit' },
  ];

  isFeatureDisabledInDraft(featureKey: string): boolean {
    const list = this.userDraft().disabled_features || [];
    return list.includes(featureKey);
  }

  toggleFeatureDisabled(featureKey: string): void {
    const current = [...(this.userDraft().disabled_features || [])];
    const index = current.indexOf(featureKey);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(featureKey);
    }
    this.userDraft.update(d => ({ ...d, disabled_features: current }));
  }

  // --- USER ACTIONS ---
  openCreateUserModal(): void {
    this.editingUserId.set(null);
    this.userDraft.set({
      username: '',
      full_name: '',
      role: 'AGENT',
      password: '',
      active: true,
      zone_ids: [],
      disabled_features: [],
    });
    this.userModalOpen.set(true);
  }

  editUser(user: User): void {
    this.editingUserId.set(user.id);
    this.userDraft.set({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      password: '',
      active: user.active !== false,
      zone_ids: user.zone_ids || [],
      disabled_features: user.disabled_features || [],
    });
    this.userModalOpen.set(true);
  }

  saveUser(): void {
    const draft = this.userDraft();
    if (!draft.username || !draft.full_name || !draft.role) return;
    if (!this.editingUserId() && !draft.password) return;

    this.saving.set(true);
    if (this.editingUserId()) {
      const updatePayload: UserUpdateDto = {
        username: draft.username,
        full_name: draft.full_name,
        role: draft.role,
        active: draft.active,
        zone_ids: draft.zone_ids,
        disabled_features: draft.disabled_features,
      };
      this.api.updateUser(this.editingUserId()!, updatePayload).subscribe({
        next: () => {
          this.saving.set(false);
          this.userModalOpen.set(false);
          this.toastService.success(this.i18n.t('action.success') || 'Succès');
          this.loadUsers();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.api.createUser(draft).subscribe({
        next: () => {
          this.saving.set(false);
          this.userModalOpen.set(false);
          this.toastService.success(this.i18n.t('action.success') || 'Succès');
          this.loadUsers();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  toggleActive(user: User): void {
    const action$ = user.active !== false
      ? this.api.deactivateUser(user.id)
      : this.api.activateUser(user.id);

    action$.subscribe({
      next: () => {
        this.toastService.success(this.i18n.t('action.success') || 'Succès');
        this.loadUsers();
      },
      error: () => { },
    });
  }

  openPasswordModal(user: User): void {
    this.passwordResetUser.set(user);
    this.newPassword.set('');
    this.passwordModalOpen.set(true);
  }

  savePasswordReset(): void {
    const user = this.passwordResetUser();
    const pwd = this.newPassword();
    if (!user || !pwd) return;

    this.saving.set(true);
    this.api.resetUserPassword(user.id, pwd).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordModalOpen.set(false);
        this.toastService.success(this.i18n.t('action.success') || 'Succès');
      },
      error: () => this.saving.set(false),
    });
  }

  async deleteUser(user: User): Promise<void> {
    const ok = await this.confirm.ask(
      this.i18n.t('admin.users.action.delete'),
      this.i18n.t('admin.users.confirmDelete')
        .replace('{name}', user.full_name)
        .replace('{username}', user.username),
      'danger'
    );

    if (ok) {
      this.api.deleteUser(user.id).subscribe({
        next: () => {
          this.toastService.success(this.i18n.t('action.success') || 'Succès');
          this.loadUsers();
        },
        error: () => { },
      });
    }
  }

  // --- ROLE & PERMISSION ACTIONS ---
  openCreateRoleModal(): void {
    this.editingRoleId.set(null);
    this.roleDraft.set({
      name: '',
      description: '',
      permissions: [],
      disabled_features: [],
    });
    this.roleModalOpen.set(true);
  }

  editRole(role: AppRole): void {
    this.editingRoleId.set(role.id);
    this.roleDraft.set({
      name: role.name,
      description: role.description || '',
      permissions: [...(role.permissions || [])],
      disabled_features: [...(role.disabled_features || [])],
    });
    this.roleModalOpen.set(true);
  }

  isFeatureDisabledInRoleDraft(featureKey: string): boolean {
    const list = this.roleDraft().disabled_features || [];
    return list.includes(featureKey);
  }

  toggleFeatureDisabledInRole(featureKey: string): void {
    const current = [...(this.roleDraft().disabled_features || [])];
    const index = current.indexOf(featureKey);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(featureKey);
    }
    this.roleDraft.update(d => ({ ...d, disabled_features: current }));
  }

  isPermissionSelected(key: string): boolean {
    return this.roleDraft().permissions.includes(key);
  }

  togglePermission(key: string): void {
    const current = [...this.roleDraft().permissions];
    const index = current.indexOf(key);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(key);
    }
    this.roleDraft.update((d) => ({ ...d, permissions: current }));
  }

  toggleModulePermissions(module: PermissionModule): void {
    const current = [...this.roleDraft().permissions];
    const keys = module.permissions.map((p) => p.key);
    const allSelected = keys.every((k) => current.includes(k));

    let updated: string[];
    if (allSelected) {
      updated = current.filter((k) => !keys.includes(k));
    } else {
      updated = Array.from(new Set([...current, ...keys]));
    }
    this.roleDraft.update((d) => ({ ...d, permissions: updated }));
  }

  isModuleAllSelected(module: PermissionModule): boolean {
    const current = this.roleDraft().permissions;
    return module.permissions.every((p) => current.includes(p.key));
  }

  saveRole(): void {
    const draft = this.roleDraft();
    const nameStr = typeof draft.name === 'string' ? draft.name : (Object.values(draft.name)[0] || '');
    if (!nameStr.trim()) return;

    this.saving.set(true);
    if (this.editingRoleId()) {
      this.api.updateRole(this.editingRoleId()!, draft).subscribe({
        next: () => {
          this.saving.set(false);
          this.roleModalOpen.set(false);
          this.toastService.success(this.i18n.t('action.success') || 'Succès');
          this.loadRoles();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.api.createRole(draft).subscribe({
        next: () => {
          this.saving.set(false);
          this.roleModalOpen.set(false);
          this.toastService.success(this.i18n.t('action.success') || 'Succès');
          this.loadRoles();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  async deleteRole(role: AppRole): Promise<void> {
    if (role.is_system) return;
    const ok = await this.confirm.ask(
      this.i18n.t('admin.roles.deleteRole' as any) || 'Supprimer le rôle',
      this.i18n.t('admin.roles.confirmDelete').replace('{name}', role.name),
      'danger'
    );

    if (ok) {
      this.api.deleteRole(role.id).subscribe({
        next: () => {
          this.toastService.success(this.i18n.t('action.success') || 'Succès');
          this.loadRoles();
        },
        error: () => { },
      });
    }
  }

  // --- HELPERS ---
  initials(name: string): string {
    if (!name) return 'US';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  }

  roleOptions = computed(() => {
    this.i18n.language();
    return [
      { label: this.i18n.t('admin.users.filterRoleAll'), value: '' },
      { label: 'ADMIN - Administrateur', value: 'ADMIN' },
      { label: 'SUPERVISOR - Superviseur', value: 'SUPERVISOR' },
      { label: 'AGENT - Agent Recenseur', value: 'AGENT' },
      { label: 'STATISTICIAN - Statisticien', value: 'STATISTICIAN' },
      { label: 'AUDITOR - Auditeur', value: 'AUDITOR' },
      ...this.roles()
        .filter((r) => !['ADMIN', 'SUPERVISOR', 'AGENT', 'STATISTICIAN', 'AUDITOR'].includes(typeof r.name === 'string' ? r.name : (r.name?.['fr'] || '')))
        .map((r) => ({ label: this.formatLocalizedText(r.name), value: r.name })),
    ];
  });

  userFormRoleOptions = computed(() => {
    this.i18n.language();
    return [
      { label: 'ADMIN - Administrateur National', value: 'ADMIN' },
      { label: 'SUPERVISOR - Superviseur Régional', value: 'SUPERVISOR' },
      { label: 'AGENT - Agent Recenseur', value: 'AGENT' },
      { label: 'STATISTICIAN - Analyste Statisticien', value: 'STATISTICIAN' },
      { label: 'AUDITOR - Auditeur Sécurité', value: 'AUDITOR' },
      ...this.roles()
        .filter((r) => !['ADMIN', 'SUPERVISOR', 'AGENT', 'STATISTICIAN', 'AUDITOR'].includes(typeof r.name === 'string' ? r.name : (r.name?.['fr'] || '')))
        .map((r) => ({ label: this.formatLocalizedText(r.name), value: r.name })),
    ];
  });

  statusOptions = computed(() => {
    this.i18n.language();
    return [
      { label: this.i18n.t('admin.users.filterStatusAll'), value: '' },
      { label: this.i18n.t('admin.users.filterStatusActive'), value: 'active' },
      { label: this.i18n.t('admin.users.filterStatusInactive'), value: 'inactive' },
    ];
  });

  zoneOptions = computed(() => {
    this.i18n.language();
    return this.availableZones().map((z) => {
      const name = this.formatLocalizedText(z.name);
      return { label: `${name} (${z.code})`, value: z.id };
    });
  });

  private formatLocalizedText(val: any): string {
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
          } catch {
            // fallback
          }
        }
      }
    }
    return String(val);
  }

  toggleZoneSelection(zoneId: string): void {
    const current = [...this.userDraft().zone_ids];
    const index = current.indexOf(zoneId);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(zoneId);
    }
    this.userDraft.update((d) => ({ ...d, zone_ids: current }));
  }

  selectedUserDetails = computed<DetailDrawerItem[]>(() => {
    const u = this.selectedUser();
    if (!u) return [];
    return [
      { label: this.i18n.t('admin.users.drawerUsername'), value: u.username },
      { label: this.i18n.t('admin.users.drawerFullName'), value: u.full_name },
      { label: this.i18n.t('admin.users.drawerRole'), value: u.role },
      { label: this.i18n.t('admin.users.drawerStatus'), value: u.active !== false ? this.i18n.t('admin.users.statusActive') : this.i18n.t('admin.users.statusInactive') },
      { label: this.i18n.t('admin.users.drawerZones'), value: u.zone_ids && u.zone_ids.length ? u.zone_ids.join(', ') : this.i18n.t('admin.users.zoneNational') },
    ];
  });
}
