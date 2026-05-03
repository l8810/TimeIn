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
      background: #1e1b4b;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .logo-text {
      font-size: 22px;
      font-weight: 800;
      color: white;
      letter-spacing: -0.5px;
    }

    /* Nav */
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 10px;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .nav-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      transition: color 0.15s;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.9);
    }
    .nav-item.active {
      background: linear-gradient(135deg, rgba(129,140,248,0.25), rgba(167,139,250,0.2));
      color: #a5b4fc;
      font-weight: 600;
    }
    .nav-item.active mat-icon { color: #a5b4fc; }

    /* Footer */
    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
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
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      color: white;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-details { min-width: 0; }
    .user-name {
      color: rgba(255,255,255,0.9);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      color: rgba(255,255,255,0.4);
      font-size: 11px;
    }
    .logout-btn { color: rgba(255,255,255,0.4) !important; }
    .logout-btn:hover { color: rgba(255,255,255,0.8) !important; }

    /* Main */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: #f5f5f9;
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
