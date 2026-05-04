import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatSidenavModule,
    MatListModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon"><mat-icon>schedule</mat-icon></div>
          <span class="logo-text">TimeIn</span>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon>
            <span>לוח בקרה</span>
          </a>
          <a class="nav-item" routerLink="/time-entries" routerLinkActive="active">
            <mat-icon>schedule</mat-icon>
            <span>דיווחי שעות</span>
          </a>
          <a class="nav-item" routerLink="/projects" routerLinkActive="active">
            <mat-icon>folder_open</mat-icon>
            <span>פרויקטים</span>
          </a>
          <a class="nav-item" routerLink="/tasks" routerLinkActive="active">
            <mat-icon>task_alt</mat-icon>
            <span>משימות</span>
          </a>
          @if (auth.hasRole('Manager', 'Admin')) {
            <a class="nav-item" routerLink="/users" routerLinkActive="active">
              <mat-icon>group</mat-icon>
              <span>עובדים</span>
            </a>
            <a class="nav-item" routerLink="/reports" routerLinkActive="active">
              <mat-icon>bar_chart</mat-icon>
              <span>דוחות</span>
            </a>
          }
          @if (auth.hasRole('Admin')) {
            <a class="nav-item" routerLink="/teams" routerLinkActive="active">
              <mat-icon>corporate_fare</mat-icon>
              <span>צוותים</span>
            </a>
            <a class="nav-item" routerLink="/integrations" routerLinkActive="active">
              <mat-icon>hub</mat-icon>
              <span>אינטגרציות</span>
            </a>
            <a class="nav-item" routerLink="/settings" routerLinkActive="active">
              <mat-icon>settings</mat-icon>
              <span>הגדרות</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">{{ initials }}</div>
            <div class="user-details">
              <div class="user-name">{{ auth.currentUser()?.fullName }}</div>
              <div class="user-role">{{ roleLabel }}</div>
            </div>
          </div>
          <button mat-icon-button class="logout-btn" (click)="auth.logout()" matTooltip="התנתק">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      width: 240px;
      min-width: 240px;
      background: #1e293b;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-left: 1px solid rgba(0,0,0,0.15);
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 22px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .logo-icon {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .logo-text {
      font-size: 20px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.5px;
    }

    /* Nav */
    .sidebar-nav {
      flex: 1;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 10px 12px;
      border-radius: 6px;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .nav-item mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
      transition: color 0.15s;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.85);
    }
    .nav-item.active {
      background: rgba(59,130,246,0.18);
      color: #93c5fd;
      font-weight: 600;
      border-right: 3px solid #3b82f6;
    }
    .nav-item.active mat-icon { color: #93c5fd; }

    /* Footer */
    .sidebar-footer {
      padding: 14px 10px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      color: white;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-details { min-width: 0; }
    .user-name {
      color: rgba(255,255,255,0.88);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      color: rgba(255,255,255,0.38);
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .logout-btn { color: rgba(255,255,255,0.35) !important; }
    .logout-btn:hover { color: rgba(255,255,255,0.75) !important; }

    /* Main */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: #f0f4f8;
    }
  `]
})
export class LayoutComponent {
  constructor(public auth: AuthService) {}

  get initials(): string {
    const name = this.auth.currentUser()?.fullName ?? '';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser()?.role;
    if (role === 'Admin') return 'מנהל מערכת';
    if (role === 'Manager') return 'מנהל';
    return 'עובד';
  }
}
