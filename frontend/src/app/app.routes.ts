import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { AuditPageComponent } from './pages/audit-page.component';
import { AdminPortalPageComponent } from './pages/admin-portal-page.component';
import { BirthDeclarationPageComponent } from './pages/birth-declaration-page.component';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { FormBuilderPageComponent } from './pages/form-builder-page.component';
import { FamilyTreePageComponent } from './pages/family-tree-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { HouseholdsPageComponent } from './pages/households-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { MedicalHistoryPageComponent } from './pages/medical-history-page.component';
import { PersonsPageComponent } from './pages/persons-page.component';
import { ReportsPageComponent } from './pages/reports-page.component';
import { RolePortalPageComponent } from './pages/role-portal-page.component';
import { ValidationPageComponent } from './pages/validation-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'portal', canActivate: [authGuard], component: RolePortalPageComponent },
  { path: 'dashboard', canActivate: [authGuard], component: DashboardPageComponent },
  { path: 'admin-portal', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'AUDITOR'] }, component: AdminPortalPageComponent },
  { path: 'households', canActivate: [authGuard], component: HouseholdsPageComponent },
  { path: 'persons', canActivate: [authGuard], component: PersonsPageComponent },
  { path: 'birth-declaration', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] }, component: BirthDeclarationPageComponent },
  { path: 'family-tree', canActivate: [authGuard], component: FamilyTreePageComponent },
  { path: 'medical-history', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'STATISTICIAN'] }, component: MedicalHistoryPageComponent },
  { path: 'validation', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] }, component: ValidationPageComponent },
  { path: 'forms', canActivate: [authGuard], component: FormBuilderPageComponent },
  { path: 'reports', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'STATISTICIAN', 'AUDITOR'] }, component: ReportsPageComponent },
  { path: 'audit', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'AUDITOR'] }, component: AuditPageComponent },
  { path: '**', redirectTo: '' },
];
