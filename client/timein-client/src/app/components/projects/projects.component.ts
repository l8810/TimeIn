import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Project, Task } from '../../models/models';
import { ProjectFormComponent } from './project-form.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule,
    MatExpansionModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>פרויקטים</h1>
          <p class="header-sub">{{ filteredProjects.length }} פרויקטים</p>
        </div>
        <div class="header-actions">
          @if (auth.hasRole('Employee')) {
            <div class="filter-chips">
              <button class="chip" [class.active]="!myProjectsOnly" (click)="myProjectsOnly = false">
                <mat-icon>group</mat-icon> כל הצוות
              </button>
              <button class="chip" [class.active]="myProjectsOnly" (click)="myProjectsOnly = true">
                <mat-icon>person</mat-icon> שלי
              </button>
            </div>
          }
          @if (auth.hasRole('Manager', 'Admin')) {
            <button class="btn-primary" (click)="openForm()">
              <mat-icon>add</mat-icon> פרויקט חדש
            </button>
          }
        </div>
      </div>

      @if (!dataSource.data.length) {
        <div class="empty-state">
          <mat-icon>folder_open</mat-icon>
          <p>{{ auth.hasRole('Employee') ? 'לא הוקצית לאף פרויקט עדיין' : 'לא נמצאו פרויקטים' }}</p>
        </div>
      }

      <!-- ════════ EMPLOYEE VIEW — accordion ════════ -->
      @if (auth.hasRole('Employee') && dataSource.data.length) {
        <mat-accordion multi class="projects-accordion">
          @for (p of filteredProjects; track p.projectId) {
            <mat-expansion-panel class="project-panel"
              (opened)="onPanelOpen(p.projectId)">
              <mat-expansion-panel-header>
                <mat-panel-title class="panel-title">
                  <mat-icon class="proj-folder">folder_open</mat-icon>
                  <span class="proj-name">{{ p.projectName }}</span>
                  <span class="badge" [class]="'badge-' + p.status.toLowerCase()">{{ statusLabel(p.status) }}</span>
                </mat-panel-title>
                <mat-panel-description class="panel-desc">
                  @if (getProjectData(p.projectId); as pd) {
                    <span class="pill pill-mine">
                      <mat-icon>person</mat-icon>{{ pd.mine.length }} שלי
                    </span>
                    @if (pd.backlog.length) {
                      <span class="pill pill-backlog">
                        <mat-icon>inbox</mat-icon>{{ pd.backlog.length }} בלוג
                      </span>
                    }
                    @if (pd.team.length) {
                      <span class="pill pill-team">
                        <mat-icon>group</mat-icon>{{ pd.team.length }} צוות
                      </span>
                    }
                  } @else if (loadingTasks[p.projectId]) {
                    <mat-spinner diameter="16"></mat-spinner>
                  }
                </mat-panel-description>
              </mat-expansion-panel-header>

              @if (loadingTasks[p.projectId]) {
                <div class="panel-loading">
                  <mat-spinner diameter="24"></mat-spinner>
                  <span>טוען משימות...</span>
                </div>
              } @else if (getProjectData(p.projectId); as pd) {
                <div class="tasks-container">

                  @if (!pd.mine.length && !pd.backlog.length) {
                    <div class="no-tasks">אין משימות פעילות בפרויקט זה</div>
                  }

                  @if (pd.mine.length) {
                    <div class="task-group">
                      <div class="group-header mine-header">
                        <mat-icon>person</mat-icon>
                        <span>המשימות שלי</span>
                      </div>
                      @for (t of pd.mine; track t.taskId) {
                        <div class="task-item">
                          <div class="task-left">
                            <span class="prio-dot" [class]="'dot-' + t.priority.toLowerCase()"></span>
                            <span class="task-name-text">{{ t.taskName }}</span>
                            @if (t.description) {
                              <span class="task-desc-sm">{{ t.description }}</span>
                            }
                          </div>
                          <div class="task-right">
                            <span class="badge task-{{ t.status.toLowerCase() }}">{{ taskStatusLabel(t.status) }}</span>
                            @if (t.estimatedHours) {
                              <span class="hours-chip">{{ t.estimatedHours }}ש'</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }

                  @if (pd.backlog.length) {
                    <div class="task-group">
                      <div class="group-header backlog-header">
                        <mat-icon>inbox</mat-icon>
                        <span>בלוג — פנוי לתפיסה</span>
                      </div>
                      @for (t of pd.backlog; track t.taskId) {
                        <div class="task-item backlog-item">
                          <div class="task-left">
                            <span class="prio-dot" [class]="'dot-' + t.priority.toLowerCase()"></span>
                            <span class="task-name-text">{{ t.taskName }}</span>
                          </div>
                          <div class="task-right">
                            <span class="badge task-{{ t.status.toLowerCase() }}">{{ taskStatusLabel(t.status) }}</span>
                            <button mat-stroked-button class="take-btn"
                              (click)="takeTask(t, p.projectId); $event.stopPropagation()">
                              <mat-icon>person_add</mat-icon> קח משימה
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }

                  @if (pd.team.length) {
                    <div class="task-group">
                      <div class="group-header team-header">
                        <mat-icon>group</mat-icon>
                        <span>משימות חברי הצוות</span>
                      </div>
                      @for (t of pd.team; track t.taskId) {
                        <div class="task-item team-item">
                          <div class="task-left">
                            <span class="prio-dot" [class]="'dot-' + t.priority.toLowerCase()"></span>
                            <span class="task-name-text">{{ t.taskName }}</span>
                            @if (t.assignedUserName) {
                              <span class="task-desc-sm">{{ t.assignedUserName }}</span>
                            }
                          </div>
                          <div class="task-right">
                            <span class="badge task-{{ t.status.toLowerCase() }}">{{ taskStatusLabel(t.status) }}</span>
                            @if (t.estimatedHours) {
                              <span class="hours-chip">{{ t.estimatedHours }}ש'</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }

                </div>
              }
            </mat-expansion-panel>
          }
        </mat-accordion>
      }

      <!-- ════════ MANAGER / ADMIN VIEW — table ════════ -->
      @if (auth.hasRole('Manager', 'Admin') && dataSource.data.length) {
        <div class="table-card">
          <table mat-table [dataSource]="dataSource" class="main-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>שם פרויקט</th>
              <td mat-cell *matCellDef="let p">
                <div class="project-name">{{ p.projectName }}</div>
                @if (p.description) { <div class="project-desc">{{ p.description }}</div> }
              </td>
            </ng-container>
            <ng-container matColumnDef="manager">
              <th mat-header-cell *matHeaderCellDef>מנהל</th>
              <td mat-cell *matCellDef="let p">{{ p.managerName || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="team">
              <th mat-header-cell *matHeaderCellDef>צוות</th>
              <td mat-cell *matCellDef="let p">{{ p.teamName || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>סטטוס</th>
              <td mat-cell *matCellDef="let p">
                <span class="badge" [class]="'badge-' + p.status?.toLowerCase()">{{ statusLabel(p.status) }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="members">
              <th mat-header-cell *matHeaderCellDef>חברים</th>
              <td mat-cell *matCellDef="let p">
                <span class="count-chip">{{ p.memberCount ?? 0 }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="tasks">
              <th mat-header-cell *matHeaderCellDef>משימות</th>
              <td mat-cell *matCellDef="let p">
                <span class="count-chip">{{ p.totalTasks ?? 0 }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="hours">
              <th mat-header-cell *matHeaderCellDef>שעות</th>
              <td mat-cell *matCellDef="let p">
                <strong>{{ p.totalHours?.toFixed(1) ?? '0.0' }}ש'</strong>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                @if (p.externalClickUpListId) {
                  <button mat-icon-button class="cu-sync-btn"
                    [disabled]="syncingId === p.projectId"
                    (click)="syncClickUp(p)" matTooltip="סנכרן משימות מ-ClickUp">
                    @if (syncingId === p.projectId) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <mat-icon>sync</mat-icon>
                    }
                  </button>
                }
                <button mat-icon-button (click)="openForm(p)" matTooltip="עריכה + חברים">
                  <mat-icon>edit</mat-icon>
                </button>
                @if (auth.hasRole('Admin')) {
                  <button mat-icon-button color="warn" (click)="delete(p)" matTooltip="מחיקה">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #1e1b4b; }
    .header-sub { margin: 0; color: #6b7280; font-size: 14px; }

    .btn-primary {
      height: 44px; padding: 0 20px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; font-size: 14px; font-weight: 600; font-family: 'Heebo', sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .btn-primary:hover { box-shadow: 0 4px 16px rgba(79,70,229,.4); transform: translateY(-1px); }

    .header-actions { display: flex; align-items: center; gap: 12px; }
    .filter-chips { display: flex; gap: 6px; }
    .chip {
      display: flex; align-items: center; gap: 5px;
      height: 36px; padding: 0 14px; border: 1.5px solid #e5e7eb; border-radius: 20px;
      background: white; color: #6b7280; font-size: 13px; font-weight: 600;
      font-family: 'Heebo', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .chip:hover { border-color: #4f46e5; color: #4f46e5; }
    .chip.active { border-color: #4f46e5; background: #ede9fe; color: #4f46e5; }

    /* ── Accordion (employee) ── */
    .projects-accordion { display: flex; flex-direction: column; gap: 10px; }
    .project-panel { border-radius: 14px !important; box-shadow: 0 2px 10px rgba(30,27,75,.07) !important; }

    .panel-title { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .proj-folder { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; }
    .proj-name { font-size: 15px; color: #1e1b4b; }

    .panel-desc { display: flex; align-items: center; gap: 8px; }
    .pill { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
            padding: 3px 10px; border-radius: 20px; }
    .pill mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .pill-mine { background: #ede9fe; color: #5b21b6; }
    .pill-backlog { background: #fef3c7; color: #92400e; }
    .pill-team { background: #dbeafe; color: #1e40af; }

    .panel-loading { display: flex; align-items: center; gap: 10px; padding: 16px;
                     color: #6b7280; font-size: 14px; }

    /* ── Task groups ── */
    .tasks-container { padding: 4px 0 8px; }
    .no-tasks { text-align: center; padding: 24px; color: #9ca3af; font-size: 14px; }

    .task-group { margin-bottom: 16px; }
    .group-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700;
                    padding: 8px 4px; margin-bottom: 4px; }
    .group-header mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .mine-header { color: #4f46e5; }
    .backlog-header { color: #92400e; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 8px; }
    .team-header { color: #1e40af; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 8px; }

    .task-item { display: flex; align-items: center; justify-content: space-between;
                 padding: 10px 8px; border-radius: 8px; transition: background .15s; }
    .task-item:hover { background: #f9f8ff; }
    .backlog-item { background: #fffbeb; }
    .backlog-item:hover { background: #fef9c3; }
    .team-item { background: #eff6ff; }
    .team-item:hover { background: #dbeafe; }

    .task-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .task-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .prio-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-low { background: #22c55e; }
    .dot-medium { background: #f59e0b; }
    .dot-high { background: #ef4444; }
    .dot-urgent { background: #7f1d1d; }

    .task-name-text { font-size: 14px; font-weight: 500; color: #1e1b4b; }
    .task-desc-sm { font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

    .hours-chip { font-size: 11px; color: #6b7280; background: #f3f4f6;
                  padding: 2px 8px; border-radius: 12px; }

    .take-btn { font-size: 12px !important; height: 32px !important; border-color: #4f46e5 !important;
                color: #4f46e5 !important; font-weight: 600 !important; }
    .take-btn mat-icon { font-size: 16px; width: 16px; height: 16px; margin-left: 4px; }

    /* ── Table (manager) ── */
    .table-card { background: white; border-radius: 16px;
                  box-shadow: 0 2px 12px rgba(30,27,75,.07); overflow: hidden; }
    .main-table { width: 100%; }
    .mat-mdc-header-row { background: #f9f8ff; }
    th.mat-mdc-header-cell { font-weight: 700; font-size: 13px; color: #6b7280;
                              border-bottom: 1px solid #f3f4f6; padding: 14px 16px; }
    td.mat-mdc-cell { padding: 14px 16px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
    .table-row:hover td { background: #fafafe; }
    .table-row:last-child td { border-bottom: none; }

    .project-name { font-weight: 600; color: #1e1b4b; font-size: 14px; }
    .project-desc { color: #9ca3af; font-size: 12px; margin-top: 2px;
                    max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Shared badges ── */
    .badge { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-paused { background: #fef3c7; color: #92400e; }
    .badge-completed { background: #dbeafe; color: #1e40af; }
    .badge-archived { background: #f3f4f6; color: #6b7280; }
    .task-todo { background: #f3f4f6; color: #374151; }
    .task-inprogress { background: #dbeafe; color: #1e40af; }
    .task-done { background: #d1fae5; color: #065f46; }
    .task-cancelled { background: #f3f4f6; color: #9ca3af; }

    .count-chip { background: #ede9fe; color: #5b21b6; font-weight: 700;
                  font-size: 13px; padding: 3px 10px; border-radius: 20px; }

    .empty-state { text-align: center; padding: 80px; color: #9ca3af; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px;
                             display: block; margin: 0 auto 12px; opacity: .4; }
    .empty-state p { margin: 0; font-size: 14px; }
    .cu-sync-btn { color: #7b68ee !important; }
    .cu-sync-btn:hover:not([disabled]) { background: #ede9fe; }
  `]
})
export class ProjectsComponent implements OnInit {
  dataSource = new MatTableDataSource<Project>([]);
  displayedColumns = ['name', 'manager', 'team', 'status', 'members', 'tasks', 'hours', 'actions'];
  myProjectsOnly = false;
  syncingId: number | null = null;

  projectTaskData = new Map<number, { mine: Task[], backlog: Task[], team: Task[] }>();
  loadingTasks: Record<number, boolean> = {};

  constructor(
    private projectService: ProjectService,
    private taskService: TaskService,
    public auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  get filteredProjects(): Project[] {
    return this.myProjectsOnly
      ? this.dataSource.data.filter(p => p.isCurrentUserMember)
      : this.dataSource.data;
  }

  ngOnInit() { this.load(); }

  load() {
    this.projectService.getAll().subscribe({
      next: p => { this.dataSource.data = p; this.cdr.detectChanges(); },
      error: () => this.snackBar.open('שגיאה בטעינת הפרויקטים', 'סגור', { duration: 3000 })
    });
  }

  onPanelOpen(projectId: number) {
    if (this.projectTaskData.has(projectId) || this.loadingTasks[projectId]) return;
    this.loadingTasks[projectId] = true;
    this.projectService.getProjectTasks(projectId).subscribe({
      next: tasks => {
        const userId = this.auth.currentUser()!.userId;
        this.projectTaskData.set(projectId, {
          mine: tasks.filter(t => t.assignedUserId === userId),
          backlog: tasks.filter(t => !t.assignedUserId),
          team: tasks.filter(t => t.assignedUserId && t.assignedUserId !== userId)
        });
        this.loadingTasks[projectId] = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTasks[projectId] = false; this.cdr.detectChanges(); }
    });
  }

  getProjectData(projectId: number) {
    return this.projectTaskData.get(projectId) ?? null;
  }

  syncClickUp(project: Project) {
    this.syncingId = project.projectId;
    this.projectService.syncClickUp(project.projectId).subscribe({
      next: (res) => {
        this.syncingId = null;
        const msg = `סנכרון הושלם — ${res.created} נוצרו, ${res.updated} עודכנו`;
        this.snackBar.open(msg, 'סגור', { duration: 4000 });
      },
      error: (err) => {
        this.syncingId = null;
        const msg = err.error?.message || 'סנכרון נכשל';
        this.snackBar.open(msg, 'סגור', { duration: 4000 });
      }
    });
  }

  takeTask(task: Task, projectId: number) {
    this.taskService.takeTask(task.taskId).subscribe({
      next: updated => {
        const data = this.projectTaskData.get(projectId);
        if (data) {
          data.backlog = data.backlog.filter(t => t.taskId !== task.taskId);
          data.mine = [...data.mine, updated];
          this.projectTaskData.set(projectId, { ...data });
        }
        this.snackBar.open('המשימה הוקצתה לך בהצלחה', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('הפעולה נכשלה', 'סגור', { duration: 3000 })
    });
  }

  openForm(project?: Project) {
    const ref = this.dialog.open(ProjectFormComponent, { width: '560px', data: { project } });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  delete(project: Project) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'מחיקת פרויקט', message: `למחוק את הפרויקט "${project.projectName}"?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.projectService.delete(project.projectId).subscribe({
        next: () => { this.load(); this.snackBar.open('הפרויקט נמחק', 'סגור', { duration: 2000 }); },
        error: () => this.snackBar.open('מחיקה נכשלה', 'סגור', { duration: 3000 })
      });
    });
  }

  statusLabel(status: string): string {
    const m: any = { Active: 'פעיל', Paused: 'מושהה', Completed: 'הושלם', Archived: 'ארכיון' };
    return m[status] ?? status;
  }

  taskStatusLabel(s: string): string {
    const m: any = { Todo: 'לביצוע', InProgress: 'בתהליך', Done: 'הושלם', Cancelled: 'בוטל' };
    return m[s] ?? s;
  }

  priorityLabel(p: string): string {
    const m: any = { Low: 'נמוכה', Medium: 'בינונית', High: 'גבוהה', Urgent: 'דחוף' };
    return m[p] ?? p;
  }
}
