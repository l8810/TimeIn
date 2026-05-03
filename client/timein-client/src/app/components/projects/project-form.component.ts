import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectService } from '../../services/project.service';
import { TeamService } from '../../services/team.service';
import { Project, ProjectMember, Team, User } from '../../models/models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatDividerModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title>{{ data.project ? 'עריכת פרויקט' : 'פרויקט חדש' }}</h2>

    <mat-dialog-content>
      <!-- ── פרטי פרויקט ── -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>שם פרויקט *</mat-label>
        <input matInput [(ngModel)]="model.projectName" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>תיאור</mat-label>
        <textarea matInput [(ngModel)]="model.description" rows="2"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>צוות *</mat-label>
        <mat-select [(ngModel)]="model.teamId" required>
          @for (t of teams; track t.teamId) {
            <mat-option [value]="t.teamId">{{ t.teamName }}</mat-option>
          }
        </mat-select>
        @if (!model.teamId) {
          <mat-hint style="color:#ef4444">יש לבחור צוות</mat-hint>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>סטטוס</mat-label>
        <mat-select [(ngModel)]="model.status">
          <mat-option value="Active">פעיל</mat-option>
          <mat-option value="Paused">מושהה</mat-option>
          <mat-option value="Completed">הושלם</mat-option>
          <mat-option value="Archived">ארכיון</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>כתובת Git</mat-label>
        <input matInput [(ngModel)]="model.gitRepositoryUrl" />
      </mat-form-field>

      <mat-divider class="divider"></mat-divider>

      <div class="section-title">
        <mat-icon style="color:#7b68ee">link</mat-icon>
        <span>ClickUp</span>
      </div>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>ClickUp List ID (אופציונלי)</mat-label>
        <input matInput [(ngModel)]="model.externalClickUpListId" placeholder="לדוגמה: 901817777288" />
        <mat-hint>מופיע ב-URL של הרשימה ב-ClickUp: app.clickup.com/...<strong>/list/901817777288</strong></mat-hint>
      </mat-form-field>

      <!-- ── ניהול חברים (רק בעריכה) ── -->
      @if (data.project) {
        <mat-divider class="divider"></mat-divider>

        <div class="members-section">
          <div class="members-title">
            <mat-icon>group</mat-icon>
            <span>חברי צוות</span>
          </div>

          <!-- רשימת חברים קיימים -->
          <div class="members-list">
            @for (m of members; track m.userId) {
              <div class="member-chip">
                <div class="member-avatar">{{ initials(m.fullName) }}</div>
                <div class="member-info">
                  <span class="member-name">{{ m.fullName }}</span>
                  <span class="member-role">{{ roleLabel(m.role) }}</span>
                </div>
                <button mat-icon-button class="remove-btn" (click)="removeMember(m)"
                  matTooltip="הסר מהפרויקט">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
            @if (!members.length) {
              <p class="no-members">אין חברי צוות עדיין</p>
            }
          </div>

          <!-- הוספת חבר -->
          <div class="add-member-row">
            <mat-form-field appearance="outline" class="member-select">
              <mat-label>הוסף חבר לצוות</mat-label>
              <mat-select [(ngModel)]="selectedUserId">
                @for (u of availableUsers; track u.userId) {
                  <mat-option [value]="u.userId">{{ u.fullName }} ({{ roleLabel(u.role) }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="!selectedUserId || addingMember"
              (click)="addMember()">
              <mat-icon>person_add</mat-icon>
              {{ addingMember ? 'מוסיף...' : 'הוסף' }}
            </button>
          </div>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      <button mat-raised-button color="primary" [disabled]="saving || !model.projectName || !model.teamId" (click)="save()">
        {{ saving ? 'שומר...' : 'שמור' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 480px; padding-top: 8px; }
    .full-width { width: 100%; }
    .divider { margin: 8px 0 16px; }

    .section-title { display: flex; align-items: center; gap: 8px; font-size: 14px;
                     font-weight: 700; color: #1e1b4b; margin-bottom: 8px; }
    .members-section { }
    .members-title { display: flex; align-items: center; gap: 8px; font-size: 15px;
                     font-weight: 700; color: #1e1b4b; margin-bottom: 12px; }
    .members-title mat-icon { color: #4f46e5; }

    .members-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .member-chip { display: flex; align-items: center; gap: 10px; padding: 8px 12px;
                   background: #f9f8ff; border-radius: 10px; }
    .member-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
                     background: linear-gradient(135deg, #4f46e5, #7c3aed);
                     color: white; font-weight: 700; font-size: 12px;
                     display: flex; align-items: center; justify-content: center; }
    .member-info { flex: 1; }
    .member-name { display: block; font-size: 13px; font-weight: 600; color: #1e1b4b; }
    .member-role { font-size: 11px; color: #6b7280; }
    .remove-btn { color: #9ca3af !important; width: 28px; height: 28px; line-height: 28px; }
    .remove-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .no-members { color: #9ca3af; font-size: 13px; margin: 0; padding: 8px 0; }

    .add-member-row { display: flex; align-items: flex-start; gap: 8px; }
    .member-select { flex: 1; }
    .add-member-row button { margin-top: 4px; height: 56px; }
  `]
})
export class ProjectFormComponent implements OnInit {
  model: any = { status: 'Active' };
  saving = false;
  teams: Team[] = [];

  members: ProjectMember[] = [];
  allUsers: User[] = [];
  selectedUserId: number | null = null;
  addingMember = false;

  get availableUsers(): User[] {
    const memberIds = new Set(this.members.map(m => m.userId));
    return this.allUsers.filter(u => !memberIds.has(u.userId));
  }

  constructor(
    public dialogRef: MatDialogRef<ProjectFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project?: Project },
    private projectService: ProjectService,
    private teamService: TeamService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.teamService.getAll().subscribe(t => this.teams = t);
    if (this.data.project) {
      this.model = { ...this.data.project };
      this.loadMembers();
      this.loadAllUsers();
    }
  }

  loadMembers() {
    this.projectService.getMembers(this.data.project!.projectId).subscribe(m => this.members = m);
  }

  loadAllUsers() {
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe(u => this.allUsers = u);
  }

  addMember() {
    if (!this.selectedUserId) return;
    this.addingMember = true;
    this.projectService.addMember(this.data.project!.projectId, this.selectedUserId).subscribe({
      next: () => {
        this.addingMember = false;
        this.selectedUserId = null;
        this.loadMembers();
        this.snackBar.open('החבר נוסף', 'סגור', { duration: 2000 });
      },
      error: () => { this.addingMember = false; this.snackBar.open('הוספה נכשלה', 'סגור', { duration: 3000 }); }
    });
  }

  removeMember(member: ProjectMember) {
    this.projectService.removeMember(this.data.project!.projectId, member.userId).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.userId !== member.userId);
        this.snackBar.open('החבר הוסר', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('הסרה נכשלה', 'סגור', { duration: 3000 })
    });
  }

  save() {
    if (!this.model.projectName) return;
    this.saving = true;
    const obs = this.data.project
      ? this.projectService.update(this.data.project.projectId, this.model)
      : this.projectService.create(this.model);
    obs.subscribe({
      next: () => { this.dialogRef.close(true); this.snackBar.open('נשמר בהצלחה', 'סגור', { duration: 2000 }); },
      error: () => { this.saving = false; this.snackBar.open('שמירה נכשלה', 'סגור', { duration: 3000 }); }
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  roleLabel(role: string): string {
    const m: any = { Employee: 'עובד', Manager: 'מנהל', Admin: 'אדמין' };
    return m[role] ?? role;
  }
}
