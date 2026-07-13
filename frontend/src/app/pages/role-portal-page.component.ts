import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n/i18n.service';
import { DashboardSummary, User } from '../core/models';

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
  imports: [RouterLink],
  template: `
    <section class="portal-page">
      @if (config(); as portal) {
        <header class="portal-hero {{ portal.tone }}">
          <div>
            <span>{{ portal.eyebrow }}</span>
            <h1>{{ portal.title }}</h1>
            <p>{{ portal.description }}</p>
          </div>
          <article class="focus-box">
            <span class="material-symbols-outlined">target</span>
            <div>
              <strong>{{ i18n.t('portal.priority') }}</strong>
              <p>{{ portal.focus }}</p>
            </div>
          </article>
        </header>

        <section class="kpi-grid" aria-label="Indicateurs du portail">
          @for (item of indicators(); track item.label) {
            <article class="kpi-card">
              <span class="material-symbols-outlined">{{ item.icon }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.label }}</p>
            </article>
          }
        </section>

        <section class="portal-grid">
          <article class="card actions-panel">
            <h2>{{ i18n.t('portal.quickActions') }}</h2>
            <div class="action-list">
              @for (action of portal.actions; track action.path + action.label) {
                <a [routerLink]="action.path" [class.primary]="action.primary">
                  <span class="material-symbols-outlined">{{ action.icon }}</span>
                  <div>
                    <strong>{{ action.label }}</strong>
                    <p>{{ action.description }}</p>
                  </div>
                </a>
              }
            </div>
          </article>

          <article class="card scope-panel">
            <h2>{{ i18n.t('portal.scope') }}</h2>
            <dl>
              <div>
                <dt>{{ i18n.t('portal.user') }}</dt>
                <dd>{{ user()?.full_name }}</dd>
              </div>
              <div>
                <dt>{{ i18n.t('portal.role') }}</dt>
                <dd>{{ i18n.t($any('role.' + (user()?.role || 'AGENT'))) }}</dd>
              </div>
              <div>
                <dt>{{ i18n.t('portal.zones') }}</dt>
                <dd>{{ user()?.zone_ids?.length || i18n.t('portal.national') }}</dd>
              </div>
              <div>
                <dt>{{ i18n.t('portal.sessionState') }}</dt>
                <dd>{{ i18n.t('portal.connected') }}</dd>
              </div>
            </dl>
          </article>
        </section>
      }
    </section>
  `,
  styles: `
    .portal-page { padding: 40px; display: grid; gap: 24px; }
    .portal-hero {
      min-height: 260px; display: flex; align-items: end; justify-content: space-between; gap: 24px;
      border: 2px solid var(--outline-soft); border-radius: 8px; padding: 32px; background: var(--surface);
      border-left-width: 8px;
    }
    .portal-hero.admin { border-left-color: var(--primary); }
    .portal-hero.supervisor { border-left-color: var(--growth); }
    .portal-hero.agent { border-left-color: var(--terracotta); }
    .portal-hero.statistician { border-left-color: var(--secondary); }
    .portal-hero.auditor { border-left-color: var(--error); }
    .portal-hero > div > span { color: var(--primary); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    h1 { margin: 8px 0 10px; font-size: 42px; line-height: 50px; }
    h2 { margin: 0 0 18px; font-size: 24px; }
    p { margin: 0; color: var(--muted); }
    .focus-box {
      width: min(100%, 360px); min-height: 120px; display: flex; align-items: start; gap: 14px;
      border: 2px solid var(--outline-soft); border-radius: 8px; padding: 18px; background: var(--surface-low);
    }
    .focus-box .material-symbols-outlined { color: var(--terracotta); font-size: 32px; }
    .focus-box strong { display: block; margin-bottom: 6px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .kpi-card {
      min-height: 140px; border: 2px solid var(--outline-soft); border-radius: 8px; padding: 18px;
      background: var(--surface); display: grid; gap: 8px; align-content: start;
    }
    .kpi-card .material-symbols-outlined { color: var(--primary); }
    .kpi-card strong { font-size: 34px; line-height: 40px; }
    .portal-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(320px, .8fr); gap: 24px; align-items: start; }
    .action-list { display: grid; gap: 12px; }
    .action-list a {
      min-height: 92px; display: flex; align-items: center; gap: 16px; border: 2px solid var(--outline-soft);
      border-radius: 8px; padding: 16px; text-decoration: none; background: var(--surface); color: var(--ink);
    }
    .action-list a.primary { border-color: var(--primary); background: var(--primary-soft); }
    .action-list .material-symbols-outlined { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; background: var(--surface-container); color: var(--primary); }
    .action-list strong { display: block; margin-bottom: 4px; }
    dl { display: grid; gap: 14px; margin: 0; }
    dl div { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--surface-high); padding-bottom: 12px; }
    dt { color: var(--muted); font-weight: 800; }
    dd { margin: 0; font-weight: 900; text-align: right; }
    @media(max-width: 1080px) {
      .portal-hero, .portal-grid { align-items: stretch; flex-direction: column; grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media(max-width: 860px) {
      .portal-page { padding: 24px 16px; }
      .portal-hero { padding: 24px; }
      h1 { font-size: 32px; line-height: 40px; }
      .kpi-grid { grid-template-columns: 1fr; }
      dl div { align-items: start; flex-direction: column; }
      dd { text-align: left; }
    }
  `,
})
export class RolePortalPageComponent implements OnInit {
  readonly summary = signal<DashboardSummary | null>(null);
  readonly user = this.auth.currentUser;
  readonly config = computed(() => this.portalFor(this.user()?.role || 'AGENT'));
  readonly indicators = computed(() => {
    const summary = this.summary();
    const role = this.user()?.role || 'AGENT';
    if (role === 'AGENT') {
      return [
        { label: this.i18n.t('portal.kpi.zoneHouseholds'), value: summary?.totalHouseholds || 0, icon: 'home' },
        { label: this.i18n.t('portal.kpi.enumeratedPersons'), value: summary?.totalPersons || 0, icon: 'groups' },
        { label: this.i18n.t('portal.kpi.toCorrect'), value: summary?.needsCorrection || 0, icon: 'edit_note' },
        { label: this.i18n.t('portal.kpi.submissions'), value: summary?.submitted || 0, icon: 'upload' },
      ];
    }
    if (role === 'STATISTICIAN') {
      return [
        { label: this.i18n.t('portal.kpi.population'), value: summary?.totalPersons || 0, icon: 'groups' },
        { label: this.i18n.t('portal.kpi.households'), value: summary?.totalHouseholds || 0, icon: 'home' },
        { label: this.i18n.t('portal.kpi.validated'), value: summary?.validated || 0, icon: 'verified' },
        { label: this.i18n.t('portal.kpi.potentialDuplicates'), value: summary?.potentialDuplicates || 0, icon: 'hub' },
      ];
    }
    if (role === 'AUDITOR') {
      return [
        { label: this.i18n.t('portal.kpi.submitted'), value: summary?.submitted || 0, icon: 'pending_actions' },
        { label: this.i18n.t('portal.kpi.corrections'), value: summary?.needsCorrection || 0, icon: 'rule' },
        { label: this.i18n.t('portal.kpi.activeAgents'), value: summary?.activeAgents || 0, icon: 'badge' },
        { label: this.i18n.t('portal.kpi.trackedZones'), value: summary?.zoneProgress.length || 0, icon: 'map' },
      ];
    }
    return [
      { label: this.i18n.t('portal.kpi.households'), value: summary?.totalHouseholds || 0, icon: 'home' },
      { label: this.i18n.t('portal.kpi.individuals'), value: summary?.totalPersons || 0, icon: 'groups' },
      { label: this.i18n.t('portal.kpi.toValidate'), value: summary?.submitted || 0, icon: 'warning' },
      { label: this.i18n.t('portal.kpi.activeAgents'), value: summary?.activeAgents || 0, icon: 'badge' },
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
          { label: this.i18n.t('portal.admin.action.adminPortal'), description: this.i18n.t('portal.admin.action.adminPortal.desc'), icon: 'admin_panel_settings', path: '/admin-portal', primary: true },
          { label: this.i18n.t('portal.admin.action.users'), description: this.i18n.t('portal.admin.action.users.desc'), icon: 'manage_accounts', path: '/admin-portal' },
          { label: this.i18n.t('portal.admin.action.audit'), description: this.i18n.t('portal.admin.action.audit.desc'), icon: 'history', path: '/audit' },
          { label: this.i18n.t('portal.admin.action.reports'), description: this.i18n.t('portal.admin.action.reports.desc'), icon: 'assessment', path: '/reports' },
        ],
      },
      SUPERVISOR: {
        eyebrow: this.i18n.t('portal.supervisor.eyebrow'),
        title: this.i18n.t('portal.supervisor.title'),
        description: this.i18n.t('portal.supervisor.description'),
        focus: this.i18n.t('portal.supervisor.focus'),
        tone: 'supervisor',
        actions: [
          { label: this.i18n.t('portal.supervisor.action.validation'), description: this.i18n.t('portal.supervisor.action.validation.desc'), icon: 'verified', path: '/validation', primary: true },
          { label: this.i18n.t('portal.supervisor.action.dashboard'), description: this.i18n.t('portal.supervisor.action.dashboard.desc'), icon: 'analytics', path: '/dashboard' },
          { label: this.i18n.t('portal.supervisor.action.households'), description: this.i18n.t('portal.supervisor.action.households.desc'), icon: 'home', path: '/households' },
          { label: this.i18n.t('portal.supervisor.action.persons'), description: this.i18n.t('portal.supervisor.action.persons.desc'), icon: 'groups', path: '/persons' },
        ],
      },
      AGENT: {
        eyebrow: this.i18n.t('portal.agent.eyebrow'),
        title: this.i18n.t('portal.agent.title'),
        description: this.i18n.t('portal.agent.description'),
        focus: this.i18n.t('portal.agent.focus'),
        tone: 'agent',
        actions: [
          { label: this.i18n.t('portal.agent.action.households'), description: this.i18n.t('portal.agent.action.households.desc'), icon: 'home', path: '/households', primary: true },
          { label: this.i18n.t('portal.agent.action.persons'), description: this.i18n.t('portal.agent.action.persons.desc'), icon: 'groups', path: '/persons' },
          { label: this.i18n.t('portal.agent.action.familyTree'), description: this.i18n.t('portal.agent.action.familyTree.desc'), icon: 'account_tree', path: '/family-tree' },
          { label: this.i18n.t('portal.agent.action.forms'), description: this.i18n.t('portal.agent.action.forms.desc'), icon: 'list_alt', path: '/forms' },
        ],
      },
      STATISTICIAN: {
        eyebrow: this.i18n.t('portal.statistician.eyebrow'),
        title: this.i18n.t('portal.statistician.title'),
        description: this.i18n.t('portal.statistician.description'),
        focus: this.i18n.t('portal.statistician.focus'),
        tone: 'statistician',
        actions: [
          { label: this.i18n.t('portal.statistician.action.reports'), description: this.i18n.t('portal.statistician.action.reports.desc'), icon: 'assessment', path: '/reports', primary: true },
          { label: this.i18n.t('portal.statistician.action.medical'), description: this.i18n.t('portal.statistician.action.medical.desc'), icon: 'clinical_notes', path: '/medical-history' },
          { label: this.i18n.t('portal.statistician.action.familyTree'), description: this.i18n.t('portal.statistician.action.familyTree.desc'), icon: 'account_tree', path: '/family-tree' },
          { label: this.i18n.t('portal.statistician.action.dashboard'), description: this.i18n.t('portal.statistician.action.dashboard.desc'), icon: 'analytics', path: '/dashboard' },
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
          { label: this.i18n.t('portal.auditor.action.validation'), description: this.i18n.t('portal.auditor.action.validation.desc'), icon: 'rule', path: '/validation' },
          { label: this.i18n.t('portal.auditor.action.adminPortal'), description: this.i18n.t('portal.auditor.action.adminPortal.desc'), icon: 'security', path: '/admin-portal' },
          { label: this.i18n.t('portal.auditor.action.reports'), description: this.i18n.t('portal.auditor.action.reports.desc'), icon: 'assessment', path: '/reports' },
        ],
      },
    };
    return configs[role];
  }
}
