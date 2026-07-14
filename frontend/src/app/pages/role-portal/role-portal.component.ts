import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '@/app/core/api.service';
import { AuthService } from '@/app/core/auth.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { DashboardSummary, User } from '@/app/core/models';

type PortalAction = {
  label: string;
  description: string;
  icon: string;
  path: string;
  primary?: boolean;
};

type PortalConfig = {
  eyebrow: string;
  title: string;
  description: string;
  focus: string;
  tone: 'admin' | 'supervisor' | 'agent' | 'statistician' | 'auditor';
  actions: PortalAction[];
};

@Component({
  selector: 'acl-role-portal-page',
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './role-portal.component.html',
  styleUrl: './role-portal.component.css',
})
export class RolePortalComponent implements OnInit {
  readonly summary = signal<DashboardSummary | null>(null);
  readonly user = this.auth.currentUser;
  readonly config = computed(() => this.portalFor(this.user()?.role || 'AGENT'));
  readonly indicators = computed(() => {
    const summary = this.summary();
    const role = this.user()?.role || 'AGENT';
    if (role === 'AGENT') {
      return [
        { label: this.i18n.t('portal.kpi.zoneHouseholds'), value: summary?.totalHouseholds || 0, icon: 'house' },
        { label: this.i18n.t('portal.kpi.enumeratedPersons'), value: summary?.totalPersons || 0, icon: 'users' },
        { label: this.i18n.t('portal.kpi.toCorrect'), value: summary?.needsCorrection || 0, icon: 'file-pen' },
        { label: this.i18n.t('portal.kpi.submissions'), value: summary?.submitted || 0, icon: 'upload' },
      ];
    }
    if (role === 'STATISTICIAN') {
      return [
        { label: this.i18n.t('portal.kpi.population'), value: summary?.totalPersons || 0, icon: 'users' },
        { label: this.i18n.t('portal.kpi.households'), value: summary?.totalHouseholds || 0, icon: 'house' },
        { label: this.i18n.t('portal.kpi.validated'), value: summary?.validated || 0, icon: 'badge-check' },
        { label: this.i18n.t('portal.kpi.potentialDuplicates'), value: summary?.potentialDuplicates || 0, icon: 'box' },
      ];
    }
    if (role === 'AUDITOR') {
      return [
        { label: this.i18n.t('portal.kpi.submitted'), value: summary?.submitted || 0, icon: 'clock' },
        { label: this.i18n.t('portal.kpi.corrections'), value: summary?.needsCorrection || 0, icon: 'check-square' },
        { label: this.i18n.t('portal.kpi.activeAgents'), value: summary?.activeAgents || 0, icon: 'id-card' },
        { label: this.i18n.t('portal.kpi.trackedZones'), value: summary?.zoneProgress.length || 0, icon: 'map' },
      ];
    }
    return [
      { label: this.i18n.t('portal.kpi.households'), value: summary?.totalHouseholds || 0, icon: 'house' },
      { label: this.i18n.t('portal.kpi.individuals'), value: summary?.totalPersons || 0, icon: 'users' },
      { label: this.i18n.t('portal.kpi.toValidate'), value: summary?.submitted || 0, icon: 'triangle-alert' },
      { label: this.i18n.t('portal.kpi.activeAgents'), value: summary?.activeAgents || 0, icon: 'id-card' },
    ];
  });

  constructor(private readonly api: ApiService, private readonly auth: AuthService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.dashboard().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }

