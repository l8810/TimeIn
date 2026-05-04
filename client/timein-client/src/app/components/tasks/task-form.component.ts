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
import { TaskService } from '../../services/task.service';
import { TeamService } from '../../services/team.service';
import { Task, Project, Team } from '../../models/models';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>{{ data.task ? 'עריכת משימה' : 'משימה חדשה' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>שם משימה *</mat-label>
        <input matInput [(ngModel)]="model.taskName" required />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>פרויקט (אופציונלי)</mat-label>
        <mat-select [(ngModel)]="model.projectId">
          <mat-option [value]="null">ללא שיוך לפרויקט</mat-option>
          @for (p of data.projects; track p.projectId) {
            <mat-option [value]="p.projectId">{{ p.projectName }}</mat-option>
          }
        </mat-select>
        <mat-hint>ניתן לשייך לפרויקט בשלב מאוחר יותר</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>תיאור</mat-label>
        <textarea matInput [(ngModel)]="model.description" rows="3"></textarea>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>שיוך לצוות (אופציונלי)</mat-label>
        <mat-select [(ngModel)]="model.assignedTeamId" name="assignedTeamId">
          <mat-option [value]="null">ללא שיוך לצוות</mat-option>
          @for (t of teams; track t.teamId) {
            <mat-option [value]="t.teamId">{{ t.teamName }}</mat-option>
          }
        </mat-select>
        <mat-hint>הצוות האחראי לביצוע המשימה</mat-hint>
      </mat-form-field>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>עדיפות</mat-label>
          <mat-select [(ngModel)]="model.priority">
            <mat-option value="Low">נמוכה</mat-option>
            <mat-option value="Medium">בינונית</mat-option>
            <mat-option value="High">גבוהה</mat-option>
            <mat-option value="Urgent">דחוף</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>סטטוס</mat-label>
          <mat-select [(ngModel)]="model.status">
            <mat-option value="Todo">לביצוע</mat-option>
            <mat-option value="InProgress">בתהליך</mat-option>
            <mat-option value="Done">הושלם</mat-option>
            <mat-option value="Cancelled">בוטל</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>שעות מוערכות</mat-label>
        <input matInput type="number" [(ngModel)]="model.estimatedHours" min="0" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>מזהה משימה ב-ClickUp (אופציונלי)</mat-label>
        <input matInput [(ngModel)]="model.clickUpTaskId"/>
        <mat-hint>מופיע ב-URL של ClickUp: app.clickup.com/t/<strong>86exee1pv</strong></mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>ביטול</button>
      <button mat-raised-button color="primary"
        [disabled]="saving || !model.taskName" (click)="save()">
        {{ saving ? 'שומר...' : 'שמור' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 420px; padding-top: 8px; }
    .full-width { width: 100%; }
    .row-2 { display: flex; gap: 16px; }
    .row-2 mat-form-field { flex: 1; }
  `]
})
export class TaskFormComponent implements OnInit {
  model: any = { priority: 'Medium', status: 'Todo' };
  saving = false;
  teams: Team[] = [];

  constructor(
    public dialogRef: MatDialogRef<TaskFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task?: Task; projects: Project[] },
    private taskService: TaskService,
    private teamService: TeamService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.teamService.getAll().subscribe(t => this.teams = t);
    if (this.data.task) this.model = { ...this.data.task };
  }

  save() {
    if (!this.model.taskName) return;
    this.saving = true;
    const obs = this.data.task
      ? this.taskService.update(this.data.task.taskId, this.model)
      : this.taskService.create(this.model);
    obs.subscribe({
      next: () => { this.dialogRef.close(true); this.snackBar.open('נשמר בהצלחה', 'סגור', { duration: 2000 }); },
      error: () => { this.saving = false; this.snackBar.open('שמירה נכשלה', 'סגור', { duration: 3000 }); }
    });
  }
}
