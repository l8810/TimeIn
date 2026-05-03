import { Routes } from '@angular/router';
import { authGuard, managerGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'time-entries',
        loadComponent: () => import('./components/time-entries/time-entries.component').then(m => m.TimeEntriesComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./components/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./components/tasks/tasks.component').then(m => m.TasksComponent)
      },
      {
        path: 'users',
        canActivate: [managerGuard],
        loadComponent: () => import('./components/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'reports',
        canActivate: [managerGuard],
        loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'teams',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/teams/teams.component').then(m => m.TeamsComponent)
      },
      {
        path: 'settings',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'integrations',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/integrations/integrations.component').then(m => m.IntegrationsComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