  private portalFor(role: User['role']): PortalConfig {
    const configs: Record<User['role'], PortalConfig> = {
      ADMIN: {
        eyebrow: this.i18n.t('portal.admin.eyebrow'),
        title: this.i18n.t('portal.admin.title'),
        description: this.i18n.t('portal.admin.description'),
        focus: this.i18n.t('portal.admin.focus'),
        tone: 'admin',
        actions: [
          { label: this.i18n.t('portal.admin.action.adminPortal'), description: this.i18n.t('portal.admin.action.adminPortal.desc'), icon: 'shield-alert', path: '/admin-portal', primary: true },
          { label: this.i18n.t('portal.admin.action.users'), description: this.i18n.t('portal.admin.action.users.desc'), icon: 'user-cog', path: '/admin-portal' },
          { label: this.i18n.t('portal.admin.action.audit'), description: this.i18n.t('portal.admin.action.audit.desc'), icon: 'history', path: '/audit' },
          { label: this.i18n.t('portal.admin.action.reports'), description: this.i18n.t('portal.admin.action.reports.desc'), icon: 'chart-pie', path: '/reports' },
        ],
      },
      SUPERVISOR: {
        eyebrow: this.i18n.t('portal.supervisor.eyebrow'),
        title: this.i18n.t('portal.supervisor.title'),
        description: this.i18n.t('portal.supervisor.description'),
        focus: this.i18n.t('portal.supervisor.focus'),
        tone: 'supervisor',
        actions: [
          { label: this.i18n.t('portal.supervisor.action.validation'), description: this.i18n.t('portal.supervisor.action.validation.desc'), icon: 'badge-check', path: '/validation', primary: true },
          { label: this.i18n.t('portal.supervisor.action.dashboard'), description: this.i18n.t('portal.supervisor.action.dashboard.desc'), icon: 'chart-column', path: '/dashboard' },
          { label: this.i18n.t('portal.supervisor.action.households'), description: this.i18n.t('portal.supervisor.action.households.desc'), icon: 'house', path: '/households' },
          { label: this.i18n.t('portal.supervisor.action.persons'), description: this.i18n.t('portal.supervisor.action.persons.desc'), icon: 'users', path: '/persons' },
        ],
      },
      AGENT: {
        eyebrow: this.i18n.t('portal.agent.eyebrow'),
        title: this.i18n.t('portal.agent.title'),
        description: this.i18n.t('portal.agent.description'),
        focus: this.i18n.t('portal.agent.focus'),
        tone: 'agent',
        actions: [
          { label: this.i18n.t('portal.agent.action.households'), description: this.i18n.t('portal.agent.action.households.desc'), icon: 'house', path: '/households', primary: true },
          { label: this.i18n.t('portal.agent.action.persons'), description: this.i18n.t('portal.agent.action.persons.desc'), icon: 'users', path: '/persons' },
          { label: this.i18n.t('portal.agent.action.familyTree'), description: this.i18n.t('portal.agent.action.familyTree.desc'), icon: 'network', path: '/family-tree' },
          { label: this.i18n.t('portal.agent.action.forms'), description: this.i18n.t('portal.agent.action.forms.desc'), icon: 'list-todo', path: '/forms' },
        ],
      },
      STATISTICIAN: {
        eyebrow: this.i18n.t('portal.statistician.eyebrow'),
        title: this.i18n.t('portal.statistician.title'),
        description: this.i18n.t('portal.statistician.description'),
        focus: this.i18n.t('portal.statistician.focus'),
        tone: 'statistician',
        actions: [
          { label: this.i18n.t('portal.statistician.action.reports'), description: this.i18n.t('portal.statistician.action.reports.desc'), icon: 'chart-pie', path: '/reports', primary: true },
          { label: this.i18n.t('portal.statistician.action.medical'), description: this.i18n.t('portal.statistician.action.medical.desc'), icon: 'clipboard-check', path: '/medical-history' },
          { label: this.i18n.t('portal.statistician.action.familyTree'), description: this.i18n.t('portal.statistician.action.familyTree.desc'), icon: 'network', path: '/family-tree' },
          { label: this.i18n.t('portal.statistician.action.dashboard'), description: this.i18n.t('portal.statistician.action.dashboard.desc'), icon: 'chart-column', path: '/dashboard' },
        ],
      },
      AUDITOR: {
        eyebrow: this.i18n.t('portal.auditor.eyebrow'),
        title: this.i18n.t('portal.auditor.title'),
        description: this.i18n.t('portal.auditor.description'),
        focus: this.i18n.t('portal.auditor.focus'),
        tone: 'auditor',
        actions: [
          { label: this.i18n.t('portal.auditor.action.audit'), description: this.i18n.t('portal.auditor.action.audit.desc'), icon: 'history', path: '/audit', primary: true },
          { label: this.i18n.t('portal.auditor.action.validation'), description: this.i18n.t('portal.auditor.action.validation.desc'), icon: 'check-square', path: '/validation' },
          { label: this.i18n.t('portal.auditor.action.adminPortal'), description: this.i18n.t('portal.auditor.action.adminPortal.desc'), icon: 'shield', path: '/admin-portal' },
          { label: this.i18n.t('portal.auditor.action.reports'), description: this.i18n.t('portal.auditor.action.reports.desc'), icon: 'chart-pie', path: '/reports' },
        ],
      },
    };
    return configs[role];
  }
}
