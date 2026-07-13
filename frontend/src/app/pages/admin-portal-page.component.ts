import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { AuditLog, DashboardSummary, HomeContent, User, UserCreateInput, UserRole } from '../core/models';
import { DetailDrawerComponent, DetailDrawerItem } from '../shared/detail-drawer.component';
import { ModalComponent } from '../shared/modal.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';
import { LocalizedDatePipe } from '../shared/pipes/localized-date.pipe';
import { ShortIdPipe } from '../shared/pipes/short-id.pipe';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'acl-admin-portal-page',
  imports: [CommonModule, FormsModule, RouterLink, DetailDrawerComponent, TablePaginationComponent, ModalComponent, LocalizedDatePipe, ShortIdPipe],
  template: `
    <section class="admin-page">
      <header class="admin-hero">
        <div>
          <span class="eyebrow">{{ i18n.t('admin.infra.eyebrow') }}</span>
          <h1>{{ i18n.t('admin.infra.title') }}</h1>
          <p>{{ i18n.t('admin.infra.subtitle') }}</p>
        </div>
        <div class="last-update" [attr.aria-label]="i18n.t('admin.infra.lastUpdatedAria')">
          <span>{{ i18n.t('admin.infra.lastUpdated') }}</span>
          <strong>{{ lastUpdated() }}</strong>
        </div>
      </header>

      <nav class="admin-tabs" [attr.aria-label]="i18n.t('admin.tabs.aria')">
        @for (tab of tabs(); track tab.id) {
          <button type="button" [class.active]="activeTab() === tab.id" (click)="setTab(tab.id)">
            <span class="material-symbols-outlined">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        }
      </nav>

      @if (activeTab() === 'infra') {
        <section class="tab-header">
          <div>
            <h2>{{ i18n.t('admin.infra.overviewTitle') }}</h2>
            <p><span class="live-dot"></span> {{ i18n.t('admin.infra.overviewSubtitle') }} {{ lastUpdated() }}.</p>
          </div>
          <button type="button" class="btn secondary" (click)="refreshAdminData()">
            <span class="material-symbols-outlined">history</span>
            {{ i18n.t('admin.infra.viewLogs') }}
          </button>
        </section>

        <section class="health-grid" aria-label="État du système">
          @for (card of healthCards(); track card.label) {
            <article class="health-card {{ card.tone }}">
              <div class="health-top">
                <span class="icon material-symbols-outlined">{{ card.icon }}</span>
                <span class="status">{{ card.status }}</span>
              </div>
              <span class="label">{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              @if (card.progress !== undefined) {
                <div class="meter" aria-hidden="true"><i [style.width.%]="card.progress"></i></div>
              }
              <p>{{ card.detail }}</p>
            </article>
          }
        </section>

        <section class="infra-grid">
          <article class="panel topology-panel">
            <div class="panel-head compact">
              <div>
                <h2>{{ i18n.t('admin.infra.nodesTitle') }}</h2>
                <p>{{ i18n.t('admin.infra.nodesSubtitle') }}</p>
              </div>
              <button type="button" class="link-button" (click)="refreshAdminData()">{{ i18n.t('admin.infra.viewFullMap') }}</button>
            </div>
            <div class="topology-map" aria-label="Carte de topologie infrastructure">
              <span class="node alpha"><i></i>Node Alpha</span>
              <span class="node beta"><i></i>Node Beta</span>
              <span class="node gamma warning"><i></i>Node Gamma</span>
              <strong>Interactive Topology Map Area</strong>
            </div>
          </article>
          <article class="panel metrics-panel">
            <h2>{{ i18n.t('admin.infra.metricsTitle') }}</h2>
            <p>{{ i18n.t('admin.infra.apiVolume') }}</p>
            <div class="bars" [attr.aria-label]="i18n.t('admin.infra.apiVolumeAria')">
              @for (bar of apiVolume; track $index) {
                <i [style.height.%]="bar"></i>
              }
            </div>
            <div class="metric-row">
              <span>{{ i18n.t('admin.infra.avgResponseTime') }}</span>
              <strong>142ms</strong>
            </div>
            <div class="metric-row">
              <span>{{ i18n.t('admin.infra.successRate') }}</span>
              <strong class="success">99.98%</strong>
            </div>
          </article>
        </section>
      }

      @if (activeTab() === 'users') {
        <section class="tab-header">
          <div>
            <h2>{{ i18n.t('admin.users.title') }}</h2>
            <p>{{ i18n.t('admin.users.subtitle') }}</p>
          </div>
          <div class="tab-actions">
            <button type="button" class="btn secondary" (click)="toggleUserFilters()">
              <span class="material-symbols-outlined">filter_list</span>
              {{ i18n.t('admin.users.filters') }}
            </button>
            <button type="button" class="btn primary" (click)="prepareNewUser()">
              <span class="material-symbols-outlined">person_add</span>
              {{ i18n.t('admin.users.createUser') }}
            </button>
          </div>
        </section>

        @if (userFiltersOpen()) {
          <section class="panel filters-panel">
            <div class="field">
              <label for="adminUserSearch">Recherche</label>
              <input id="adminUserSearch" name="adminUserSearch" type="search" [ngModel]="userSearch()" (ngModelChange)="setUserSearch($event)" placeholder="Nom, rôle, zone..." />
            </div>
            <div class="field">
              <label for="adminRoleFilter">Rôle</label>
              <select id="adminRoleFilter" name="adminRoleFilter" [ngModel]="roleFilter()" (ngModelChange)="setRoleFilter($event)">
                <option value="">Tous</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Superviseur</option>
                <option value="AGENT">Agent</option>
                <option value="STATISTICIAN">Statisticien</option>
                <option value="AUDITOR">Auditeur</option>
              </select>
            </div>
            <div class="field">
              <label for="adminStatusFilter">Statut</label>
              <select id="adminStatusFilter" name="adminStatusFilter" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)">
                <option value="">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </section>
        }
        <article class="panel users-panel">
          <div class="panel-head">
            <div>
              <h2>{{ i18n.t('admin.users.summaryTitle') }}</h2>
              <p>{{ filteredUsers().length }} {{ i18n.t('admin.users.summaryFiltered') }} {{ users().length }}</p>
            </div>
            <a routerLink="/persons">{{ i18n.t('admin.users.viewAll') }}</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>{{ i18n.t('admin.users.table.user') }}</th><th>{{ i18n.t('admin.users.table.role') }}</th><th>{{ i18n.t('admin.users.table.zones') }}</th><th>{{ i18n.t('admin.users.table.status') }}</th><th>{{ i18n.t('admin.users.table.lastLogin') }}</th><th>{{ i18n.t('admin.users.table.actions') }}</th></tr>
              </thead>
              <tbody>
                @for (user of pagedUsers(); track user.id) {
                  <tr>
                    <td>
                      <div class="identity">
                        <span>{{ initials(user.full_name) }}</span>
                        <strong>{{ user.full_name }}</strong>
                      </div>
                    </td>
                    <td>{{ roleLabel(user.role) }}</td>
                    <td>{{ user.zone_ids.length || i18n.t('admin.users.zoneNational') }}</td>
                    <td><span class="admin-chip" [class.offline]="!user.active">{{ user.active ? i18n.t('admin.users.statusActive') : i18n.t('admin.users.statusDraft') }}</span></td>
                    <td class="muted-cell">{{ i18n.t('admin.users.recentSession') }}</td>
                    <td class="row-actions">
                      <button type="button" class="icon-action" aria-label="Voir les détails utilisateur" (click)="openUserDrawer(user)">
                        <span class="material-symbols-outlined">visibility</span>
                      </button>
                      <button type="button" class="icon-action" aria-label="Modifier utilisateur" (click)="editUser(user)">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button type="button" class="icon-action" [attr.aria-label]="user.active === false ? 'Activer utilisateur' : 'Désactiver utilisateur'" (click)="toggleUserActive(user)">
                        <span class="material-symbols-outlined">{{ user.active === false ? 'toggle_on' : 'toggle_off' }}</span>
                      </button>
                      <button type="button" class="icon-action danger" aria-label="Supprimer utilisateur" (click)="deleteUser(user)">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <acl-table-pagination
            ariaLabel="Pagination des utilisateurs administratifs"
            [totalItems]="filteredUsers().length"
            [page]="userPage()"
            [totalPages]="userTotalPages()"
            (previous)="previousUserPage()"
            (next)="nextUserPage()"
          />
        </article>
      }

      @if (activeTab() === 'security') {
        <section class="tab-header">
          <div>
            <h2>{{ i18n.t('admin.security.title') }}</h2>
            <p>{{ i18n.t('admin.security.subtitle') }}</p>
          </div>
          <button type="button" class="btn secondary" (click)="exportAuditLog()">
            <span class="material-symbols-outlined">download</span>
            {{ i18n.t('admin.security.export') }}
          </button>
        </section>
        <section class="security-grid">
          <article class="security-card critical"><span class="material-symbols-outlined">warning</span><small>{{ i18n.t('admin.security.criticalAlerts') }}</small><strong>{{ criticalAlerts().length }}</strong><p>{{ i18n.t('admin.security.requiresAction') }}</p></article>
          <article class="security-card"><span class="material-symbols-outlined">vpn_key</span><small>{{ i18n.t('admin.security.activeSessions') }}</small><strong>{{ activeSessions() }}</strong><p>{{ i18n.t('admin.security.fromYesterday') }}</p></article>
          <article class="security-card warning"><span class="material-symbols-outlined">block</span><small>{{ i18n.t('admin.security.failedAttempts') }}</small><strong>{{ failedAttempts() }}</strong><p>{{ i18n.t('admin.security.last24Hours') }}</p></article>
        </section>
        <section class="panel filters-panel audit-filters">
          <div class="field">
            <label for="auditSeverity">{{ i18n.t('admin.security.severity') }}</label>
            <select id="auditSeverity" name="auditSeverity" [ngModel]="auditSeverity()" (ngModelChange)="setAuditSeverity($event)">
              <option value="">{{ i18n.t('admin.security.allSeverities') }}</option>
              <option value="critical">{{ i18n.t('admin.security.sev.critical') }}</option>
              <option value="warning">{{ i18n.t('admin.security.sev.warning') }}</option>
              <option value="info">{{ i18n.t('admin.security.sev.info') }}</option>
            </select>
          </div>
          <div class="field">
            <label for="auditSearch">{{ i18n.t('admin.security.userIp') }}</label>
            <input id="auditSearch" name="auditSearch" type="search" [ngModel]="auditSearch()" (ngModelChange)="setAuditSearch($event)" [placeholder]="i18n.t('admin.security.searchPlaceholder')" />
          </div>
          <button type="button" class="btn secondary" (click)="clearAuditFilters()">{{ i18n.t('admin.security.clearFilters') }}</button>
        </section>
        <section class="panel alerts-panel">
          <div class="panel-head alert-head">
            <div>
              <h2>{{ i18n.t('admin.security.timelineTitle') }}</h2>
              <p>{{ i18n.t('admin.security.timelineSubtitle') }}</p>
            </div>
            <span>{{ filteredAuditLogs().length }} {{ i18n.t('admin.security.events') }}</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>{{ i18n.t('admin.security.table.timestamp') }}</th><th>{{ i18n.t('admin.security.table.severity') }}</th><th>{{ i18n.t('admin.security.table.event') }}</th><th>{{ i18n.t('admin.security.table.user') }}</th><th>{{ i18n.t('admin.security.table.details') }}</th><th>{{ i18n.t('admin.security.table.action') }}</th></tr>
              </thead>
              <tbody>
                @for (log of filteredAuditLogs(); track log.id) {
                  <tr>
                    <td>{{ log.created_at | aclLocalizedDate }}</td>
                    <td><span class="severity-chip" [class.critical]="auditSeverityFor(log) === 'critical'" [class.warning]="auditSeverityFor(log) === 'warning'">{{ auditSeverityFor(log) }}</span></td>
                    <td>{{ auditTitle(log.action) }}</td>
                    <td>{{ log.user_name || userName(log.user_id) }}</td>
                    <td>{{ log.entity_type }} {{ log.entity_name || (log.entity_id | aclShortId) }}</td>
                    <td><button type="button" class="icon-action" aria-label="Voir les détails du journal" (click)="openAuditLog(log)"><span class="material-symbols-outlined">visibility</span></button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activeTab() === 'config') {
        <section class="config-savebar">
          <div>
            <h2>{{ i18n.t('admin.config.title') }}</h2>
            <p>{{ i18n.t('admin.config.subtitle') }}</p>
            @if (configStatus()) {
              <p class="editor-status">{{ configStatus() }}</p>
            }
          </div>
          <div class="tab-actions">
            <button type="button" class="btn secondary" (click)="discardConfig()">{{ i18n.t('admin.config.discard') }}</button>
            <button type="button" class="btn primary" (click)="saveSystemConfig()">{{ i18n.t('admin.config.save') }}</button>
          </div>
        </section>
        <section class="config-grid">
          <article class="panel config-card">
            <div class="config-card-head">
              <span class="material-symbols-outlined">settings_applications</span>
              <h2>{{ i18n.t('admin.config.generalSettings') }}</h2>
            </div>
            <div class="config-fields">
              <div class="field"><label for="systemName">{{ i18n.t('admin.config.systemName') }}</label><input id="systemName" name="systemName" [ngModel]="systemName()" (ngModelChange)="systemName.set($event)" /></div>
              <div class="field"><label for="defaultLocale">{{ i18n.t('admin.config.defaultLocale') }}</label><select id="defaultLocale" name="defaultLocale" [ngModel]="defaultLocale()" (ngModelChange)="defaultLocale.set($event)"><option value="fr-SN">French (Senegal)</option><option value="en-NG">English (Nigeria)</option><option value="sw-KE">Swahili (Kenya)</option></select></div>
              <div class="field wide"><label for="supportEmail">{{ i18n.t('admin.config.supportContact') }}</label><input id="supportEmail" name="supportEmail" type="email" [ngModel]="supportEmail()" (ngModelChange)="supportEmail.set($event)" /></div>
            </div>
          </article>
          <article class="panel config-card">
            <div class="config-card-head earth">
              <span class="material-symbols-outlined">campaign</span>
              <h2>{{ i18n.t('admin.config.campaignWindow') }}</h2>
            </div>
            <div class="config-fields">
              <div class="field"><label for="startDate">{{ i18n.t('admin.config.startDate') }}</label><input id="startDate" name="startDate" type="date" [ngModel]="collectionStart()" (ngModelChange)="collectionStart.set($event)" /></div>
              <div class="field"><label for="endDate">{{ i18n.t('admin.config.endDate') }}</label><input id="endDate" name="endDate" type="date" [ngModel]="collectionEnd()" (ngModelChange)="collectionEnd.set($event)" /></div>
            </div>
            <label class="toggle-row">
              <span><strong>{{ i18n.t('admin.config.strictWindow') }}</strong><em>{{ i18n.t('admin.config.blockData') }}</em></span>
              <input type="checkbox" [ngModel]="strictWindow()" (ngModelChange)="strictWindow.set($event)" />
            </label>
          </article>
        </section>
        <section class="panel home-content-panel">
          <div class="panel-head">
            <div>
              <h2>{{ i18n.t('admin.config.homeContent') }}</h2>
              <p>{{ i18n.t('admin.config.homeContentSubtitle') }}</p>
            </div>
            <button type="button" class="btn secondary" (click)="reloadHomeContent()">{{ i18n.t('admin.config.reload') }}</button>
          </div>
          <div class="home-editor">
            <div class="field">
              <label for="homeJson">{{ i18n.t('admin.config.jsonDocument') }}</label>
              <textarea id="homeJson" name="homeJson" rows="18" [ngModel]="homeContentJson()" (ngModelChange)="homeContentJson.set($event)" spellcheck="false"></textarea>
            </div>
            @if (homeContentStatus()) {
              <p class="editor-status" [class.error]="homeContentStatus().startsWith('Erreur')">{{ homeContentStatus() }}</p>
            }
            <div class="editor-actions">
              <button type="button" class="btn primary" (click)="saveHomeContent()">{{ i18n.t('admin.config.publish') }}</button>
            </div>
          </div>
        </section>
      }

      <footer class="admin-footer">
        <span>{{ i18n.t('admin.footer.brand') }}</span>
        <span><i></i> API V2.4.0</span>
        <span><i></i> MAINNET</span>
      </footer>
      <acl-detail-drawer
        [open]="userDrawerOpen()"
        [title]="selectedUserTitle()"
        subtitle="Compte utilisateur"
        [items]="selectedUserDetails()"
        (closed)="selectedUser.set(null)"
      />
      <acl-detail-drawer
        [open]="auditDrawerOpen()"
        [title]="selectedAuditTitle()"
        subtitle="Événement de sécurité"
        [items]="selectedAuditDetails()"
        (closed)="selectedAuditLog.set(null)"
      />
      <acl-modal
        [open]="userEditorOpen()"
        [title]="editingUserId() ? i18n.t('admin.user.edit.title') : i18n.t('admin.user.create.title')"
        [subtitle]="i18n.t('admin.user.draft.subtitle')"
        [isForm]="true"
        (submitted)="saveUser()"
        (closed)="closeUserEditor()"
      >
        <div class="user-form">
          @if (userFormStatus()) {
            <p class="editor-status" [class.error]="userFormStatus().startsWith('Erreur')">{{ userFormStatus() }}</p>
          }
          <div class="field">
            <label for="userName">{{ i18n.t('admin.user.username') }}</label>
            <input id="userName" name="userName" required [ngModel]="userDraft().username" (ngModelChange)="updateUserDraft('username', $event)" />
          </div>
          <div class="field">
            <label for="userFullName">{{ i18n.t('admin.user.fullName') }}</label>
            <input id="userFullName" name="userFullName" required [ngModel]="userDraft().full_name" (ngModelChange)="updateUserDraft('full_name', $event)" />
          </div>
          <div class="field">
            <label for="userRole">{{ i18n.t('admin.user.role') }}</label>
            <select id="userRole" name="userRole" [ngModel]="userDraft().role" (ngModelChange)="updateUserDraft('role', $event)">
              @for (role of roles; track role) {
                <option [value]="role">{{ roleLabel(role) }}</option>
              }
            </select>
          </div>
          <div class="field wide">
            <label for="userZones">{{ i18n.t('admin.user.zones') }}</label>
            <input id="userZones" name="userZones" [ngModel]="zoneText()" (ngModelChange)="setZoneText($event)" placeholder="zone-1, zone-2" />
          </div>
          <div class="field">
            <label for="userPassword">{{ i18n.t('admin.user.password') }}</label>
            <input id="userPassword" name="userPassword" type="password" [required]="!editingUserId()" [ngModel]="passwordDraft()" (ngModelChange)="passwordDraft.set($event)" />
          </div>
          <label class="toggle-row compact wide">
            <span><strong>{{ i18n.t('admin.user.active') }}</strong><em>{{ i18n.t('admin.user.active.desc') }}</em></span>
            <input type="checkbox" [ngModel]="userDraft().active" name="activeUser" (ngModelChange)="updateUserDraft('active', $event)" />
          </label>
        </div>
        <ng-container modal-actions>
          @if (editingUserId() && passwordDraft()) {
            <button type="button" class="btn secondary" (click)="resetSelectedUserPassword()">{{ i18n.t('admin.user.resetPassword') }}</button>
          }
          <button type="button" class="btn secondary" (click)="closeUserEditor()">{{ i18n.t('admin.user.cancel') }}</button>
          <button class="btn primary" type="submit" [disabled]="!canSaveUser()">
            <span class="material-symbols-outlined">{{ editingUserId() ? 'save' : 'add' }}</span>
            {{ editingUserId() ? i18n.t('admin.user.save') : i18n.t('admin.user.create') }}
          </button>
        </ng-container>
      </acl-modal>
    </section>
  `,
  styles: `
    .admin-page { padding: 32px; display: grid; gap: 28px; }
    .admin-hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
    .eyebrow { color: var(--terracotta); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    h1 { margin: 6px 0 8px; font-size: 36px; line-height: 44px; }
    h2 { margin: 0; font-size: 24px; line-height: 32px; }
    p { margin: 0; color: var(--muted); }
    .last-update { text-align: right; min-width: 190px; }
    .last-update span { display: block; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    .last-update strong { color: var(--primary); }
    .admin-tabs {
      display: flex; gap: 8px; overflow-x: auto; padding: 8px; border: 2px solid var(--outline-soft);
      border-radius: 8px; background: var(--surface); scrollbar-width: thin;
    }
    .admin-tabs button {
      min-height: 48px; min-width: max-content; display: inline-flex; align-items: center; gap: 8px;
      border: 0; border-radius: 8px; padding: 0 14px; background: transparent; color: var(--muted); font-weight: 900;
    }
    .admin-tabs button.active { background: var(--primary); color: var(--on-primary); }
    .tab-header, .config-savebar {
      display: flex; align-items: end; justify-content: space-between; gap: 20px;
      padding: 22px; border: 2px solid var(--outline-soft); border-radius: 8px; background: var(--surface);
    }
    .tab-header p, .config-savebar p { display: flex; align-items: center; gap: 8px; }
    .tab-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
    .live-dot { width: 12px; height: 12px; display: inline-block; border-radius: 999px; background: var(--growth); }
    .infra-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 24px; }
    .topology-panel { padding: 0; overflow: hidden; }
    .panel-head.compact { padding: 18px 22px; }
    .link-button { border: 0; background: transparent; color: var(--primary); font-weight: 900; }
    .topology-map {
      min-height: 420px; position: relative; display: grid; place-items: center; margin: 22px;
      border: 1px solid var(--outline-soft); border-radius: 8px; background-color: var(--surface-low);
      background-image: radial-gradient(color-mix(in srgb, var(--outline-soft) 70%, transparent) 1px, transparent 1px);
      background-size: 20px 20px; overflow: hidden;
    }
    .topology-map strong { color: var(--muted); opacity: .7; }
    .node {
      position: absolute; display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px;
      border: 1px solid var(--outline-soft); background: var(--surface); color: var(--ink); font-size: 12px; font-weight: 900;
    }
    .node i { width: 12px; height: 12px; border-radius: 999px; background: var(--growth); box-shadow: 0 0 12px color-mix(in srgb, var(--growth) 70%, transparent); }
    .node.warning i { background: var(--terracotta); box-shadow: 0 0 12px color-mix(in srgb, var(--terracotta) 70%, transparent); }
    .node.alpha { left: 18%; top: 24%; }
    .node.beta { right: 16%; top: 48%; }
    .node.gamma { left: 34%; bottom: 24%; }
    .filters-panel {
      display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 16px; align-items: end;
    }
    .audit-filters { grid-template-columns: minmax(180px, 240px) minmax(240px, 1fr) max-content; }
    .security-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    .security-card {
      min-height: 172px; display: grid; align-content: space-between; gap: 8px; padding: 22px;
      border: 2px solid var(--outline-soft); border-radius: 8px; background: var(--surface);
    }
    .security-card .material-symbols-outlined { color: var(--primary); font-size: 34px; justify-self: end; }
    .security-card small { color: var(--muted); font-weight: 900; }
    .security-card strong { font-size: 46px; line-height: 50px; color: var(--primary); }
    .security-card.critical { border-color: var(--error); background: var(--error-soft); }
    .security-card.critical strong, .security-card.critical .material-symbols-outlined { color: var(--error); }
    .security-card.warning strong, .security-card.warning .material-symbols-outlined { color: var(--terracotta); }
    .severity-chip {
      display: inline-flex; align-items: center; min-height: 28px; border-radius: 999px; padding: 0 10px;
      background: var(--surface-container); color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase;
    }
    .severity-chip.critical { background: var(--error-soft); color: var(--error); }
    .severity-chip.warning { background: var(--terracotta-soft); color: var(--terracotta); }
    .icon-action {
      width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: 999px;
      background: transparent; color: var(--primary);
    }
    .icon-action.danger { color: var(--error); }
    .icon-action:hover { background: var(--primary-soft); }
    .row-actions { display: flex; flex-wrap: wrap; gap: 4px; }
    .muted-cell { color: var(--muted); }
    .config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
    .config-card { display: grid; gap: 18px; }
    .config-card-head { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 2px solid var(--outline-soft); }
    .config-card-head .material-symbols-outlined { color: var(--primary); font-size: 32px; }
    .config-card-head.earth .material-symbols-outlined { color: var(--terracotta); }
    .config-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .config-fields .wide { grid-column: 1 / -1; }
    .toggle-row {
      min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 14px; border: 2px solid var(--outline-soft); border-radius: 8px; background: var(--surface-low);
    }
    .toggle-row span { display: grid; gap: 4px; }
    .toggle-row em { color: var(--muted); font-style: normal; }
    .toggle-row input { width: 48px; height: 28px; accent-color: var(--primary); }
    .health-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    .health-card {
      min-height: 220px; background: var(--surface); border: 2px solid var(--outline-soft); border-left-width: 6px;
      border-radius: 8px; padding: 22px; display: grid; gap: 10px; align-content: start;
    }
    .health-card.success { border-left-color: var(--growth); }
    .health-card.primary { border-left-color: var(--primary); }
    .health-card.warning { border-left-color: var(--terracotta); }
    .health-top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px; }
    .icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; background: var(--surface-container); color: var(--primary); }
    .success .icon { color: var(--growth); }
    .warning .icon { color: var(--terracotta); }
    .status, .admin-chip, .alert-head > span {
      min-height: 28px; display: inline-flex; align-items: center; border-radius: 999px; padding: 0 10px;
      background: var(--surface-container); color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase;
    }
    .success .status, .admin-chip { background: var(--growth); color: white; }
    .admin-chip.offline { background: var(--surface-high); color: var(--muted); }
    .label { color: var(--muted); font-size: 14px; font-weight: 800; }
    .health-card strong { font-size: 42px; line-height: 48px; }
    .meter { height: 10px; border-radius: 999px; overflow: hidden; background: var(--surface-high); }
    .meter i { display: block; height: 100%; background: var(--primary); }
    .admin-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 24px; }
    .panel { background: var(--surface); border: 2px solid var(--outline-soft); border-radius: 8px; padding: 22px; }
    .users-panel { padding: 0; overflow: hidden; }
    .users-panel .pagination { padding: 0 22px 22px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px; border-bottom: 2px solid var(--outline-soft); }
    .panel-head a { color: var(--primary); font-weight: 900; text-decoration: none; }
    .identity { display: flex; align-items: center; gap: 10px; }
    .identity span {
      width: 36px; height: 36px; display: grid; place-items: center; border-radius: 999px;
      background: var(--primary-soft); color: var(--primary); font-size: 12px; font-weight: 900;
    }
    .metrics-panel { display: grid; gap: 16px; }
    .bars { height: 210px; display: flex; align-items: end; justify-content: space-between; gap: 8px; padding-top: 18px; }
    .bars i { flex: 1; max-width: 22px; min-width: 12px; border-radius: 6px 6px 0 0; background: var(--primary-soft); transition: background .15s ease, transform .15s ease; }
    .bars i:hover { background: var(--primary); transform: scaleY(1.04); transform-origin: bottom; }
    .metric-row { display: flex; justify-content: space-between; gap: 16px; color: var(--muted); font-weight: 800; }
    .metric-row strong { color: var(--primary); }
    .metric-row .success { color: var(--growth); }
    .alerts-panel { padding: 0; overflow: hidden; }
    .home-content-panel { padding: 0; overflow: hidden; }
    .home-editor { display: grid; gap: 14px; padding: 22px; }
    .user-editor { padding: 0; overflow: hidden; }
    .panel-head.inline { padding: 18px 22px; }
    .user-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: end; }
    .user-form .wide { grid-column: 1 / -1; }
    .toggle-row.compact { min-height: 58px; }
    .home-editor textarea {
      width: 100%; min-height: 420px; resize: vertical; border: 2px solid var(--outline-soft);
      border-radius: 8px; padding: 14px; background: var(--surface-low); color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; line-height: 1.5;
    }
    .editor-status { font-weight: 800; color: var(--growth); }
    .editor-status.error { color: var(--error); }
    .editor-actions { display: flex; justify-content: flex-end; }
    .alert-head { background: var(--surface-low); }
    .alert-head > span { background: var(--error-soft); color: var(--error); }
    .alert-list { display: grid; }
    .alert-row { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 16px; padding: 22px; border-top: 2px solid var(--outline-soft); }
    .alert-row:first-child { border-top: 0; }
    .alert-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; background: var(--error-soft); color: var(--error); }
    .alert-title { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 6px; }
    .alert-title span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .alert-row .btn { margin-top: 14px; min-height: 42px; padding: 0 14px; }
    .admin-footer {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; border-top: 2px solid var(--outline-soft);
      padding-top: 24px; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em;
    }
    .admin-footer i { width: 8px; height: 8px; display: inline-block; border-radius: 999px; background: var(--growth); margin-right: 6px; }
    @media(max-width: 1120px) {
      .health-grid, .admin-grid, .infra-grid, .security-grid, .config-grid { grid-template-columns: 1fr; }
    }
    @media(max-width: 860px) {
      .admin-page { padding: 24px 16px; }
      .admin-hero, .panel-head, .alert-title, .tab-header, .config-savebar { align-items: start; flex-direction: column; }
      .last-update { text-align: left; }
      h1 { font-size: 32px; line-height: 40px; }
      .tab-actions, .tab-actions .btn { width: 100%; }
      .filters-panel, .audit-filters, .config-fields { grid-template-columns: 1fr; }
      .user-form { grid-template-columns: 1fr; }
      .config-fields .wide { grid-column: auto; }
      .topology-map { min-height: 320px; margin: 16px; }
    }
  `,
})
export class AdminPortalPageComponent implements OnInit {
  readonly roles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'STATISTICIAN', 'AUDITOR'];
  readonly tabs = computed<{ id: AdminTab; label: string; icon: string }[]>(() => {
    this.i18n.language();
    return [
      { id: 'infra', label: this.i18n.t('admin.tabs.infra'), icon: 'monitor_heart' },
      { id: 'users', label: this.i18n.t('admin.tabs.users'), icon: 'group' },
      { id: 'security', label: this.i18n.t('admin.tabs.security'), icon: 'security' },
      { id: 'config', label: this.i18n.t('admin.tabs.config'), icon: 'settings' },
    ];
  });
  readonly activeTab = signal<AdminTab>('infra');
  readonly users = signal<User[]>([]);
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
  readonly zoneText = signal('');
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
        icon: 'dns',
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
        icon: 'badge',
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
          icon: 'verified_user',
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

  constructor(private readonly api: ApiService, private readonly router: Router, readonly i18n: I18nService) { }

  ngOnInit(): void {
    this.lastUpdated.set(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    forkJoin({
      users: this.api.users(),
      summary: this.api.dashboard(),
      logs: this.api.auditLogs(),
      home: this.api.homeContentSource(),
    }).subscribe({
      next: ({ users, summary, logs, home }) => {
        this.users.set(users);
        this.summary.set(summary);
        this.auditLogs.set(logs);
        this.setHomeContent(home);
      },
      error: () => {
        this.users.set([]);
        this.summary.set(null);
        this.auditLogs.set([]);
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
    }).subscribe({
      next: ({ users, summary, logs }) => {
        this.users.set(users);
        this.summary.set(summary);
        this.auditLogs.set(logs);
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
    this.zoneText.set('');
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
    this.zoneText.set(user.zone_ids.join(', '));
    this.passwordDraft.set('');
    this.userFormStatus.set('');
    this.userEditorOpen.set(true);
  }

  closeUserEditor(): void {
    this.userEditorOpen.set(false);
    this.editingUserId.set(null);
    this.userDraft.set(this.emptyUserDraft());
    this.passwordDraft.set('');
    this.zoneText.set('');
  }

  updateUserDraft<Key extends keyof UserCreateInput>(key: Key, value: UserCreateInput[Key]): void {
    this.userDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  setZoneText(value: string): void {
    this.zoneText.set(value);
    this.userDraft.update((draft) => ({
      ...draft,
      zone_ids: value
        .split(',')
        .map((zone) => zone.trim())
        .filter(Boolean),
    }));
  }

  canSaveUser(): boolean {
    const draft = this.userDraft();
    return Boolean(draft.username.trim().length >= 3 && draft.full_name.trim() && (this.editingUserId() || this.passwordDraft().length >= 6));
  }

  saveUser(): void {
    if (!this.canSaveUser()) return;
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

  deleteUser(user: User): void {
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

  saveSystemConfig(): void {
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

  saveHomeContent(): void {
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
