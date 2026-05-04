import { Component, OnInit, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommitsPanelComponent } from '../git/commits-panel.component';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { TimeEntry, Project } from '../../models/models';
import { TimeEntryFormComponent } from './time-entry-form.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { interval } from 'rxjs';

const TIMER_KEY = 'timein_timer_start';
const TIMER_STOPPED_KEY = 'timein_timer_stopped_ms';

@Component({
  selector: 'app-time-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule,
    MatDialogModule, MatSnackBarModule, MatTooltipModule, CommitsPanelComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>דיווחי שעות</h1>
          <p class="header-sub">דווח ידנית או הפעל טיימר</p>
        </div>
      </div>

      <!-- Log section -->
      <div class="log-section">
        <div class="log-tabs">
          <button class="log-tab" [class.active]="mode === 'manual'" (click)="mode = 'manual'">
            <mat-icon>edit_note</mat-icon>
            <span>דיווח ידני</span>
          </button>
          <button class="log-tab" [class.active]="mode === 'timer'" (click)="mode = 'timer'">
            <mat-icon>timer</mat-icon>
            <span>טיימר</span>
            @if (timerStart()) { <span class="live-dot"></span> }
          </button>
        </div>

        <!-- Manual -->
        @if (mode === 'manual') {
          <div class="log-panel manual-panel">
            <p class="panel-desc">מלא את הפרטים ושמור דיווח שעות עבור יום עבודה שהסתיים.</p>
            <button class="btn-primary" (click)="openForm()">
              <mat-icon>add</mat-icon> פתח טופס דיווח
            </button>
          </div>
        }

        <!-- Timer -->
        @if (mode === 'timer') {
          <div class="log-panel timer-panel">

            @if (!timerStart() && !stoppedDurationMs()) {
              <!-- Idle -->
              <div class="timer-idle">
                <div class="timer-idle-icon">
                  <mat-icon>play_circle</mat-icon>
                </div>
                <div class="timer-idle-text">
                  <h3>מוכן להתחיל?</h3>
                  <p>לחץ על הכפתור כשאתה מתחיל לעבוד. בסיום תבחר לאיזה פרויקט לשייך את הזמן.</p>
                </div>
                <button class="btn-start-work" (click)="startWork()">
                  <mat-icon>play_arrow</mat-icon>
                  התחלתי לעבוד
                </button>
              </div>

            } @else if (timerStart()) {
              <!-- Running -->
              <div class="timer-running">
                <div class="timer-top">
                  <span class="live-dot large"></span>
                  <span class="timer-since">עובד מאז {{ startTimeLabel() }}</span>
                </div>
                <div class="timer-display">{{ timerDisplay() }}</div>
                <div class="timer-bottom">
                  <button class="btn-stop-work" (click)="pauseWork()">
                    <mat-icon>pause_circle</mat-icon>
                    עצור
                  </button>
                  <button class="btn-finish-work" (click)="finishWork()">
                    <mat-icon>stop_circle</mat-icon>
                    סיום עבודה
                  </button>
                </div>
              </div>

            } @else {
              <!-- Stopped -->
              <div class="timer-stopped">
                <div class="timer-stopped-badge">
                  <mat-icon>pause</mat-icon>
                  <span>טיימר מושהה</span>
                </div>
                <div class="timer-display stopped">{{ stoppedDisplay() }}</div>
                <div class="timer-stopped-actions">
                  <button class="btn-resume-work" (click)="resumeWork()">
                    <mat-icon>play_arrow</mat-icon>
                    המשך
                  </button>
                  <button class="btn-finish-work" (click)="finishWork()">
                    <mat-icon>save</mat-icon>
                    שמור דיווח
                  </button>
                </div>
              </div>
            }

          </div>
        }
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>פרויקט</mat-label>
          <mat-select [(ngModel)]="filter.projectId" (ngModelChange)="loadEntries()">
            <mat-option [value]="null">כל הפרויקטים</mat-option>
            @for (p of projects(); track p.projectId) {
              <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>סטטוס</mat-label>
          <mat-select [(ngModel)]="filter.status" (ngModelChange)="loadEntries()">
            <mat-option value="">הכל</mat-option>
            <mat-option value="Draft">טיוטה</mat-option>
            <mat-option value="Submitted">הוגש</mat-option>
            <mat-option value="Approved">אושר</mat-option>
            <mat-option value="Rejected">נדחה</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>מתאריך</mat-label>
          <input matInput type="date" [(ngModel)]="filter.fromDate" (change)="loadEntries()" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>עד תאריך</mat-label>
          <input matInput type="date" [(ngModel)]="filter.toDate" (change)="loadEntries()" />
        </mat-form-field>
        <button class="btn-outline-sm" (click)="clearFilters()">
          <mat-icon>filter_list_off</mat-icon> נקה
        </button>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-title-row">
          <span class="table-count">{{ entries().length }} רשומות</span>
        </div>
        <table mat-table [dataSource]="entries()" class="main-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>תאריך</th>
            <td mat-cell *matCellDef="let e">{{ e.date | date:'d/M/yy' }}</td>
          </ng-container>
          <ng-container matColumnDef="project">
            <th mat-header-cell *matHeaderCellDef>פרויקט</th>
            <td mat-cell *matCellDef="let e"><strong>{{ e.projectName }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="task">
            <th mat-header-cell *matHeaderCellDef>משימה</th>
            <td mat-cell *matCellDef="let e">{{ e.taskName || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>משך</th>
            <td mat-cell *matCellDef="let e"><strong>{{ formatDuration(e.durationMinutes) }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>תיאור</th>
            <td mat-cell *matCellDef="let e" class="desc-cell">{{ e.description || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>סטטוס</th>
            <td mat-cell *matCellDef="let e">
              <span class="badge" [class]="'badge-' + e.status.toLowerCase()">{{ statusLabel(e.status) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="links">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e" class="links-cell">
              @if (e.relatedCommitIds) {
                <span class="link-chip commit-chip" [matTooltip]="'Commit: ' + e.relatedCommitIds.slice(0,7)">
                  <mat-icon>commit</mat-icon>
                </span>
              }
              @if (e.relatedClickUpTaskId) {
                <a [href]="e.clickUpUrl" target="_blank" class="link-chip clickup-chip"
                  [matTooltip]="'ClickUp: ' + e.relatedClickUpTaskId">
                  <mat-icon>link</mat-icon>
                </a>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              @if (e.status === 'Draft' || e.status === 'Rejected') {
                <button mat-icon-button color="primary" (click)="submitEntry(e)"
                  [matTooltip]="e.status === 'Rejected' ? 'שלח שוב לאישור' : 'שלח לאישור'">
                  <mat-icon>send</mat-icon>
                </button>
              }
              @if (e.status !== 'Submitted' && e.status !== 'Approved') {
                <button mat-icon-button (click)="openForm(e)" matTooltip="עריכה"><mat-icon>edit</mat-icon></button>
              }
              @if (e.status === 'Draft' || e.status === 'Rejected') {
                <button mat-icon-button color="warn" (click)="deleteEntry(e)" matTooltip="מחיקה"><mat-icon>delete</mat-icon></button>
              }
              @if (e.status === 'Submitted') {
                <span class="pending-label">ממתין לאישור</span>
              }
              @if (e.status === 'Rejected' && e.rejectionReason) {
                <button mat-icon-button [matTooltip]="e.rejectionReason" matTooltipPosition="left">
                  <mat-icon style="color:#dc2626">info</mat-icon>
                </button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
        </table>
        @if (entries().length === 0) {
          <div class="empty-state">
            <mat-icon>schedule</mat-icon>
            <p>לא נמצאו דיווחים</p>
          </div>
        }
      </div>

      <app-commits-panel></app-commits-panel>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 24px; }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    /* Log section */
    .log-section {
      background: white; border-radius: 16px;
      box-shadow: 0 2px 12px rgba(30,27,75,0.07);
      margin-bottom: 24px; overflow: hidden;
    }
    .log-tabs { display: flex; border-bottom: 2px solid #f3f4f6; }
    .log-tab {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 18px; border: none; background: none;
      font-size: 15px; font-weight: 600; font-family: 'Heebo', sans-serif;
      color: #6b7280; cursor: pointer; transition: all 0.2s; position: relative;
    }
    .log-tab mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .log-tab:hover { color: #4f46e5; background: #fafafe; }
    .log-tab.active { color: #4f46e5; border-bottom: 3px solid #4f46e5; margin-bottom: -2px; }

    .live-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
      animation: blink 1.5s infinite;
    }
    .live-dot.large { width: 10px; height: 10px; }
    @keyframes blink {
      0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
    }

    .log-panel { padding: 32px; }
    .panel-desc { color: #6b7280; font-size: 14px; margin: 0 0 20px; }

    /* Manual */
    .manual-panel { display: flex; flex-direction: column; align-items: flex-start; }

    /* Timer idle */
    .timer-idle {
      display: flex; align-items: center; gap: 28px; flex-wrap: wrap;
    }
    .timer-idle-icon mat-icon {
      font-size: 56px; width: 56px; height: 56px;
      color: #4f46e5; opacity: 0.6;
    }
    .timer-idle-text { flex: 1; min-width: 200px; }
    .timer-idle-text h3 { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e1b4b; }
    .timer-idle-text p { margin: 0; font-size: 14px; color: #6b7280; }

    .btn-start-work {
      display: flex; align-items: center; gap: 10px;
      padding: 0 32px; height: 56px; border: none; border-radius: 14px;
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: white; font-size: 16px; font-weight: 700; font-family: 'Heebo', sans-serif;
      cursor: pointer; white-space: nowrap; box-shadow: 0 4px 16px rgba(34,197,94,0.35);
      transition: all 0.2s;
    }
    .btn-start-work:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(34,197,94,0.45); }
    .btn-start-work mat-icon { font-size: 24px; width: 24px; height: 24px; }

    /* Timer running */
    .timer-running { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .timer-top { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; font-weight: 600; }
    .timer-since { color: #6b7280; }
    .timer-display {
      font-size: 72px; font-weight: 300; color: #1e1b4b;
      font-variant-numeric: tabular-nums; letter-spacing: 4px; line-height: 1;
    }
    .timer-bottom {}

    .timer-bottom { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

    .btn-stop-work {
      display: flex; align-items: center; gap: 10px;
      padding: 0 28px; height: 56px; border: none; border-radius: 14px;
      background: #f3f4f6; color: #374151;
      font-size: 16px; font-weight: 700; font-family: 'Heebo', sans-serif;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-stop-work:hover { background: #e5e7eb; transform: translateY(-1px); }
    .btn-stop-work mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .btn-finish-work {
      display: flex; align-items: center; gap: 10px;
      padding: 0 36px; height: 56px; border: none; border-radius: 14px;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: white; font-size: 16px; font-weight: 700; font-family: 'Heebo', sans-serif;
      cursor: pointer; box-shadow: 0 4px 16px rgba(220,38,38,0.35); transition: all 0.2s;
    }
    .btn-finish-work:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(220,38,38,0.45); }
    .btn-finish-work mat-icon { font-size: 24px; width: 24px; height: 24px; }

    /* Stopped state */
    .timer-stopped { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .timer-stopped-badge {
      display: flex; align-items: center; gap: 6px;
      background: #fef3c7; color: #92400e;
      padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
    }
    .timer-stopped-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .timer-display.stopped { color: #9ca3af; }
    .timer-stopped-actions { display: flex; gap: 12px; }
    .btn-resume-work {
      display: flex; align-items: center; gap: 10px;
      padding: 0 32px; height: 56px; border: none; border-radius: 14px;
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: white; font-size: 16px; font-weight: 700; font-family: 'Heebo', sans-serif;
      cursor: pointer; box-shadow: 0 4px 16px rgba(34,197,94,0.35); transition: all 0.2s;
    }
    .btn-resume-work:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(34,197,94,0.45); }
    .btn-resume-work mat-icon { font-size: 24px; width: 24px; height: 24px; }

    /* Buttons */
    .btn-primary {
      height: 48px; padding: 0 24px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 14px; font-weight: 600; font-family: 'Heebo', sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-primary:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.4); transform: translateY(-1px); }
    .btn-outline-sm {
      height: 56px; padding: 0 16px; border: 1px solid #e5e7eb; border-radius: 10px;
      background: white; color: #374151; font-size: 14px; font-family: 'Heebo', sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s;
    }
    .btn-outline-sm:hover { border-color: #4f46e5; color: #4f46e5; }

    /* Filters */
    .filter-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; margin-bottom: 20px; }
    .filter-field { min-width: 160px; }

    /* Table */
    .table-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(30,27,75,0.07); overflow: hidden; }
    .table-title-row { padding: 16px 20px 0; }
    .table-count { font-size: 13px; color: #6b7280; font-weight: 600; }
    .main-table { width: 100%; }
    .mat-mdc-header-row { background: #f9f8ff; }
    th.mat-mdc-header-cell { font-weight: 700; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6; padding: 14px 16px; }
    td.mat-mdc-cell { padding: 14px 16px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
    .table-row:hover td { background: #fafafe; }
    .table-row:last-child td { border-bottom: none; }
    .desc-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #6b7280; font-size: 13px; }

    .badge { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
    .badge-draft { background: #ede9fe; color: #5b21b6; }
    .badge-submitted { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }

    .links-cell { white-space: nowrap; padding: 8px 4px !important; }
    .link-chip {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
      text-decoration: none; margin-left: 4px;
    }
    .link-chip mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .commit-chip { background: #dcfce7; color: #16a34a; }
    .clickup-chip { background: #ede9fe; color: #7c3aed; }
    .pending-label { font-size: 11px; color: #92400e; background: #fef3c7; padding: 3px 8px; border-radius: 20px; font-weight: 600; }
    .empty-state { text-align: center; padding: 64px; color: #9ca3af; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; opacity: 0.4; }
    .empty-state p { margin: 0; font-size: 14px; }
  `]
})
export class TimeEntriesComponent implements OnInit {
  entries = signal<TimeEntry[]>([]);
  projects = signal<Project[]>([]);
  mode: 'manual' | 'timer' = 'manual';
  filter: any = {};
  displayedColumns = ['date', 'project', 'task', 'duration', 'description', 'status', 'links', 'actions'];

  private tick = toSignal(interval(1000), { initialValue: 0 });
  timerStart = signal<Date | null>(null);
  stoppedDurationMs = signal<number | null>(null);

  timerDisplay = computed(() => {
    this.tick();
    const start = this.timerStart();
    if (!start) return '00:00:00';
    const s = Math.floor((Date.now() - start.getTime()) / 1000);
    return this.formatSeconds(s);
  });

  stoppedDisplay = computed(() => {
    const ms = this.stoppedDurationMs();
    if (ms === null) return '00:00:00';
    return this.formatSeconds(Math.floor(ms / 1000));
  });

  startTimeLabel = computed(() => {
    const start = this.timerStart();
    if (!start) return '';
    return start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  });

  constructor(
    private timeEntryService: TimeEntryService,
    private projectService: ProjectService,
    public auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadEntries();
    this.projectService.getAll().subscribe(p => this.projects.set(p));
    const saved = localStorage.getItem(TIMER_KEY);
    const stoppedMs = localStorage.getItem(TIMER_STOPPED_KEY);
    if (stoppedMs) {
      this.stoppedDurationMs.set(Number(stoppedMs));
      this.mode = 'timer';
    } else if (saved) {
      this.timerStart.set(new Date(saved));
      this.mode = 'timer';
    }
  }

  startWork() {
    const now = new Date();
    this.timerStart.set(now);
    this.stoppedDurationMs.set(null);
    localStorage.setItem(TIMER_KEY, now.toISOString());
    localStorage.removeItem(TIMER_STOPPED_KEY);
  }

  pauseWork() {
    const start = this.timerStart();
    if (!start) return;
    const ms = Date.now() - start.getTime();
    this.stoppedDurationMs.set(ms);
    this.timerStart.set(null);
    localStorage.removeItem(TIMER_KEY);
    localStorage.setItem(TIMER_STOPPED_KEY, String(ms));
  }

  resumeWork() {
    const ms = this.stoppedDurationMs();
    if (ms === null) return;
    const fakeStart = new Date(Date.now() - ms);
    this.timerStart.set(fakeStart);
    this.stoppedDurationMs.set(null);
    localStorage.setItem(TIMER_KEY, fakeStart.toISOString());
    localStorage.removeItem(TIMER_STOPPED_KEY);
  }

  finishWork() {
    const start = this.timerStart();
    const stoppedMs = this.stoppedDurationMs();

    const endTime = new Date();
    let durationMinutes: number;
    let startTime: string;

    if (start) {
      durationMinutes = Math.max(1, Math.round((endTime.getTime() - start.getTime()) / 60000));
      startTime = start.toTimeString().slice(0, 5);
    } else if (stoppedMs !== null) {
      durationMinutes = Math.max(1, Math.round(stoppedMs / 60000));
      startTime = new Date(endTime.getTime() - stoppedMs).toTimeString().slice(0, 5);
    } else {
      return;
    }

    const ref = this.dialog.open(TimeEntryFormComponent, {
      width: '560px',
      data: {
        projects: this.projects(),
        prefill: {
          date: endTime.toISOString().slice(0, 10),
          startTime,
          endTime: endTime.toTimeString().slice(0, 5),
          durationMinutes
        }
      }
    });

    ref.afterClosed().subscribe(saved => {
      if (saved) {
        this.timerStart.set(null);
        this.stoppedDurationMs.set(null);
        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(TIMER_STOPPED_KEY);
        this.loadEntries();
        this.snackBar.open('הדיווח נשמר', 'סגור', { duration: 2000 });
      }
    });
  }

  loadEntries() {
    const f: any = {};
    if (this.filter.projectId) f.projectId = this.filter.projectId;
    if (this.filter.status) f.status = this.filter.status;
    if (this.filter.fromDate) f.fromDate = this.filter.fromDate;
    if (this.filter.toDate) f.toDate = this.filter.toDate;
    this.timeEntryService.getAll(f).subscribe(e => this.entries.set(e));
  }

  clearFilters() { this.filter = {}; this.loadEntries(); }

  openForm(entry?: TimeEntry) {
    const ref = this.dialog.open(TimeEntryFormComponent, {
      width: '560px',
      data: { entry, projects: this.projects() }
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.loadEntries(); });
  }

  submitEntry(entry: TimeEntry) {
    this.timeEntryService.submit(entry.timeEntryId).subscribe({
      next: () => { this.loadEntries(); this.snackBar.open('הדיווח הוגש לאישור', 'סגור', { duration: 2500 }); },
      error: () => this.snackBar.open('שגיאה בשליחה לאישור', 'סגור', { duration: 3000 })
    });
  }

  deleteEntry(entry: TimeEntry) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'מחיקת דיווח', message: `למחוק את הדיווח מתאריך ${entry.date}?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.timeEntryService.delete(entry.timeEntryId).subscribe({
        next: () => { this.loadEntries(); this.snackBar.open('הדיווח נמחק', 'סגור', { duration: 2000 }); },
        error: () => this.snackBar.open('מחיקה נכשלה', 'סגור', { duration: 3000 })
      });
    });
  }

  formatSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  statusLabel(s: string): string {
    const m: any = { Draft: 'טיוטה', Submitted: 'הוגש', Approved: 'אושר', Rejected: 'נדחה' };
    return m[s] ?? s;
  }
}
