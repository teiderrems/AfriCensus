import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'unauthorized', loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
  { path: 'portal', canActivate: [authGuard], loadComponent: () => import('./pages/role-portal/role-portal.component').then(m => m.RolePortalComponent) },
  { path: 'change-password', canActivate: [authGuard], loadComponent: () => import('./pages/change-password/change-password.component').then(m => m.ChangePasswordComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'admin-portal', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'AUDITOR'] }, loadComponent: () => import('./pages/admin-portal/admin-portal.component').then(m => m.AdminPortalComponent) },
  { path: 'users', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] }, loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent) },
  { path: 'households', canActivate: [authGuard], loadComponent: () => import('./pages/households/households.component').then(m => m.HouseholdsComponent) },
  { path: 'persons', canActivate: [authGuard], loadComponent: () => import('./pages/persons/persons.component').then(m => m.PersonsComponent) },
  { path: 'birth-declaration', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] }, loadComponent: () => import('./pages/birth-declaration/birth-declaration.component').then(m => m.BirthDeclarationComponent) },
  { path: 'family-tree', canActivate: [authGuard], loadComponent: () => import('./pages/family-tree/family-tree.component').then(m => m.FamilyTreeComponent) },
  { path: 'medical-history', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'STATISTICIAN'] }, loadComponent: () => import('./pages/medical-history/medical-history.component').then(m => m.MedicalHistoryComponent) },
  { path: 'validation', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'AUDITOR'] }, loadComponent: () => import('./pages/validation/validation.component').then(m => m.ValidationComponent) },
  { path: 'forms', canActivate: [authGuard], loadComponent: () => import('./pages/form-builder/form-builder.component').then(m => m.FormBuilderComponent) },
  { path: 'reports', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR', 'STATISTICIAN', 'AUDITOR'] }, loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'audit', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'AUDITOR'] }, loadComponent: () => import('./pages/audit/audit.component').then(m => m.AuditComponent) },
  { path: 'zones', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR'] }, loadComponent: () => import('./pages/zones/zones.component').then(m => m.ZonesComponent) },
  { path: 'campaigns', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR'] }, loadComponent: () => import('./pages/campaigns/campaigns.component').then(m => m.CampaignsComponent) },
  { path: 'duplicates', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'SUPERVISOR'] }, loadComponent: () => import('./pages/duplicates/duplicates.component').then(m => m.DuplicatesComponent) },
  { path: 'messaging', canActivate: [authGuard], loadComponent: () => import('./pages/messaging/messaging.component').then(m => m.MessagingComponent) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
