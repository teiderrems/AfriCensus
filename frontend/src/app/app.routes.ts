import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { AuditComponent } from './pages/audit/audit.component';
import { AdminPortalComponent } from './pages/admin-portal/admin-portal.component';
import { BirthDeclarationComponent } from './pages/birth-declaration/birth-declaration.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { FormBuilderComponent } from './pages/form-builder/form-builder.component';
import { FamilyTreeComponent } from './pages/family-tree/family-tree.component';
import { HomeComponent } from './pages/home/home.component';
import { HouseholdsComponent } from './pages/households/households.component';
import { LoginComponent } from './pages/login/login.component';
import { MedicalHistoryComponent } from './pages/medical-history/medical-history.component';
import { PersonsComponent } from './pages/persons/persons.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { RolePortalComponent } from './pages/role-portal/role-portal.component';
import { ValidationComponent } from './pages/validation/validation.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

import { ZonesComponent } from './pages/zones/zones.component';
import { CampaignsComponent } from './pages/campaigns/campaigns.component';
import { DuplicatesComponent } from './pages/duplicates/duplicates.component';
import { UsersComponent } from './pages/users/users.component';
import { MessagingComponent } from './pages/messaging/messaging.component';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: 'portal', canActivate: [authGuard], component: RolePortalComponent },
  { path: 'dashboard', canActivate: [authGuard], component: DashboardComponent },
  { path: 'admin-portal', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'AUDITOR'] }, component: AdminPortalComponent },
  { path: 'users', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] }, component: UsersComponent },
  { path: 'households', canActivate: [authGuard], component: HouseholdsComponent },
  { path: 'persons', canActivate: [authGuard], component: PersonsComponent },
  { path: 'birth-declaration', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] }, component: BirthDeclarationComponent },
  { path: 'family-tree', canActivate: [authGuard], component: FamilyTreeComponent },
  { path: 'medical-history', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'STATISTICIAN'] }, component: MedicalHistoryComponent },
  { path: 'validation', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] }, component: ValidationComponent },
  { path: 'forms', canActivate: [authGuard], component: FormBuilderComponent },
  { path: 'reports', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'STATISTICIAN', 'AUDITOR'] }, component: ReportsComponent },
  { path: 'audit', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'AUDITOR'] }, component: AuditComponent },
  { path: 'zones', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR'] }, component: ZonesComponent },
  { path: 'campaigns', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR'] }, component: CampaignsComponent },
  { path: 'duplicates', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR'] }, component: DuplicatesComponent },
  { path: 'messaging', canActivate: [authGuard], component: MessagingComponent },
  { path: '**', component: NotFoundComponent },
];
