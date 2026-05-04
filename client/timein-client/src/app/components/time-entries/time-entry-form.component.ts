import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TimeEntryService } from '../../services/time-entry.service';
import { TaskService } from '../../services/task.service';
import { ProjectService } from '../../services/project.service';
import { ReportingRulesService } from '../../services/reporting-rules.service';
import { TimeEntry, Project, Task, ReportingRules, ClickUpTaskSummary } from '../../models/models';
import { GitService, GitCommit } from '../../services/git.service';

@Component({
  selector: 'app-time-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="dialog-header">
      <h2>{{ entry ? 'עריכת דיווח' : fromTimer ? 'סיום עבודה — שמור דיווח' : 'דיווח שעות' }}</h2>
      @if (fromTimer) {
        <div class="timer-summary">
          <mat-icon>timer</mat-icon>
          <span>משך עבודה: <strong>{{ durationLabel }}</strong></span>
        </div>
      }
    </div>

    <mat-dialog-content>
      @if (isLocked) {
        <div class="locked-box">
          <mat-icon>lock</mat-icon>
          <span>הדיווח הוגש לאישור ואינו ניתן לעריכה.</span>
        </div>
      }

      @if (entry?.status === 'Rejected' && entry?.rejectionReason) {
        <div class="reject-box">
          <mat-icon>cancel</mat-icon>
          <div>
            <strong>הדיווח נדחה</strong>
            <span>{{ entry?.rejectionReason }}</span>
          </div>
        </div>
      }

      @if (overlapError) {
        <div class="error-box-top">
          <mat-icon>event_busy</mat-icon>
          <div class="error-box-text">
            <strong>לא ניתן לשמור</strong>
            <span>{{ overlapError }}</span>
          </div>
        </div>
      }

      <form #f="ngForm">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>פרויקט *</mat-label>
          <mat-select [(ngModel)]="model.projectId" name="projectId" required
            (ngModelChange)="onProjectChange()">
            @for (p of data.projects; track p.projectId) {
              <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="task-section">
          <div class="task-header">
            <span class="task-label">משימה {{ taskRequired ? '(חובה) *' : '(אופציונלי)' }}</span>
            <mat-button-toggle-group [(ngModel)]="taskMode" name="taskMode" (ngModelChange)="onTaskModeChange()" class="task-toggle">
              <mat-button-toggle value="select">
                <mat-icon>list</mat-icon>
                בחר מרשימה
              </mat-button-toggle>
              <mat-button-toggle value="manual">
                <mat-icon>edit</mat-icon>
                הקלד ידנית
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          @if (taskMode === 'select') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>בחר משימה</mat-label>
              <mat-select [(ngModel)]="model.taskId" name="taskId" (ngModelChange)="onTaskChange($event)">
                <mat-option [value]="null">ללא משימה</mat-option>
                @for (t of tasks; track t.taskId) {
                  <mat-option [value]="t.taskId">
                    {{ t.taskName }}
                    @if (t.clickUpTaskId) { <span class="cu-badge">ClickUp</span> }
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (selectedTaskClickUpId) {
              <div class="clickup-linked">
                <mat-icon>link</mat-icon>
                <span>משימה זו מקושרת ל-ClickUp — השעות יירשמו אוטומטית בעת האישור</span>
              </div>
            }
          } @else {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>שם המשימה</mat-label>
              <input matInput [(ngModel)]="model.manualTaskName" name="manualTaskName"/>
              <mat-icon matSuffix>edit</mat-icon>
            </mat-form-field>
          }
        </div>

        @if (!fromTimer) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>תאריך *</mat-label>
            <input matInput type="date" [(ngModel)]="model.date" name="date" required [min]="minDate" [max]="today" />
          </mat-form-field>

          <div class="time-row">
            <mat-form-field appearance="outline" [class.field-disabled]="hasDuration">
              <mat-label>שעת התחלה</mat-label>
              <input matInput type="time" [(ngModel)]="model.startTime" name="startTime"
                [disabled]="hasDuration" (ngModelChange)="onTimeRangeChange()" />
            </mat-form-field>
            <mat-form-field appearance="outline" [class.field-disabled]="hasDuration">
              <mat-label>שעת סיום</mat-label>
              <input matInput type="time" [(ngModel)]="model.endTime" name="endTime"
                [disabled]="hasDuration" (ngModelChange)="onTimeRangeChange()" />
            </mat-form-field>
          </div>

          <div class="or-divider">
            <span>או</span>
          </div>

          @if (hasTimeRange) {
            <div class="duration-summary" [class.duration-valid]="calculatedMinutes !== null" [class.duration-invalid]="calculatedMinutes === null">
              <mat-icon>timer</mat-icon>
              @if (calculatedMinutes !== null) {
                <span>סה"כ: <strong>{{ calculatedLabel }}</strong></span>
                <span class="duration-sub">({{ calculatedMinutes }} דקות)</span>
              } @else {
                <span class="duration-warn">שעת הסיום מוקדמת משעת ההתחלה</span>
              }
            </div>
          } @else {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>משך בדקות</mat-label>
              <input matInput type="number" [(ngModel)]="model.durationMinutes" name="durationMinutes"
                min="1" (ngModelChange)="onDurationChange()" />
            </mat-form-field>
          }
        }

        @if (clickUpTasks.length || loadingClickUp) {
          <div class="cu-section">
            <div class="cu-section-title">
              <mat-icon style="color:#7b68ee;font-size:16px;width:16px;height:16px">link</mat-icon>
              <span>משימת ClickUp</span>
              @if (loadingClickUp) { <span class="cu-loading">טוען...</span> }
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>בחר משימת ClickUp (אופציונלי)</mat-label>
              <mat-select [(ngModel)]="model.relatedClickUpTaskId" name="relatedClickUpTaskId"
                (ngModelChange)="onClickUpTaskChange($event)">
                <mat-option [value]="null">ללא קישור</mat-option>
                @for (t of clickUpTasks; track t.id) {
                  <mat-option [value]="t.id">
                    <div class="cu-option">
                      <span>{{ t.name }}</span>
                      @if (t.estimatedHours) {
                        <span class="cu-est">{{ t.estimatedHours }}ש'</span>
                      }
                    </div>
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (selectedClickUpTask) {
              <div class="clickup-linked">
                <mat-icon>link</mat-icon>
                <span>{{ selectedClickUpTask.name }}</span>
                @if (selectedClickUpTask.estimatedHours) {
                  <span class="cu-est-chip">מוערך: {{ selectedClickUpTask.estimatedHours }}ש'</span>
                }
                <span class="cu-status-chip">{{ selectedClickUpTask.status }}</span>
              </div>
            }
          </div>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>תיאור העבודה</mat-label>
          <textarea matInput [(ngModel)]="model.description" name="description" rows="3"
            [placeholder]="fromTimer ? 'על מה עבדת?' : ''"></textarea>
        </mat-form-field>

        <div class="clickup-manual-section">
          <button type="button" class="btn-link" (click)="showClickUpField = !showClickUpField">
            <mat-icon>link</mat-icon>
            {{ showClickUpField ? 'הסתר קישור ClickUp' : 'קשר ל-ClickUp Task ID' }}
          </button>
          @if (showClickUpField) {
            <mat-form-field appearance="outline" class="full-width" style="margin-top:8px">
              <mat-label>ClickUp Task ID (אופציונלי)</mat-label>
              <input matInput [(ngModel)]="model.relatedClickUpTaskId" name="relatedClickUpTaskId"
                />
              <mat-icon matSuffix style="color:#7b68ee">link</mat-icon>
            </mat-form-field>
          }
        </div>

        <div class="git-section">
          <button type="button" class="btn-link" (click)="toggleGitField()">
            <mat-icon>commit</mat-icon>
            {{ showGitField ? 'הסתר קישור Commit' : 'קשר ל-Commit Git' }}
            @if (loadingGits) { <span class="cu-loading">טוען...</span> }
          </button>
          @if (showGitField) {
            @if (gitCommits.length > 0) {
              <mat-form-field appearance="outline" class="full-width" style="margin-top:8px">
                <mat-label>בחר Commit (אופציונלי)</mat-label>
                <mat-select [(ngModel)]="model.relatedCommitIds" name="relatedCommitIds">
                  <mat-option [value]="null">ללא קישור</mat-option>
                  @for (c of gitCommits; track c.hash) {
                    <mat-option [value]="c.hash">
                      {{ c.shortHash }} — {{ c.message | slice:0:50 }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else if (!loadingGits) {
              <div class="no-commits-msg">
                <mat-icon>info_outline</mat-icon>
                <span>לא נמצאו commits ב-7 ימים לפני תאריך הדיווח</span>
              </div>
            }
            @if (model.relatedCommitIds) {
              <div class="commit-linked-row">
                <mat-icon>commit</mat-icon>
                <code class="commit-hash-chip">{{ model.relatedCommitIds | slice:0:7 }}</code>
                @if (linkedCommit) {
                  <span class="commit-msg-preview">{{ linkedCommit.message | slice:0:55 }}</span>
                }
                <button type="button" class="btn-clear-link" (click)="model.relatedCommitIds = null">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          }
        </div>

        @if (warning) {
          <div class="warning-box">
            <mat-icon>warning</mat-icon>
            <span>{{ warning }}</span>
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      @if (!isLocked) {
        <button class="btn-draft" [disabled]="saving || !model.projectId" (click)="save('Draft')">
          <mat-icon>save_as</mat-icon>
          {{ saving ? 'שומר...' : 'שמור כטיוטה' }}
        </button>
        <button mat-raised-button color="primary" [disabled]="saving || !model.projectId" (click)="save('Submitted')">
          <mat-icon>send</mat-icon>
          {{ saving ? 'שולח...' : fromTimer ? 'שמור ושלח לאישור' : 'שלח לאישור' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      padding: 20px 24px 0;
    }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #1e1b4b; }
    .timer-summary {
      display: flex; align-items: center; gap: 6px;
      background: #f0fdf4; color: #15803d; border-radius: 8px;
      padding: 8px 14px; font-size: 14px; margin-bottom: 8px;
    }
    .timer-summary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    mat-dialog-content { min-width: 480px; padding-top: 8px; }
    .full-width { width: 100%; }
    .time-row { display: flex; gap: 16px; }
    .time-row mat-form-field { flex: 1; }
    .or-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 4px 0 8px; color: #9ca3af; font-size: 13px;
    }
    .or-divider::before, .or-divider::after {
      content: ''; flex: 1; height: 1px; background: #e5e7eb;
    }
    .field-disabled { opacity: 0.45; }
    .duration-summary {
      display: flex; align-items: center; gap: 8px;
      border-radius: 10px; padding: 12px 16px;
      font-size: 14px; margin-bottom: 16px;
    }
    .duration-summary mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .duration-valid {
      background: #f0fdf4; color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .duration-valid mat-icon { color: #16a34a; }
    .duration-sub { color: #4ade80; font-size: 12px; }
    .duration-invalid {
      background: #fff7ed; color: #c2410c;
      border: 1px solid #fed7aa;
    }
    .duration-invalid mat-icon { color: #ea580c; }
    .duration-warn { font-size: 13px; }
    .warning-box {
      display: flex; align-items: center; gap: 8px;
      background: #fffbeb; color: #92400e;
      border: 1px solid #fde68a; border-radius: 10px;
      padding: 10px 14px; font-size: 13px; margin-bottom: 8px;
    }
    .warning-box mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .error-box-top {
      display: flex; align-items: flex-start; gap: 12px;
      background: #fef2f2; color: #991b1b;
      border: 1.5px solid #f87171; border-radius: 12px;
      padding: 14px 16px; margin: 0 0 16px; font-size: 13px;
    }
    .error-box-top mat-icon { font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 1px; }
    .error-box-text { display: flex; flex-direction: column; gap: 2px; }
    .error-box-text strong { font-size: 14px; }
    .error-box-text span { color: #b91c1c; }
    .locked-box {
      display: flex; align-items: center; gap: 10px;
      background: #f0f9ff; color: #0369a1;
      border: 1px solid #bae6fd; border-radius: 10px;
      padding: 12px 16px; margin: 0 0 16px; font-size: 13px; font-weight: 600;
    }
    .locked-box mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .reject-box {
      display: flex; align-items: flex-start; gap: 10px;
      background: #fef2f2; color: #991b1b;
      border: 1px solid #fca5a5; border-radius: 10px;
      padding: 12px 16px; margin: 0 0 16px; font-size: 13px;
    }
    .reject-box mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
    .reject-box div { display: flex; flex-direction: column; gap: 2px; }
    .reject-box strong { font-size: 14px; }
    .btn-draft {
      height: 36px; padding: 0 16px; border: 1px solid #d1d5db; border-radius: 8px;
      background: white; color: #374151; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s;
    }
    .btn-draft:hover:not([disabled]) { border-color: #4f46e5; color: #4f46e5; }
    .btn-draft[disabled] { opacity: 0.5; cursor: default; }
    .btn-draft mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .task-section { margin-bottom: 4px; }
    .task-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .task-label { font-size: 13px; color: #6b7280; font-weight: 500; }
    .task-toggle { height: 32px; }
    .task-toggle ::ng-deep .mat-button-toggle { height: 32px; font-size: 12px; }
    .task-toggle ::ng-deep .mat-button-toggle-button { height: 32px; padding: 0 10px; }
    .task-toggle ::ng-deep .mat-button-toggle mat-icon { font-size: 15px; width: 15px; height: 15px; margin-left: 4px; }
    .cu-section { margin-bottom: 12px; }
    .cu-section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700; color: #5b21b6; margin-bottom: 6px;
    }
    .cu-loading { font-size: 11px; color: #9ca3af; font-weight: 400; }
    .cu-option { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .cu-est { font-size: 11px; color: #7b68ee; font-weight: 600; margin-right: 8px; }
    .cu-est-chip {
      font-size: 11px; background: #ede9fe; color: #5b21b6;
      padding: 2px 8px; border-radius: 10px; font-weight: 600;
    }
    .cu-status-chip {
      font-size: 10px; background: #f3f4f6; color: #6b7280;
      padding: 2px 8px; border-radius: 10px; text-transform: capitalize;
    }
    .cu-badge {
      display: inline-block; font-size: 10px; font-weight: 700;
      background: #7b68ee; color: white;
      border-radius: 4px; padding: 1px 5px; margin-right: 6px; vertical-align: middle;
    }
    .clickup-linked {
      display: flex; align-items: center; gap: 8px;
      background: #f5f3ff; color: #5b21b6;
      border: 1px solid #ddd6fe; border-radius: 8px;
      padding: 8px 12px; font-size: 12px; margin-bottom: 12px;
    }
    .clickup-manual-section { margin-bottom: 4px; }
    .git-section { margin-bottom: 4px; }
    .btn-link {
      background: none; border: none; cursor: pointer; padding: 4px 0;
      font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px;
      font-family: 'Heebo', sans-serif;
    }
    .btn-link:hover { color: #7b68ee; }
    .btn-link mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .no-commits-msg {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #9ca3af; padding: 8px 4px;
    }
    .no-commits-msg mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .commit-linked-row {
      display: flex; align-items: center; gap: 8px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      padding: 8px 12px; font-size: 12px; color: #15803d; margin-bottom: 8px;
    }
    .commit-linked-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #16a34a; }
    .commit-hash-chip {
      background: #dcfce7; color: #166534; padding: 2px 7px;
      border-radius: 5px; font-size: 11px; font-family: monospace;
    }
    .commit-msg-preview { flex: 1; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-clear-link {
      background: none; border: none; cursor: pointer; padding: 0; margin-right: auto;
      color: #9ca3af; display: flex; align-items: center;
    }
    .btn-clear-link:hover { color: #ef4444; }
    .btn-clear-link mat-icon { font-size: 15px; width: 15px; height: 15px; }
  `]
})
export class TimeEntryFormComponent implements OnInit {
  entry?: TimeEntry;
  tasks: Task[] = [];
  clickUpTasks: ClickUpTaskSummary[] = [];
  gitCommits: GitCommit[] = [];
  loadingClickUp = false;
  loadingGits = false;
  rules: ReportingRules | null = null;
  warning = '';
  overlapError = '';
  saving = false;
  fromTimer = false;
  taskMode: 'select' | 'manual' = 'select';
  showClickUpField = false;
  showGitField = false;
  selectedTaskClickUpId: string | null = null;
  model: any = { status: 'Draft', date: new Date().toISOString().slice(0, 10) };

  constructor(
    public dialogRef: MatDialogRef<TimeEntryFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      entry?: TimeEntry;
      projects: Project[];
      prefill?: { date: string; startTime: string; endTime: string; durationMinutes: number };
    },
    private timeEntryService: TimeEntryService,
    private taskService: TaskService,
    private projectService: ProjectService,
    private rulesService: ReportingRulesService,
    private gitService: GitService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.rulesService.get().subscribe(r => this.rules = r);
    this.entry = this.data.entry;

    if (this.data.prefill) {
      // Coming from timer
      this.fromTimer = true;
      this.model = {
        ...this.data.prefill,
        status: 'Draft'
      };
    } else if (this.entry) {
      this.model = {
        projectId: this.entry.projectId,
        taskId: this.entry.taskId,
        manualTaskName: this.entry.manualTaskName,
        date: this.entry.date.slice(0, 10),
        startTime: this.entry.startTime,
        endTime: this.entry.endTime,
        durationMinutes: this.entry.durationMinutes,
        description: this.entry.description,
        status: this.entry.status,
        relatedClickUpTaskId: this.entry.relatedClickUpTaskId,
        relatedCommitIds: this.entry.relatedCommitIds
      };
      if (this.entry.manualTaskName && !this.entry.taskId) this.taskMode = 'manual';
      if (this.entry.relatedClickUpTaskId) this.showClickUpField = true;
      if (this.entry.relatedCommitIds) { this.showGitField = true; this.loadGitCommits(); }
      this.onProjectChange();
    }
  }

  get isLocked(): boolean {
    return this.entry?.status === 'Submitted' || this.entry?.status === 'Approved';
  }

  get taskRequired(): boolean {
    return this.rules?.isTaskMandatory ?? false;
  }

  get minDate(): string {
    if (!this.rules || this.rules.retroactiveDaysAllowed < 0) return '';
    const d = new Date();
    d.setDate(d.getDate() - this.rules.retroactiveDaysAllowed);
    return d.toISOString().slice(0, 10);
  }

  get today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get hasTimeRange(): boolean {
    return !!(this.model.startTime || this.model.endTime);
  }

  get calculatedMinutes(): number | null {
    if (!this.model.startTime || !this.model.endTime) return null;
    const [sh, sm] = this.model.startTime.split(':').map(Number);
    const [eh, em] = this.model.endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  }

  get calculatedLabel(): string {
    const m = this.calculatedMinutes;
    if (!m) return '';
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0 && min > 0) return `${h} שעות ${min} דקות`;
    if (h > 0) return `${h} שעות`;
    return `${min} דקות`;
  }

  get hasDuration(): boolean {
    return !!(this.model.durationMinutes && this.model.durationMinutes > 0);
  }

  onTimeRangeChange() {
    if (this.hasTimeRange) this.model.durationMinutes = null;
  }

  onDurationChange() {
    if (this.hasDuration) {
      this.model.startTime = null;
      this.model.endTime = null;
    }
  }

  get durationLabel(): string {
    const m = this.data.prefill?.durationMinutes ?? 0;
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) return `${h}ש' ${min}ד'`;
    return `${min} דקות`;
  }

  onTaskModeChange() {
    if (this.taskMode === 'select') {
      this.model.manualTaskName = null;
    } else {
      this.model.taskId = null;
      this.selectedTaskClickUpId = null;
    }
  }

  get selectedClickUpTask(): ClickUpTaskSummary | null {
    return this.clickUpTasks.find(t => t.id === this.model.relatedClickUpTaskId) ?? null;
  }

  onClickUpTaskChange(id: string | null) {
    this.model.relatedClickUpTaskId = id;
    this.showClickUpField = false;
  }

  onTaskChange(taskId: number | null) {
    const task = this.tasks.find(t => t.taskId === taskId);
    this.selectedTaskClickUpId = task?.clickUpTaskId ?? null;
    if (this.selectedTaskClickUpId) {
      this.model.relatedClickUpTaskId = this.selectedTaskClickUpId;
      this.showClickUpField = false;
    } else if (!taskId) {
      this.selectedTaskClickUpId = null;
    }
  }

  onProjectChange() {
    this.tasks = [];
    this.clickUpTasks = [];
    this.selectedTaskClickUpId = null;
    if (!this.model.projectId) return;

    this.taskService.getAll(this.model.projectId).subscribe(t => this.tasks = t);

    const project = this.data.projects.find(p => p.projectId === this.model.projectId);
    if (project?.externalClickUpListId) {
      this.loadingClickUp = true;
      this.projectService.getClickUpTasks(this.model.projectId).subscribe({
        next: tasks => { this.clickUpTasks = tasks; this.loadingClickUp = false; },
        error: () => { this.loadingClickUp = false; }
      });
    }
  }

  toggleGitField() {
    this.showGitField = !this.showGitField;
    if (this.showGitField && this.gitCommits.length === 0 && !this.loadingGits) {
      this.loadGitCommits();
    }
  }

  loadGitCommits() {
    const dateStr = this.model.date;
    if (!dateStr) return;
    const date = new Date(dateStr);
    const from = new Date(date);
    from.setDate(from.getDate() - 7);
    const to = new Date(date);
    to.setDate(to.getDate() + 1);
    this.loadingGits = true;
    this.gitService.getCommits(from, to).subscribe({
      next: c => { this.gitCommits = c; this.loadingGits = false; },
      error: () => { this.gitCommits = []; this.loadingGits = false; }
    });
  }

  get linkedCommit(): GitCommit | null {
    if (!this.model.relatedCommitIds) return null;
    return this.gitCommits.find(c => c.hash === this.model.relatedCommitIds) ?? null;
  }

  save(status: string = 'Draft') {
    if (!this.model.projectId) return;
    if (this.taskRequired && !this.model.taskId && !this.model.manualTaskName?.trim()) {
      this.overlapError = 'יש לבחור משימה — זהו שדה חובה לפי הגדרות המערכת.';
      return;
    }
    this.saving = true;
    this.overlapError = '';
    const req = { ...this.model, status };
    if (this.hasTimeRange && this.calculatedMinutes) req.durationMinutes = this.calculatedMinutes;
    if (!req.durationMinutes) delete req.durationMinutes;
    if (!req.taskId) delete req.taskId;
    if (this.taskMode !== 'manual') delete req.manualTaskName;

    if (this.entry) {
      this.timeEntryService.update(this.entry.timeEntryId, req).subscribe({
        next: () => {
          const msg = status === 'Submitted' ? 'הדיווח הוגש לאישור' : 'הדיווח נשמר כטיוטה';
          this.dialogRef.close(true); this.snackBar.open(msg, 'סגור', { duration: 2000 });
        },
        error: (err) => {
          this.saving = false;
          const serverMsg: string = err.error?.message;
          const displayMsg = serverMsg || 'שמירה נכשלה — נסה שנית.';
          this.overlapError = displayMsg;
          this.snackBar.open(displayMsg, 'סגור', { duration: 5000 });
        }
      });
    } else {
      this.timeEntryService.create(req).subscribe({
        next: () => {
          const msg = status === 'Submitted' ? 'הדיווח הוגש לאישור' : 'הדיווח נשמר כטיוטה';
          this.dialogRef.close(true);
          this.snackBar.open(msg, 'סגור', { duration: 2000 });
        },
        error: (err) => {
          this.saving = false;
          const serverMsg: string = err.error?.message;
          const displayMsg = serverMsg || 'שמירה נכשלה — נסה שנית.';
          this.overlapError = displayMsg;
          this.snackBar.open(displayMsg, 'סגור', { duration: 5000 });
        }
      });
    }
  }
}
