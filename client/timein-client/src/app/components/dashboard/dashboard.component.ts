import { Component, OnInit, OnDestroy, computed, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReportService } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { Dashboard, ManagerDashboard, AdminDashboard, ProjectHours, TaskHoursItem } from '../../models/models';
import { interval } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const TIMER_KEY = 'timein_timer_start';

const CHART_COLORS = [
  '#4f46e5', '#7c3aed', '#0891b2', '#16a34a', '#dc2626',
  '#d97706', '#db2777', '#059669', '#7c3aed', '#0284c7'
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="dashboard">

      <div class="page-header">
        <div>
          <h1>שלום, {{ firstName }} 👋</h1>
          <p class="header-sub">{{ auth.hasRole('Admin') ? 'סקירה כללית של הארגון' : 'הנה סיכום פעילות העבודה שלך' }}</p>
        </div>
      </div>

      @if (timerStart()) {
        <a class="timer-banner" routerLink="/time-entries">
          <div class="timer-banner-right">
            <span class="live-dot"></span>
            <span class="timer-label">טיימר פעיל</span>
          </div>
          <div class="timer-banner-left">
            <span class="timer-count">{{ timerDisplay() }}</span>
            <span class="btn-link">לחץ לסיום עבודה ←</span>
          </div>
        </a>
      }

      <div class="stats-row">
        <div class="stat-card stat-blue">
          <div class="stat-icon"><mat-icon>today</mat-icon></div>
          <div class="stat-body">
            <div class="stat-value">{{ toHours(dashboard()?.todayHours) }}</div>
            <div class="stat-label">שעות היום</div>
          </div>
        </div>
        <div class="stat-card stat-purple">
          <div class="stat-icon"><mat-icon>date_range</mat-icon></div>
          <div class="stat-body">
            <div class="stat-value">{{ toHours(dashboard()?.weekHours) }}</div>
            <div class="stat-label">שעות השבוע</div>
          </div>
        </div>
        <div class="stat-card stat-teal">
          <div class="stat-icon"><mat-icon>calendar_month</mat-icon></div>
          <div class="stat-body">
            <div class="stat-value">{{ toHours(dashboard()?.monthHours) }}</div>
            <div class="stat-label">שעות החודש</div>
          </div>
        </div>
      </div>

      <!-- Period breakdown card -->
      @if (dashboard()) {
        <div class="breakdown-card">
          <div class="breakdown-header">
            <div class="breakdown-title">
              <mat-icon>analytics</mat-icon>
              <span>פירוט שעות</span>
            </div>
            <div class="period-tabs">
              <button class="period-tab" [class.active]="activePeriod() === 'today'" (click)="changePeriod('today')">היום</button>
              <button class="period-tab" [class.active]="activePeriod() === 'week'"  (click)="changePeriod('week')">השבוע</button>
              <button class="period-tab" [class.active]="activePeriod() === 'month'" (click)="changePeriod('month')">החודש</button>
            </div>
          </div>

          <div class="breakdown-body">

            <!-- Project chart -->
            <div class="breakdown-col">
              <div class="breakdown-col-title">
                <mat-icon>folder_open</mat-icon> לפי פרויקט
              </div>
              @if (periodProjects().length > 0) {
                <div class="period-chart-wrap">
                  <canvas #periodProjectChart></canvas>
                </div>
                <div class="project-items">
                  @for (p of periodProjects(); track p.projectId) {
                    <div class="project-item">
                      <div class="project-dot" [style.background]="projectColor($index)"></div>
                      <span class="project-item-name">{{ p.projectName }}</span>
                      <span class="project-item-hours">{{ toHours(p.hours) }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="breakdown-empty">
                  <mat-icon>folder_off</mat-icon>
                  <p>אין דיווחים לתקופה זו</p>
                </div>
              }
            </div>

            <!-- Task list -->
            <div class="breakdown-col">
              <div class="breakdown-col-title">
                <mat-icon>task_alt</mat-icon> לפי משימה
              </div>
              @if (periodTasks().length > 0) {
                <div class="task-hours-list">
                  @for (t of periodTasks(); track t.taskName) {
                    <div class="task-hours-row">
                      <span class="task-hours-name">{{ t.taskName }}</span>
                      <div class="task-hours-bar-wrap">
                        <div class="task-hours-bar"
                          [style.width.%]="maxTaskHours() > 0 ? t.hours / maxTaskHours() * 100 : 0">
                        </div>
                      </div>
                      <span class="task-hours-val">{{ toHours(t.hours) }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="breakdown-empty">
                  <mat-icon>task_alt</mat-icon>
                  <p>אין משימות לתקופה זו</p>
                </div>
              }
            </div>

          </div>
        </div>
      }

      <!-- ── Admin dashboard: org-wide team overview ── -->
      @if (auth.hasRole('Admin') && adminData()) {
        <div class="charts-section">

          <div class="manager-kpis">
            <div class="kpi-card">
              <mat-icon>corporate_fare</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ adminData()!.totalTeams }}</div>
                <div class="kpi-label">צוותים</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>groups</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ adminData()!.totalEmployees }}</div>
                <div class="kpi-label">עובדים פעילים</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>folder_open</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ adminData()!.totalProjects }}</div>
                <div class="kpi-label">פרויקטים</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>schedule</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ toHours(adminData()!.totalHoursThisWeek) }}</div>
                <div class="kpi-label">שעות ארגון — השבוע</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>calendar_month</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ toHours(adminData()!.totalHoursThisMonth) }}</div>
                <div class="kpi-label">שעות ארגון — החודש</div>
              </div>
            </div>
          </div>

          <!-- Team hours comparison -->
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-card-header"><mat-icon>bar_chart</mat-icon><span>שעות לפי צוות — השבוע</span></div>
              <div class="chart-body"><canvas #teamWeekBar></canvas></div>
            </div>
            <div class="chart-card">
              <div class="chart-card-header"><mat-icon>calendar_month</mat-icon><span>שעות לפי צוות — החודש</span></div>
              <div class="chart-body"><canvas #teamMonthBar></canvas></div>
            </div>
          </div>

          <!-- Top employees podium + chart -->
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-card-header"><mat-icon>emoji_events</mat-icon><span>עובדים מובילים — החודש</span></div>
              <div class="chart-body"><canvas #topEmpBar></canvas></div>
            </div>

            <div class="chart-card">
              <div class="chart-card-header"><mat-icon>military_tech</mat-icon><span>פודיום החודש</span></div>
              <div class="podium-body">
                @if (adminData()!.topEmployees.length >= 2) {
                  <div class="podium-row">
                    <!-- 2nd place -->
                    <div class="podium-person silver">
                      <div class="podium-avatar">{{ initials(adminData()!.topEmployees[1].fullName) }}</div>
                      <div class="podium-name">{{ firstName2(adminData()!.topEmployees[1].fullName) }}</div>
                      <div class="podium-team">{{ adminData()!.topEmployees[1].teamName }}</div>
                      <div class="podium-hours">{{ toHours(adminData()!.topEmployees[1].monthHours) }}</div>
                      <div class="podium-block silver-block">2</div>
                    </div>
                    <!-- 1st place -->
                    @if (adminData()!.topEmployees.length >= 1) {
                      <div class="podium-person gold">
                        <div class="podium-crown">👑</div>
                        <div class="podium-avatar gold-av">{{ initials(adminData()!.topEmployees[0].fullName) }}</div>
                        <div class="podium-name">{{ firstName2(adminData()!.topEmployees[0].fullName) }}</div>
                        <div class="podium-team">{{ adminData()!.topEmployees[0].teamName }}</div>
                        <div class="podium-hours">{{ toHours(adminData()!.topEmployees[0].monthHours) }}</div>
                        <div class="podium-block gold-block">1</div>
                      </div>
                    }
                    <!-- 3rd place -->
                    @if (adminData()!.topEmployees.length >= 3) {
                      <div class="podium-person bronze">
                        <div class="podium-avatar">{{ initials(adminData()!.topEmployees[2].fullName) }}</div>
                        <div class="podium-name">{{ firstName2(adminData()!.topEmployees[2].fullName) }}</div>
                        <div class="podium-team">{{ adminData()!.topEmployees[2].teamName }}</div>
                        <div class="podium-hours">{{ toHours(adminData()!.topEmployees[2].monthHours) }}</div>
                        <div class="podium-block bronze-block">3</div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="chart-empty"><mat-icon>people_outline</mat-icon><p>אין נתוני שעות</p></div>
                }
              </div>
            </div>
          </div>

          <!-- Team completion table -->
          <div class="chart-card full-width-card">
            <div class="chart-card-header"><mat-icon>stacked_bar_chart</mat-icon><span>מצב משימות לפי צוות</span></div>
            <div class="project-bars">
              @for (t of adminData()!.teamStats; track t.teamId) {
                <div class="project-bar-row">
                  <div class="project-bar-label">
                    {{ t.teamName }}
                    <span class="team-meta">{{ t.memberCount }} עובדים · {{ t.projectCount }} פרויקטים</span>
                  </div>
                  <div class="project-bar-track">
                    @if (t.totalTasks > 0) {
                      <div class="project-bar-done" [style.width.%]="t.doneTasks / t.totalTasks * 100"
                           matTooltip="הושלם: {{ t.doneTasks }}"></div>
                      <div class="project-bar-todo" [style.width.%]="(t.totalTasks - t.doneTasks) / t.totalTasks * 100"
                           matTooltip="נותר: {{ t.totalTasks - t.doneTasks }}"></div>
                    } @else {
                      <div class="project-bar-empty">אין משימות</div>
                    }
                  </div>
                  <div class="project-bar-pct">{{ t.completionPercent }}%</div>
                  <div class="project-bar-count">{{ t.doneTasks }}/{{ t.totalTasks }}</div>
                </div>
              }
            </div>
            <div class="legend">
              <span class="legend-item done"><span></span>הושלם</span>
              <span class="legend-item todo"><span></span>נותר</span>
            </div>
          </div>

        </div>
      }

      <!-- ── Manager dashboard: team detail ── -->
      @if (auth.hasRole('Manager') && !auth.hasRole('Admin') && managerData()) {
        <div class="charts-section">

          <div class="manager-kpis">
            <div class="kpi-card">
              <mat-icon>groups</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ managerData()!.teamMemberHours.length }}</div>
                <div class="kpi-label">עובדים פעילים</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>schedule</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ toHours(managerData()!.teamTotalHoursThisWeek) }}</div>
                <div class="kpi-label">שעות צוות השבוע</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>calendar_month</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ toHours(managerData()!.teamTotalHoursThisMonth) }}</div>
                <div class="kpi-label">שעות צוות החודש</div>
              </div>
            </div>
            <div class="kpi-card">
              <mat-icon>task_alt</mat-icon>
              <div class="kpi-body">
                <div class="kpi-value">{{ avgCompletion() }}%</div>
                <div class="kpi-label">השלמת משימות בממוצע</div>
              </div>
            </div>
          </div>

          <div class="charts-row">
            <div class="chart-card chart-card-lg">
              <div class="chart-card-header"><mat-icon>donut_large</mat-icon><span>התקדמות פרויקטים</span></div>
              <div class="chart-body">
                @if (hasProjectData()) { <canvas #projectDoughnut></canvas> }
                @else { <div class="chart-empty"><mat-icon>folder_off</mat-icon><p>אין פרויקטים עם משימות</p></div> }
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-card-header"><mat-icon>person</mat-icon><span>שעות עובדים — השבוע</span></div>
              <div class="chart-body">
                @if (managerData()!.teamMemberHours.length > 0) { <canvas #memberBar></canvas> }
                @else { <div class="chart-empty"><mat-icon>people_outline</mat-icon><p>אין נתוני שעות</p></div> }
              </div>
            </div>
          </div>

          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-card-header"><mat-icon>bar_chart</mat-icon><span>שעות לפי פרויקט</span></div>
              <div class="chart-body"><canvas #projectHoursBar></canvas></div>
            </div>
            <div class="chart-card chart-card-lg">
              <div class="chart-card-header"><mat-icon>show_chart</mat-icon><span>שעות צוות — השבוע הנוכחי</span></div>
              <div class="chart-body"><canvas #weekLine></canvas></div>
            </div>
          </div>

          <div class="chart-card full-width-card">
            <div class="chart-card-header"><mat-icon>stacked_bar_chart</mat-icon><span>פירוט משימות לפי פרויקט</span></div>
            <div class="project-bars">
              @for (p of managerData()!.projectStats; track p.projectId) {
                <div class="project-bar-row">
                  <div class="project-bar-label">{{ p.projectName }}</div>
                  <div class="project-bar-track">
                    @if (p.totalTasks > 0) {
                      <div class="project-bar-done" [style.width.%]="p.doneTasks       / p.totalTasks * 100" matTooltip="הושלם: {{ p.doneTasks }}"></div>
                      <div class="project-bar-prog" [style.width.%]="p.inProgressTasks / p.totalTasks * 100" matTooltip="בביצוע: {{ p.inProgressTasks }}"></div>
                      <div class="project-bar-todo" [style.width.%]="p.todoTasks       / p.totalTasks * 100" matTooltip="ממתין: {{ p.todoTasks }}"></div>
                    } @else {
                      <div class="project-bar-empty">אין משימות</div>
                    }
                  </div>
                  <div class="project-bar-pct">{{ p.completionPercent }}%</div>
                  <div class="project-bar-count">{{ p.doneTasks }}/{{ p.totalTasks }}</div>
                </div>
              }
            </div>
            <div class="legend">
              <span class="legend-item done"><span></span>הושלם</span>
              <span class="legend-item prog"><span></span>בביצוע</span>
              <span class="legend-item todo"><span></span>ממתין</span>
            </div>
          </div>

        </div>
      }

      <div class="quick-actions">
        <a class="action-card" routerLink="/time-entries">
          <div class="action-icon purple"><mat-icon>add_circle</mat-icon></div>
          <div class="action-text">
            <div class="action-title">דווח שעות</div>
            <div class="action-sub">דיווח ידני או טיימר</div>
          </div>
          <mat-icon class="action-arrow">chevron_left</mat-icon>
        </a>
        <a class="action-card" routerLink="/projects">
          <div class="action-icon blue"><mat-icon>folder_open</mat-icon></div>
          <div class="action-text">
            <div class="action-title">פרויקטים</div>
            <div class="action-sub">צפה וערוך פרויקטים</div>
          </div>
          <mat-icon class="action-arrow">chevron_left</mat-icon>
        </a>
        <a class="action-card" routerLink="/tasks">
          <div class="action-icon teal"><mat-icon>task_alt</mat-icon></div>
          <div class="action-text">
            <div class="action-title">משימות</div>
            <div class="action-sub">עקוב אחרי המשימות שלך</div>
          </div>
          <mat-icon class="action-arrow">chevron_left</mat-icon>
        </a>
      </div>

      <div class="card">
        <div class="card-title-row">
          <div class="card-title">
            <mat-icon>history</mat-icon>
            <span>דיווחים אחרונים</span>
          </div>
          <a class="link-btn" routerLink="/time-entries">ראה הכל ←</a>
        </div>
        <div class="entries-list">
          @for (entry of dashboard()?.recentEntries; track entry.timeEntryId) {
            <div class="entry-row">
              <div class="entry-date">{{ entry.date | date:'d/M' }}</div>
              <div class="entry-info">
                <div class="entry-project">{{ entry.projectName }}</div>
                @if (entry.taskName) { <div class="entry-task">{{ entry.taskName }}</div> }
                @if (entry.description) { <div class="entry-desc">{{ entry.description }}</div> }
              </div>
              <div class="entry-right">
                <div class="entry-duration">{{ formatDuration(entry.durationMinutes) }}</div>
                <span class="badge" [class]="'badge-' + entry.status.toLowerCase()">{{ statusLabel(entry.status) }}</span>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>אין דיווחים עדיין — <a routerLink="/time-entries">התחל לדווח</a></p>
            </div>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .dashboard { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 24px; }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    .timer-banner {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      color: white; border-radius: 14px; padding: 16px 24px;
      margin-bottom: 24px; gap: 16px; flex-wrap: wrap; text-decoration: none;
    }
    .timer-banner-right { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .timer-banner-left { display: flex; align-items: center; gap: 12px; }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .timer-label { opacity: 0.7; font-size: 12px; }
    .timer-count { font-size: 22px; font-weight: 300; font-variant-numeric: tabular-nums; letter-spacing: 2px; }
    .btn-link { color: rgba(255,255,255,0.7); font-size: 13px; }

    .stats-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { flex: 1; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; color: white; }
    .stat-blue { background: linear-gradient(135deg, #4f46e5, #6366f1); }
    .stat-purple { background: linear-gradient(135deg, #7c3aed, #a78bfa); }
    .stat-teal { background: linear-gradient(135deg, #0891b2, #22d3ee); }
    .stat-icon mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.85; }
    .stat-value { font-size: 30px; font-weight: 800; line-height: 1; }
    .stat-label { font-size: 13px; opacity: 0.85; margin-top: 4px; }

    /* Period breakdown card */
    .breakdown-card {
      background: white; border-radius: 16px;
      box-shadow: 0 2px 12px rgba(30,27,75,0.07);
      margin-bottom: 24px; overflow: hidden;
    }
    .breakdown-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid #f3f4f6;
    }
    .breakdown-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 700; color: #1e1b4b;
    }
    .breakdown-title mat-icon { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; }
    .period-tabs { display: flex; gap: 4px; background: #f3f4f6; border-radius: 10px; padding: 3px; }
    .period-tab {
      height: 32px; padding: 0 16px; border: none; border-radius: 8px;
      background: transparent; color: #6b7280; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .period-tab.active { background: white; color: #4f46e5; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .period-tab:not(.active):hover { color: #374151; }

    .breakdown-body {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0;
    }
    .breakdown-col {
      padding: 20px 24px;
    }
    .breakdown-col:first-child { border-left: 1px solid #f3f4f6; }
    .breakdown-col-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 16px;
    }
    .breakdown-col-title mat-icon { font-size: 16px; width: 16px; height: 16px; color: #4f46e5; }

    .period-chart-wrap { height: 180px; position: relative; margin-bottom: 12px; }
    .period-chart-wrap canvas { max-height: 180px; }

    .project-items { display: flex; flex-direction: column; gap: 6px; }
    .project-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .project-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .project-item-name { flex: 1; color: #374151; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .project-item-hours { font-weight: 700; color: #1e1b4b; font-size: 12px; }

    .task-hours-list { display: flex; flex-direction: column; gap: 10px; }
    .task-hours-row { display: flex; align-items: center; gap: 10px; }
    .task-hours-name {
      width: 130px; font-size: 13px; color: #374151; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;
    }
    .task-hours-bar-wrap {
      flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden;
    }
    .task-hours-bar {
      height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed);
      border-radius: 4px; transition: width 0.4s ease;
    }
    .task-hours-val { font-size: 12px; font-weight: 700; color: #4f46e5; width: 40px; text-align: left; flex-shrink: 0; }

    .breakdown-empty { text-align: center; padding: 32px 0; color: #9ca3af; }
    .breakdown-empty mat-icon { font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto 8px; opacity: 0.3; }
    .breakdown-empty p { margin: 0; font-size: 13px; }

    /* Manager section */
    .charts-section { margin-bottom: 24px; }

    .manager-kpis {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px;
    }
    .kpi-card {
      background: white; border-radius: 14px; padding: 16px 18px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 2px 10px rgba(30,27,75,0.07);
    }
    .kpi-card mat-icon { color: #4f46e5; font-size: 26px; width: 26px; height: 26px; flex-shrink: 0; }
    .kpi-value { font-size: 22px; font-weight: 800; color: #1e1b4b; line-height: 1.1; }
    .kpi-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }

    .charts-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    }
    .chart-card {
      background: white; border-radius: 16px; padding: 20px;
      box-shadow: 0 2px 12px rgba(30,27,75,0.07);
    }
    .chart-card-lg { grid-column: span 1; }
    .full-width-card { margin-bottom: 0; }
    .chart-card-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #1e1b4b; margin-bottom: 16px;
    }
    .chart-card-header mat-icon { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; }
    .chart-body { position: relative; height: 220px; display: flex; align-items: center; justify-content: center; }
    .chart-body canvas { max-height: 220px; }
    .chart-empty { text-align: center; color: #9ca3af; }
    .chart-empty mat-icon { font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto 8px; opacity: 0.35; }
    .chart-empty p { font-size: 13px; margin: 0; }

    /* Project stacked bars */
    .project-bars { display: flex; flex-direction: column; gap: 10px; }
    .project-bar-row { display: flex; align-items: center; gap: 12px; }
    .project-bar-label { width: 200px; font-size: 13px; font-weight: 600; color: #374151; overflow: hidden; text-overflow: ellipsis; text-align: right; }
    .team-meta { display: block; font-size: 11px; font-weight: 400; color: #9ca3af; margin-top: 1px; }

    /* Podium */
    .podium-body { display: flex; align-items: flex-end; justify-content: center; height: 220px; padding: 16px 8px 0; }
    .podium-row { display: flex; align-items: flex-end; gap: 8px; }
    .podium-person { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .podium-crown { font-size: 22px; line-height: 1; margin-bottom: 2px; }
    .podium-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .gold-av { background: linear-gradient(135deg, #f59e0b, #fbbf24); width: 52px; height: 52px; font-size: 16px; }
    .podium-name { font-size: 12px; font-weight: 700; color: #1e1b4b; max-width: 80px; text-align: center; }
    .podium-team { font-size: 10px; color: #9ca3af; max-width: 80px; text-align: center; }
    .podium-hours { font-size: 13px; font-weight: 800; color: #4f46e5; }
    .podium-block {
      width: 80px; border-radius: 8px 8px 0 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 900; color: white; margin-top: 6px;
    }
    .gold-block   { height: 80px; background: linear-gradient(180deg, #f59e0b, #d97706); }
    .silver-block { height: 55px; background: linear-gradient(180deg, #94a3b8, #64748b); }
    .bronze-block { height: 40px; background: linear-gradient(180deg, #c2763a, #a16207); }
    .project-bar-track {
      flex: 1; height: 20px; border-radius: 10px; background: #f3f4f6;
      display: flex; overflow: hidden;
    }
    .project-bar-done { background: #22c55e; transition: width 0.6s ease; }
    .project-bar-prog { background: #f59e0b; transition: width 0.6s ease; }
    .project-bar-todo { background: #e5e7eb; transition: width 0.6s ease; }
    .project-bar-empty { font-size: 11px; color: #9ca3af; line-height: 20px; padding: 0 8px; }
    .project-bar-pct { width: 44px; font-size: 13px; font-weight: 700; color: #1e1b4b; text-align: left; }
    .project-bar-count { width: 44px; font-size: 11px; color: #9ca3af; text-align: left; }
    .legend { display: flex; gap: 20px; margin-top: 12px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
    .legend-item span { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
    .legend-item.done span { background: #22c55e; }
    .legend-item.prog span { background: #f59e0b; }
    .legend-item.todo span { background: #e5e7eb; border: 1px solid #d1d5db; }

    /* Quick actions */
    .quick-actions { display: flex; gap: 16px; margin-bottom: 24px; }
    .action-card {
      flex: 1; display: flex; align-items: center; gap: 14px;
      background: white; border-radius: 14px; padding: 18px 20px;
      text-decoration: none; color: inherit;
      box-shadow: 0 2px 12px rgba(30,27,75,0.07); transition: all 0.2s;
    }
    .action-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30,27,75,0.12); }
    .action-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .action-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .action-icon.purple { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
    .action-icon.blue { background: linear-gradient(135deg, #2563eb, #3b82f6); }
    .action-icon.teal { background: linear-gradient(135deg, #0891b2, #22d3ee); }
    .action-text { flex: 1; }
    .action-title { font-weight: 700; font-size: 14px; color: #1e1b4b; }
    .action-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .action-arrow { color: #d1d5db !important; font-size: 20px !important; width: 20px !important; height: 20px !important; }

    /* Recent entries */
    .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(30,27,75,0.07); }
    .card-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e1b4b; }
    .card-title mat-icon { color: #4f46e5; }
    .link-btn { color: #4f46e5; font-size: 13px; font-weight: 600; text-decoration: none; }
    .entries-list { display: flex; flex-direction: column; }
    .entry-row { display: flex; align-items: flex-start; gap: 16px; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .entry-row:last-child { border-bottom: none; }
    .entry-date { min-width: 40px; font-size: 13px; color: #6b7280; font-weight: 600; padding-top: 2px; }
    .entry-info { flex: 1; }
    .entry-project { font-weight: 600; color: #1e1b4b; font-size: 14px; }
    .entry-task { color: #6b7280; font-size: 13px; }
    .entry-desc { color: #9ca3af; font-size: 12px; margin-top: 2px; }
    .entry-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .entry-duration { font-weight: 700; font-size: 15px; color: #1e1b4b; }
    .badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .badge-draft { background: #ede9fe; color: #5b21b6; }
    .badge-submitted { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }
    .empty-state { text-align: center; padding: 48px; color: #9ca3af; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; display: block; margin: 0 auto 12px; }
    .empty-state p { margin: 0; font-size: 14px; }
    .empty-state a { color: #4f46e5; font-weight: 600; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  dashboard = signal<Dashboard | null>(null);
  managerData = signal<ManagerDashboard | null>(null);
  adminData = signal<AdminDashboard | null>(null);
  activePeriod = signal<'today' | 'week' | 'month'>('week');

  @ViewChild('projectDoughnut')    projectDoughnutRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('memberBar')          memberBarRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectHoursBar')    projectHoursBarRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('weekLine')           weekLineRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('periodProjectChart') periodProjectRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teamWeekBar')        teamWeekBarRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teamMonthBar')       teamMonthBarRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topEmpBar')          topEmpBarRef?: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private periodChart: Chart | null = null;

  readonly CHART_COLORS = [
    '#4f46e5', '#7c3aed', '#0891b2', '#16a34a', '#dc2626',
    '#d97706', '#db2777', '#059669', '#0284c7', '#f97316'
  ];

  periodProjects = computed<ProjectHours[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    const p = this.activePeriod();
    if (p === 'today') return d.todayProjectBreakdown ?? [];
    if (p === 'week')  return d.weekProjectBreakdown  ?? [];
    return d.monthProjectBreakdown ?? [];
  });

  periodTasks = computed<TaskHoursItem[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    const p = this.activePeriod();
    if (p === 'today') return d.todayTaskBreakdown ?? [];
    if (p === 'week')  return d.weekTaskBreakdown  ?? [];
    return d.monthTaskBreakdown ?? [];
  });

  maxTaskHours = computed(() => {
    const tasks = this.periodTasks();
    return tasks.length ? Math.max(...tasks.map(t => t.hours)) : 1;
  });

  projectColor(index: number): string {
    return this.CHART_COLORS[index % this.CHART_COLORS.length];
  }

  private tick = toSignal(interval(1000), { initialValue: 0 });
  timerStart = signal<Date | null>(null);
  timerDisplay = computed(() => {
    this.tick();
    const start = this.timerStart();
    if (!start) return '00:00:00';
    const s = Math.floor((Date.now() - start.getTime()) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  });

  constructor(
    public auth: AuthService,
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.reportService.getDashboard().subscribe(d => {
      this.dashboard.set(d);
      this.cdr.detectChanges();
      setTimeout(() => this.buildPeriodChart(), 50);
    });
    const saved = localStorage.getItem(TIMER_KEY);
    if (saved) this.timerStart.set(new Date(saved));

    if (this.auth.hasRole('Admin')) {
      this.reportService.getAdminDashboard().subscribe(d => {
        this.adminData.set(d);
        this.cdr.detectChanges();
        setTimeout(() => this.buildAdminCharts(), 50);
      });
    } else if (this.auth.hasRole('Manager')) {
      this.reportService.getManagerDashboard().subscribe(d => {
        this.managerData.set(d);
        this.cdr.detectChanges();
        setTimeout(() => this.buildCharts(), 50);
      });
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
    this.periodChart?.destroy();
  }

  changePeriod(p: 'today' | 'week' | 'month') {
    this.activePeriod.set(p);
    this.cdr.detectChanges();
    setTimeout(() => this.buildPeriodChart(), 30);
  }

  private buildPeriodChart() {
    this.periodChart?.destroy();
    this.periodChart = null;
    const projects = this.periodProjects();
    if (!projects.length || !this.periodProjectRef?.nativeElement) return;

    this.periodChart = new Chart(this.periodProjectRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: projects.map(p => p.projectName),
        datasets: [{
          data: projects.map(p => p.hours),
          backgroundColor: projects.map((_, i) => this.CHART_COLORS[i % this.CHART_COLORS.length]),
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${this.toHours(ctx.parsed as number)}`
            }
          }
        }
      }
    });
  }

  hasProjectData(): boolean {
    return (this.managerData()?.projectStats ?? []).some(p => p.totalTasks > 0);
  }

  avgCompletion(): number {
    const stats = this.managerData()?.projectStats ?? [];
    const withTasks = stats.filter(p => p.totalTasks > 0);
    if (!withTasks.length) return 0;
    return Math.round(withTasks.reduce((s, p) => s + p.completionPercent, 0) / withTasks.length);
  }

  private buildCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    const data = this.managerData();
    if (!data) return;

    const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

    // 1. Doughnut — project completion %
    if (this.projectDoughnutRef && this.hasProjectData()) {
      const ps = data.projectStats.filter(p => p.totalTasks > 0);
      this.charts.push(new Chart(this.projectDoughnutRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ps.map(p => p.projectName),
          datasets: [{
            data: ps.map(p => p.completionPercent),
            backgroundColor: CHART_COLORS.slice(0, ps.length),
            borderWidth: 3,
            borderColor: '#fff',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'right', labels: { font: { family: 'Heebo', size: 12 }, padding: 12 } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
          }
        }
      }));
    }

    // 2. Bar — team member hours this week
    if (this.memberBarRef && data.teamMemberHours.length) {
      const members = data.teamMemberHours.slice(0, 8);
      this.charts.push(new Chart(this.memberBarRef.nativeElement, {
        type: 'bar',
        data: {
          labels: members.map(m => m.fullName.split(' ')[0]),
          datasets: [{
            label: 'שעות השבוע',
            data: members.map(m => m.weekHours),
            backgroundColor: members.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'cc'),
            borderColor:     members.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 2, borderRadius: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Heebo', size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { family: 'Heebo', size: 11 } } }
          }
        }
      }));
    }

    // 3. Horizontal bar — project hours
    if (this.projectHoursBarRef) {
      const ps = data.projectStats.filter(p => p.totalHours > 0);
      const labels = ps.length ? ps.map(p => p.projectName) : ['אין נתונים'];
      const values = ps.length ? ps.map(p => p.totalHours) : [0];
      this.charts.push(new Chart(this.projectHoursBarRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'שעות',
            data: values,
            backgroundColor: '#4f46e580',
            borderColor: '#4f46e5',
            borderWidth: 2, borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Heebo', size: 11 } } },
            y: { grid: { display: false }, ticks: { font: { family: 'Heebo', size: 11 } } }
          }
        }
      }));
    }

    // 4. Line — team hours this week
    if (this.weekLineRef) {
      const wb = data.teamWeekBreakdown;
      this.charts.push(new Chart(this.weekLineRef.nativeElement, {
        type: 'line',
        data: {
          labels: wb.map((d, i) => days[i]),
          datasets: [{
            label: 'שעות צוות',
            data: wb.map(d => d.hours),
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.1)',
            pointBackgroundColor: '#7c3aed',
            pointRadius: 5, pointHoverRadius: 7,
            borderWidth: 3, tension: 0.4, fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Heebo', size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { family: 'Heebo', size: 12 } } }
          }
        }
      }));
    }
  }

  private buildAdminCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    const data = this.adminData();
    if (!data) return;
    const teams = data.teamStats;
    const labels = teams.map(t => t.teamName);

    const barOpts = (label: string) => ({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Heebo', size: 11 } },
             title: { display: true, text: label, font: { family: 'Heebo', size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Heebo', size: 12 } } }
      }
    });

    if (this.teamWeekBarRef) {
      this.charts.push(new Chart(this.teamWeekBarRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'שעות השבוע',
            data: teams.map(t => t.weekHours),
            backgroundColor: teams.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'cc'),
            borderColor:     teams.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 2, borderRadius: 8
          }]
        },
        options: barOpts('שעות') as any
      }));
    }

    if (this.teamMonthBarRef) {
      this.charts.push(new Chart(this.teamMonthBarRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'שעות החודש',
            data: teams.map(t => t.monthHours),
            backgroundColor: teams.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + '99'),
            borderColor:     teams.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 2, borderRadius: 8
          }]
        },
        options: barOpts('שעות') as any
      }));
    }

    // Top employees horizontal bar
    if (this.topEmpBarRef && data.topEmployees.length) {
      const emps = data.topEmployees;
      this.charts.push(new Chart(this.topEmpBarRef.nativeElement, {
        type: 'bar',
        data: {
          labels: emps.map(e => e.fullName.split(' ')[0] + (e.fullName.split(' ')[1] ? ' ' + e.fullName.split(' ')[1][0] + '.' : '')),
          datasets: [{
            label: 'שעות החודש',
            data: emps.map(e => e.monthHours),
            backgroundColor: [
              '#f59e0b', '#94a3b8', '#c2763a',
              ...emps.slice(3).map((_, i) => CHART_COLORS[(i + 3) % CHART_COLORS.length] + 'cc')
            ],
            borderColor: [
              '#d97706', '#64748b', '#a16207',
              ...emps.slice(3).map((_, i) => CHART_COLORS[(i + 3) % CHART_COLORS.length])
            ],
            borderWidth: 2, borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Heebo', size: 11 } } },
            y: { grid: { display: false }, ticks: { font: { family: 'Heebo', size: 12 } } }
          }
        } as any
      }));
    }
  }

  get firstName(): string {
    return this.auth.currentUser()?.fullName?.split(' ')[0] ?? '';
  }

  initials(name: string): string {
    return (name ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  firstName2(name: string): string {
    const parts = (name ?? '').split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  }

  toHours(hours?: number): string {
    if (!hours) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  statusLabel(status: string): string {
    const m: any = { Draft: 'טיוטה', Submitted: 'הוגש', Approved: 'אושר', Rejected: 'נדחה' };
    return m[status] ?? status;
  }
}
