import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskService } from '../../services/task.service';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { GitService, GitCommit } from '../../services/git.service';
import { Task, Project } from '../../models/models';
import { TaskFormComponent } from './task-form.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatDialogModule, MatFormFieldModule,
    MatSelectModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>משימות</h1>
          <p class="header-sub">{{ dataSource.data.length }} משימות{{ filterMode === 'mine' ? ' (שלי)' : filterMode === 'unassigned' ? ' (לא משויכות)' : ' (צוות)' }}</p>
        </div>
        @if (auth.hasRole('Manager', 'Admin')) {
          <button class="btn-primary" (click)="openForm()">
            <mat-icon>add</mat-icon> משימה חדשה
          </button>
        }
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>סנן לפי פרויקט</mat-label>
          <mat-select [(ngModel)]="selectedProjectId" (ngModelChange)="load()">
            <mat-option [value]="null">כל הפרויקטים</mat-option>
            @for (p of projects; track p.projectId) {
              <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="filter-chips">
          <button class="chip" [class.active]="filterMode === 'team'" (click)="filterMode = 'team'; applyFilter()">
            <mat-icon>group</mat-icon> כל הצוות
          </button>
          <button class="chip" [class.active]="filterMode === 'mine'" (click)="filterMode = 'mine'; applyFilter()">
            <mat-icon>person</mat-icon> שלי
          </button>
          @if (auth.hasRole('Manager', 'Admin')) {
            <button class="chip" [class.active]="filterMode === 'unassigned'" (click)="filterMode = 'unassigned'; applyFilter()">
              <mat-icon>assignment_late</mat-icon> לא משויכות
            </button>
          }
        </div>
      </div>

      <div class="table-card">
        <table mat-table [dataSource]="dataSource" class="main-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>משימה</th>
            <td mat-cell *matCellDef="let t">
              <div class="task-name">{{ t.taskName }}</div>
              @if (t.description) { <div class="task-desc">{{ t.description }}</div> }
            </td>
          </ng-container>
          <ng-container matColumnDef="project">
            <th mat-header-cell *matHeaderCellDef>פרויקט</th>
            <td mat-cell *matCellDef="let t">
              @if (t.projectName) {
                <span class="project-name">{{ t.projectName }}</span>
              } @else if (assigningProjectTaskId === t.taskId) {
                <div class="assign-panel">
                  <mat-select [(ngModel)]="assigningProjectValue" class="assign-select" placeholder="בחר פרויקט">
                    @for (p of projects; track p.projectId) {
                      <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
                    }
                  </mat-select>
                  <div class="assign-actions">
                    <button class="btn-confirm" (click)="confirmAssignProject(t)" [disabled]="!assigningProjectValue">אישור</button>
                    <button class="btn-cancel" (click)="cancelAssignProject()">ביטול</button>
                  </div>
                </div>
              } @else {
                <div class="unassigned-wrap">
                  <span class="unassigned-dot"></span>
                  <span class="unassigned-text">לא משויך</span>
                  @if (auth.hasRole('Manager', 'Admin')) {
                    <button class="btn-assign" (click)="startAssignProject(t)">
                      <mat-icon>add</mat-icon> שייך
                    </button>
                  }
                </div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="assignee">
            <th mat-header-cell *matHeaderCellDef>משויך ל</th>
            <td mat-cell *matCellDef="let t">
              <div class="assignee-cell">
                @if (t.assignedUserName) {
                  <span>{{ t.assignedUserName }}</span>
                }
                @if (t.assignedTeamName) {
                  <span class="team-badge">
                    <mat-icon>group</mat-icon>{{ t.assignedTeamName }}
                  </span>
                }
                @if (!t.assignedUserName && !t.assignedTeamName) {
                  @if (filterMode === 'unassigned' && assigningTeamTaskId === t.taskId) {
                    <div class="assign-panel">
                      <mat-select [(ngModel)]="assigningTeamProjectValue" class="assign-select" placeholder="בחר פרויקט">
                        @for (p of projects; track p.projectId) {
                          <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
                        }
                      </mat-select>
                      <div class="assign-actions">
                        <button class="btn-confirm" (click)="confirmAssignToTeam(t)" [disabled]="!assigningTeamProjectValue">אישור</button>
                        <button class="btn-cancel" (click)="cancelAssignToTeam()">ביטול</button>
                      </div>
                    </div>
                  } @else if (filterMode === 'unassigned') {
                    <button class="btn-assign" (click)="startAssignToTeam(t)">
                      <mat-icon>add</mat-icon> שייך לצוות
                    </button>
                  } @else {
                    <span>—</span>
                  }
                }
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>עדיפות</th>
            <td mat-cell *matCellDef="let t">
              <span class="badge" [class]="'priority-' + t.priority?.toLowerCase()">{{ priorityLabel(t.priority) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>סטטוס</th>
            <td mat-cell *matCellDef="let t">
              <span class="badge" [class]="'task-' + t.status?.toLowerCase()">{{ taskStatusLabel(t.status) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="hours">
            <th mat-header-cell *matHeaderCellDef>מדווח / מוערך</th>
            <td mat-cell *matCellDef="let t">
              <strong>{{ toHHMM(t.loggedHours ?? 0) }}</strong>
              @if (t.estimatedHours) { <span class="muted"> / {{ toHHMM(t.estimatedHours) }}</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="clickup">
            <th mat-header-cell *matHeaderCellDef>ClickUp</th>
            <td mat-cell *matCellDef="let t">
              @if (t.clickUpTaskId) {
                <a [href]="'https://app.clickup.com/t/' + t.clickUpTaskId" target="_blank"
                   class="cu-link" matTooltip="פתח ב-ClickUp ({{ t.clickUpTaskId }})">
                  <mat-icon>open_in_new</mat-icon>
                  <span>{{ t.clickUpTaskId }}</span>
                </a>
              } @else {
                <span class="muted">—</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="commits">
            <th mat-header-cell *matHeaderCellDef>Commits</th>
            <td mat-cell *matCellDef="let t">
              @if (commitCounts[t.taskId]) {
                <button class="commits-toggle"
                  [class.active]="expandedTaskId === t.taskId"
                  (click)="$event.stopPropagation(); toggleCommits(t)"
                  matTooltip="הצג commits">
                  <mat-icon>commit</mat-icon>
                  <span class="commit-count-badge">{{ commitCounts[t.taskId] }}</span>
                </button>
              } @else {
                <span class="muted">—</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let t">
              @if (auth.hasRole('Manager', 'Admin')) {
                <button mat-icon-button (click)="openForm(t)" matTooltip="עריכה"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn" (click)="delete(t)" matTooltip="מחיקה"><mat-icon>delete</mat-icon></button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
        </table>
        @if (!dataSource.data.length) {
          <div class="empty-state">
            <mat-icon>task_alt</mat-icon>
            <p>לא נמצאו משימות</p>
          </div>
        }
      </div>

      @if (expandedTaskId) {
        <div class="commits-panel" #commitsPanel>
          <div class="commits-panel-header">
            <mat-icon>commit</mat-icon>
            <span>Commits — {{ expandedTaskName }}</span>
            <button class="close-btn" (click)="expandedTaskId = null">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="commits-panel-body">
            @if (commitsLoading) {
              <span class="commits-loading"><span class="mini-spinner"></span> טוען...</span>
            } @else if (!taskCommits.length) {
              <span class="commits-empty"><mat-icon>code_off</mat-icon> אין commits משויכים למשימה זו</span>
            } @else {
              @for (c of taskCommits; track c.hash) {
                <a [href]="c.url" target="_blank" class="commit-chip">
                  <mat-icon>commit</mat-icon>
                  <span class="chip-hash">{{ c.shortHash }}</span>
                  <span class="chip-msg">{{ c.message }}</span>
                  <span class="chip-date">{{ c.date | date:'dd/MM HH:mm' }}</span>
                </a>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    .btn-primary {
      height: 44px; padding: 0 20px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 14px; font-weight: 600; font-family: 'Heebo', sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-primary:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.4); transform: translateY(-1px); }

    .filter-bar { margin-bottom: 16px; display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .filter-field { min-width: 220px; }
    .filter-chips { display: flex; gap: 6px; padding-top: 8px; }
    .chip {
      display: flex; align-items: center; gap: 5px;
      height: 36px; padding: 0 14px; border: 1.5px solid #e5e7eb; border-radius: 20px;
      background: white; color: #6b7280; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .chip:hover { border-color: #4f46e5; color: #4f46e5; }
    .chip.active { border-color: #4f46e5; background: #ede9fe; color: #4f46e5; }

    .table-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(30,27,75,0.07); overflow: hidden; }
    .main-table { width: 100%; }
    .mat-mdc-header-row { background: #f9f8ff; }
    th.mat-mdc-header-cell { font-weight: 700; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6; padding: 14px 16px; }
    td.mat-mdc-cell { padding: 14px 16px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
    .table-row:hover td { background: #fafafe; }
    .table-row:last-child td { border-bottom: none; }

    .task-name { font-weight: 600; color: #1e1b4b; font-size: 14px; }
    .task-desc { color: #9ca3af; font-size: 12px; margin-top: 2px; }
    .muted { color: #9ca3af; }
    .assignee-cell { display: flex; flex-direction: column; gap: 3px; }
    .team-badge {
      display: inline-flex; align-items: center; gap: 3px;
      background: #ede9fe; color: #5b21b6;
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
    }
    .team-badge mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .cu-link {
      display: inline-flex; align-items: center; gap: 4px;
      color: #7b68ee; font-size: 12px; font-weight: 600; text-decoration: none;
    }
    .cu-link:hover { color: #5b21b6; text-decoration: underline; }
    .cu-link mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .badge { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
    .priority-low { background: #d1fae5; color: #065f46; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-urgent { background: #7f1d1d; color: white; }
    .task-todo { background: #f3f4f6; color: #374151; }
    .task-inprogress { background: #dbeafe; color: #1e40af; }
    .task-done { background: #d1fae5; color: #065f46; }
    .task-cancelled { background: #f3f4f6; color: #9ca3af; }

    .empty-state { text-align: center; padding: 64px; color: #9ca3af; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; opacity: 0.4; }
    .empty-state p { margin: 0; font-size: 14px; }

    .project-name { font-weight: 500; color: #1e1b4b; }

    .unassigned-wrap {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .unassigned-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #d1d5db; flex-shrink: 0;
    }
    .unassigned-text { font-size: 13px; color: #9ca3af; }
    .btn-assign {
      display: inline-flex; align-items: center; gap: 2px;
      height: 26px; padding: 0 10px; border-radius: 6px;
      border: 1.5px dashed #c4b5fd; background: transparent;
      color: #7c3aed; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer;
      transition: all 0.15s;
    }
    .btn-assign mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .btn-assign:hover { background: #f5f3ff; border-color: #7c3aed; }

    .assign-panel {
      display: flex; flex-direction: column; gap: 8px;
      background: #f9f8ff; border: 1px solid #ede9fe;
      border-radius: 10px; padding: 10px 12px;
      box-shadow: 0 2px 8px rgba(124,58,237,0.08);
      min-width: 200px;
    }
    .assign-select {
      font-size: 13px; width: 100%;
      background: white; border-radius: 6px;
    }
    .assign-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .btn-confirm {
      height: 28px; padding: 0 14px; border: none; border-radius: 6px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: opacity 0.15s;
    }
    .btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-confirm:not(:disabled):hover { opacity: 0.88; }
    .btn-cancel {
      height: 28px; padding: 0 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: white; color: #6b7280; font-size: 12px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .btn-cancel:hover { border-color: #9ca3af; color: #374151; }

    .commits-toggle {
      width: 30px; height: 30px; border: 1px solid #e5e7eb; border-radius: 8px;
      background: white; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #9ca3af; transition: all 0.15s;
    }
    .commits-toggle mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .commits-toggle:hover, .commits-toggle.active { background: #ede9fe; border-color: #818cf8; color: #4f46e5; }
    .commit-count-badge {
      font-size: 11px; font-weight: 700; background: #4f46e5; color: white;
      border-radius: 8px; padding: 0 5px; line-height: 16px;
    }

    .commits-panel {
      margin-top: 16px; background: white; border-radius: 16px;
      border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(30,27,75,0.05);
      overflow: hidden;
    }
    .commits-panel-header {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 20px; background: #fafafe; border-bottom: 1px solid #f3f4f6;
      font-size: 14px; font-weight: 700; color: #1e1b4b;
    }
    .commits-panel-header mat-icon { color: #4f46e5; font-size: 18px; width: 18px; height: 18px; }
    .commits-panel-header span { flex: 1; }
    .close-btn {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center; color: #9ca3af;
      transition: all 0.15s;
    }
    .close-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .close-btn:hover { background: #fee2e2; color: #ef4444; }
    .commits-panel-body {
      display: flex; flex-wrap: wrap; gap: 8px; padding: 16px 20px;
    }
    .commits-loading, .commits-empty {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #9ca3af;
    }
    .commits-empty mat-icon { font-size: 15px; width: 15px; height: 15px; opacity: 0.5; }
    .mini-spinner {
      width: 14px; height: 14px; border: 2px solid #e5e7eb;
      border-top-color: #4f46e5; border-radius: 50%;
      display: inline-block; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .commit-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: white; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 6px 12px; text-decoration: none; transition: all 0.15s;
      max-width: 420px;
    }
    .commit-chip:hover { border-color: #818cf8; background: #f5f3ff; }
    .commit-chip mat-icon { font-size: 14px; width: 14px; height: 14px; color: #4f46e5; flex-shrink: 0; }
    .chip-hash {
      font-family: monospace; font-size: 11px; font-weight: 700;
      color: #1e1b4b; background: #ede9fe; padding: 1px 5px;
      border-radius: 4px; flex-shrink: 0;
    }
    .chip-msg {
      font-size: 12px; color: #374151; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .chip-date { font-size: 11px; color: #9ca3af; flex-shrink: 0; }
  `]
})
export class TasksComponent implements OnInit {
  @ViewChild('commitsPanel') commitsPanelRef?: ElementRef;
  dataSource = new MatTableDataSource<Task>([]);
  projects: Project[] = [];
  selectedProjectId: number | null = null;
  filterMode: 'team' | 'mine' | 'unassigned' = 'team';
  private allTasks: Task[] = [];
  displayedColumns = ['name', 'project', 'assignee', 'priority', 'status', 'hours', 'clickup', 'commits', 'actions'];
  assigningProjectTaskId: number | null = null;
  assigningTeamTaskId: number | null = null;
  assigningProjectValue: number | null = null;
  assigningTeamProjectValue: number | null = null;
  expandedTaskId: number | null = null;
  expandedTaskName = '';
  taskCommits: GitCommit[] = [];
  commitsLoading = false;
  commitCounts: Record<number, number> = {};

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    public auth: AuthService,
    private gitService: GitService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.projectService.getAll().subscribe(p => this.projects = p);
    this.load();
    this.gitService.getTaskCommitCounts().subscribe(c => this.commitCounts = c);
  }

  load() {
    this.taskService.getAll(this.selectedProjectId ?? undefined).subscribe({
      next: t => { this.allTasks = t; this.applyFilter(); },
      error: () => this.snackBar.open('שגיאה בטעינת המשימות', 'סגור', { duration: 3000 })
    });
  }

  applyFilter() {
    const userId = this.auth.currentUser()?.userId;
    if (this.filterMode === 'mine') {
      this.dataSource.data = this.allTasks.filter(t => t.assignedUserId === userId);
    } else if (this.filterMode === 'team') {
      this.dataSource.data = this.allTasks.filter(t => t.assignedTeamId != null);
    } else if (this.filterMode === 'unassigned') {
      this.dataSource.data = this.allTasks.filter(t => t.assignedTeamId == null);
    }
  }

  openForm(task?: Task) {
    const ref = this.dialog.open(TaskFormComponent, { width: '500px', data: { task, projects: this.projects } });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  delete(task: Task) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'מחיקת משימה', message: `למחוק את המשימה "${task.taskName}"?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.taskService.delete(task.taskId).subscribe({
        next: () => { this.load(); this.snackBar.open('המשימה נמחקה', 'סגור', { duration: 2000 }); },
        error: () => this.snackBar.open('מחיקה נכשלה', 'סגור', { duration: 3000 })
      });
    });
  }

  startAssignProject(task: Task) {
    this.assigningProjectTaskId = task.taskId;
    this.assigningProjectValue = null;
  }

  cancelAssignProject() {
    this.assigningProjectTaskId = null;
    this.assigningProjectValue = null;
  }

  confirmAssignProject(task: Task) {
    if (!this.assigningProjectValue) return;
    this.taskService.update(task.taskId, { projectId: this.assigningProjectValue }).subscribe({
      next: () => {
        this.cancelAssignProject();
        this.load();
        this.snackBar.open('המשימה שויכה לפרויקט', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('שגיאה בשיוך הפרויקט', 'סגור', { duration: 3000 })
    });
  }

  startAssignToTeam(task: Task) {
    this.assigningTeamTaskId = task.taskId;
    this.assigningTeamProjectValue = null;
  }

  cancelAssignToTeam() {
    this.assigningTeamTaskId = null;
    this.assigningTeamProjectValue = null;
  }

  confirmAssignToTeam(task: Task) {
    if (!this.assigningTeamProjectValue) return;
    const teamId = this.auth.currentUser()?.teamId;
    if (!teamId) return;
    this.taskService.update(task.taskId, { assignedTeamId: teamId, projectId: this.assigningTeamProjectValue }).subscribe({
      next: () => {
        this.cancelAssignToTeam();
        this.load();
        this.snackBar.open('המשימה שויכה לצוות', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('שגיאה בשיוך לצוות', 'סגור', { duration: 3000 })
    });
  }

  toggleCommits(task: Task) {
    if (this.expandedTaskId === task.taskId) {
      this.expandedTaskId = null;
      this.cdr.detectChanges();
      return;
    }
    this.expandedTaskId = task.taskId;
    this.expandedTaskName = task.taskName;
    this.taskCommits = [];
    this.commitsLoading = true;
    this.cdr.detectChanges();
    this.gitService.getCommitsByTask(task.taskId).subscribe({
      next: c => {
        Promise.resolve().then(() => {
          this.taskCommits = c;
          this.commitsLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.commitsPanelRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        });
      },
      error: () => {
        Promise.resolve().then(() => { this.commitsLoading = false; this.cdr.detectChanges(); });
      }
    });
  }

  priorityLabel(p: string): string {
    const m: any = { Low: 'נמוכה', Medium: 'בינונית', High: 'גבוהה', Urgent: 'דחוף' };
    return m[p] ?? p;
  }

  taskStatusLabel(s: string): string {
    const m: any = { Todo: 'לביצוע', InProgress: 'בתהליך', Done: 'הושלם', Cancelled: 'בוטל' };
    return m[s] ?? s;
  }

  toHHMM(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
